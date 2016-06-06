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

#include "mongo/db/namespace_string.h"
#include "mongo/platform/bits.h"
#include "mongo/util/log.h"
#include "mongo/util/net/message.h"

namespace mongo {

// Computes the log base 2 of value, and checks for cases of split buckets.
int OperationLatencyHistogram::getBucket(uint64_t value) {
    // Zero is a special case since log(0) is undefined.
    if (value == 0) {
        return 0;
    }

    uint log2 = 63 - countLeadingZeros64(value);

    // Half splits occur in range [2^11, 2^21) giving 10 extra buckets.
    if (log2 < 11) {
        return log2;
    } else if (log2 < 21) {
        uint extra = log2 - 11;
        // Split value boundary is at (2^n + 2^(n+1))/2 = 2^n + 2^(n-1).
        uint splitBoundary = 0b11 << (log2 - 1);
        if (value >= splitBoundary) {
            extra++;
        }
        return log2 + extra;
    } else if (log2 < OperationLatencyHistogram::kMaxBuckets) {
        return log2 + 10;
    } else {
        return OperationLatencyHistogram::kMaxBuckets - 1;
    }
}

void OperationLatencyHistogram::incrementBucket(int bucket, LogicalOp op) {
    log() << "Histogram increment on op: " << logicalOpToString(op);
    switch (op) {
        case LogicalOp::opMsg:
        case LogicalOp::opQuery:
        case LogicalOp::opGetMore:
            log() << "Incrementing read";
            _readBuckets[bucket]++;
            break;
        case LogicalOp::opUpdate:
        case LogicalOp::opInsert:
        case LogicalOp::opDelete:
            log() << "Incrementing write";
            _writeBuckets[bucket]++;
            break;
        case LogicalOp::opCommand:
            log() << "Incrementing command";
            _commandBuckets[bucket]++;
            break;
        case LogicalOp::opKillCursors:
        case LogicalOp::opInvalid:
            break;
        default:
            MONGO_UNREACHABLE;
    }
    _numEntries++;
}

OperationLatencyHistogram globalHistogramStats;

}  // namespace mongo