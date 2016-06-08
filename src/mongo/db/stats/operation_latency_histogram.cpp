/**
 * Copyright (C) 2016 MongoDB Inc.
 *
 * This program is free software: you can redistribute it and/or  modify
 * it under the terms of the GNU Affero General Public License, version 3,
 * as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * As a special exception, the copyright holders give permission to link the
 * code of portions of this program with the OpenSSL library under certain
 * conditions as described in each individual source file and distribute
 * linked combinations including the program with the OpenSSL library. You
 * must comply with the GNU Affero General Public License in all respects
 * for all of the code used other than as permitted herein. If you modify
 * file(s) with this exception, you may extend this exception to your
 * version of the file(s), but you are not obligated to do so. If you do not
 * wish to do so, delete this exception statement from your version. If you
 * delete this exception statement from all source files in the program,
 * then also delete it in the license file.
 */

#define MONGO_LOG_DEFAULT_COMPONENT ::mongo::logger::LogComponent::kDefault

#include "mongo/platform/basic.h"

#include "mongo/db/stats/operation_latency_histogram.h"

#include <algorithm>
#include <string>

#include "mongo/db/namespace_string.h"
#include "mongo/db/commands/server_status_metric.h"
#include "mongo/platform/bits.h"
#include "mongo/stdx/mutex.h"
#include "mongo/util/log.h"
#include "mongo/util/net/message.h"

namespace mongo {

namespace {
OperationLatencyHistogram globalHistogramStats;
stdx::mutex globalHistogramLock;

// Returns the inclusive lower bound of the bucket.
long long getBucketMicros(int bucket) {
    static uint64_t bucketLowerBounds[] = {
        0, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 3072, 4096, 6144, 8192, 12288,
        16384, 24576, 32768, 49152, 65536, 98304, 131072, 196608, 262144, 393216, 524288,
        786432, 1048576, 1572864, 2097152, 4194304, 8388608, 16777216, 33554432, 67108864,
        134217728, 268435456, 536870912, 1073741824, 2147483648, 4294967296, 8589934592,
        17179869184, 34359738368, 68719476736, 137438953472, 274877906944, 549755813888,
        1099511627776
    };
    return static_cast<long long>(bucketLowerBounds[bucket]);
}

class GlobalHistogramServerStatusMetric : public ServerStatusMetric {
public:
    GlobalHistogramServerStatusMetric() : ServerStatusMetric(".metrics.latency") {}
    virtual void appendAtLeaf(BSONObjBuilder& b) const {
        BSONObjBuilder latencyBuilder;
        stdx::lock_guard<stdx::mutex> guard(globalHistogramLock);
        globalHistogramStats.append(latencyBuilder);
        b.append("latency", latencyBuilder.obj());
    }

} globalHistogramServerStatusMetric;

} // namespace

void OperationLatencyHistogram::_append(const HistogramData& data,
    const std::string& key,
    BSONObjBuilder& builder) {

    BSONObjBuilder histogramBuilder, arrayBuilder;
    for (uint i = 0; i < kMaxBuckets; i++) {
        if (data.buckets[i] == 0) continue;
        BSONObj entry = BSON("micros" << getBucketMicros(i)
            << "count" << static_cast<long long>(data.buckets[i]));
        arrayBuilder.append(std::to_string(i), entry);
    }

    histogramBuilder.appendArray("histogram", arrayBuilder.obj());
    histogramBuilder.append("latency",
        static_cast<long long>(data.sum));
    histogramBuilder.append("ops",
        static_cast<long long>(data.entryCount));
    builder.append(key, histogramBuilder.obj());
}

void OperationLatencyHistogram::append(BSONObjBuilder& builder) {
    _append(_reads, "reads", builder);
    _append(_writes, "writes", builder);
    _append(_commands, "commands", builder);
}

// Computes the log base 2 of value, and checks for cases of split buckets.
int OperationLatencyHistogram::getBucket(uint64_t value) {
    // Zero is a special case since log(0) is undefined.
    if (value == 0) {
        return 0;
    }

    int log2 = 63 - countLeadingZeros64(value);
    // Half splits occur in range [2^11, 2^21) giving 10 extra buckets.
    if (log2 < 11) {
        return log2;
    } else if (log2 < 21) {
        int extra = log2 - 11;
        // Split value boundary is at (2^n + 2^(n+1))/2 = 2^n + 2^(n-1).
        uint64_t splitBoundary = 0b11 << (log2 - 1);
        if (value >= splitBoundary) {
            extra++;
        }
        return log2 + extra;
    } else {
        // Add all of the extra 10 buckets.
        return std::min(log2 + 10, kMaxBuckets - 1);
    }
}

void OperationLatencyHistogram::_incrementData(uint64_t latency, int bucket, HistogramData& data) {
    data.buckets[bucket]++;
    data.entryCount++;
    data.sum += latency;
}

void OperationLatencyHistogram::incrementBucket(uint64_t latency, int bucket, HistogramType op) {
    switch (op) {
        case HistogramType::opRead:
            _incrementData(latency, bucket, _reads);
            break;
        case HistogramType::opWrite:
            _incrementData(latency, bucket, _writes);
            break;
        case HistogramType::opCommand:
            _incrementData(latency, bucket, _commands);
            break;
        default:
            MONGO_UNREACHABLE;
    }
}

void OperationLatencyHistogram::incrementBucket(uint64_t latency, int bucket, LogicalOp logicalOp) {
    switch (logicalOp) {
        case LogicalOp::opQuery:
        case LogicalOp::opGetMore:
            _incrementData(latency, bucket, _reads);
            break;
        case LogicalOp::opUpdate:
        case LogicalOp::opInsert:
        case LogicalOp::opDelete:
            _incrementData(latency, bucket, _writes);
            break;
        case LogicalOp::opCommand:
            _incrementData(latency, bucket, _commands);
            break;
        case LogicalOp::opKillCursors:
        case LogicalOp::opInvalid:
            break;
        default:
            MONGO_UNREACHABLE;
    }
}

void incrementGlobalHistogram(uint64_t latency, HistogramType op) {
    log() << "Incrementing global histogram";
    int bucket = OperationLatencyHistogram::getBucket(latency);
    stdx::lock_guard<stdx::mutex> guard(globalHistogramLock);
    globalHistogramStats.incrementBucket(latency, bucket, op);
}


}  // namespace mongo