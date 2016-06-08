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
#pragma once

#include <array>

#include "mongo/base/counter.h"
#include "mongo/base/string_data.h"
#include "mongo/db/jsobj.h"
#include "mongo/stdx/mutex.h"
#include "mongo/util/net/message.h"
#include "mongo/util/string_map.h"

namespace mongo {

enum class HistogramType {opCommand, opRead, opWrite};

class OperationLatencyHistogram {
public:
    static const int kMaxBuckets = 51;
    static int getBucket(uint64_t latency);

    OperationLatencyHistogram() = default;

    void incrementBucket(uint64_t latency, int bucket, HistogramType op);
    void incrementBucket(uint64_t latency, int bucket, LogicalOp logicalOp);
    void append(BSONObjBuilder& bb);

private:
    typedef struct {
        std::array<uint64_t, kMaxBuckets> buckets;
        uint64_t entryCount;
        uint64_t sum;
    } HistogramData;

    void _append(const HistogramData& data, const std::string& key, BSONObjBuilder& bb);
    void _incrementData(uint64_t latency, int bucket, HistogramData& data);
    HistogramData _reads, _writes, _commands;
};

void incrementGlobalHistogram(uint64_t latency, HistogramType op);
void appendGlobalHistogram(BSONObjBuilder& builder);

}  // namespace mongo