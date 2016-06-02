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

#include "mongo/db/stats/operation_latency_histogram.h"

#include "mongo/db/namespace_string.h"
#include "mongo/util/log.h"
#include "mongo/util/net/message.h"

namespace mongo {

int OperationLatencyHistogram::getBucket(uint64_t value) {
    // Compute the log base 2 on an integer value using bitshifting.
    // For a slightly more complex improvement, consider
    // http://graphics.stanford.edu/~seander/bithacks.html#IntegerLogLookup
    uint64_t log2 = 0;
    int shiftAmount = 32;

    // 0 is special case. Mathematically this isn't defined, but we want bucket 0.
    if (value == 0)
        return 0;

    while (shiftAmount > 0) {
        uint64_t temp = value >> shiftAmount;
        if (temp > 0) {
            log2 += shiftAmount;
            value = temp;
        }
        // Divide shiftAmount by 2.
        shiftAmount = shiftAmount >> 1;
    }

    // TODO: consider the case of half splits. TBD after range is finalized.
    return log2;
}

void OperationLatencyHistogram::incrementBucket(int bucket, LogicalOp op) {
    log() << "Histogram increment on op: " << logicalOpToString(op);
    switch (op) {
        case LogicalOp::opMsg:
        case LogicalOp::opQuery:
        case LogicalOp::opGetMore:
        case LogicalOp::opKillCursors:
            log() << "Incrementing read";
            _readBuckets[bucket].increment();
            break;
        case LogicalOp::opUpdate:
        case LogicalOp::opInsert:
        case LogicalOp::opDelete:
            log() << "Incrementing write";
            _writeBuckets[bucket].increment();
            break;
        case LogicalOp::opCommand:
            log() << "Incrementing command";
            _commandBuckets[bucket].increment();
            break;
        case LogicalOp::opInvalid:
            break;
        default:
            MONGO_UNREACHABLE;
    }
    _numEntries.increment();
}

OperationLatencyHistogram globalHistogramStats;

}  // namespace mongo