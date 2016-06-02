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

#include <iostream>
#include <memory>

#include "mongo/base/counter.h"
#include "mongo/base/string_data.h"
#include "mongo/stdx/mutex.h"
#include "mongo/util/net/message.h"
#include "mongo/util/string_map.h"

namespace mongo {

class OperationLatencyHistogram {
public:
    static const int kMaxBuckets = 64;
    static int getBucket(uint64_t value);

    OperationLatencyHistogram()
        : _readBuckets(kMaxBuckets), _writeBuckets(kMaxBuckets), _commandBuckets(kMaxBuckets) {}

    void incrementBucket(int bucket, LogicalOp op);

private:
    // TODO: if we continue with current single lock implementation the Counter64 can be changed
    // to a uint64_t.
    std::vector<Counter64> _readBuckets;
    std::vector<Counter64> _writeBuckets;
    std::vector<Counter64> _commandBuckets;
    Counter64 _numEntries;
};

extern OperationLatencyHistogram globalHistogramStats;

}  // namespace mongo