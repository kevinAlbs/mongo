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

#include <limits>

#include "mongo/db/jsobj.h"
#include "mongo/unittest/unittest.h"
#include "mongo/util/log.h"
#include "mongo/util/net/message.h"

namespace mongo {

namespace {
int nBuckets = OperationLatencyHistogram::kMaxBuckets;
}  // namespace

TEST(OperationLatencyHistogramTest, BucketComp) {
    for (int i = 0; i < nBuckets; i++) {
        uint64_t boundary = OperationLatencyHistogram::getBucketMicros(i);
        ASSERT_EQUALS(OperationLatencyHistogram::getBucket(boundary), i);
        // Check that the next/previous latency values are handled correctly.
        ASSERT_EQUALS(OperationLatencyHistogram::getBucket(boundary + 1), i);
        if (i > 0) {
            ASSERT_EQUALS(OperationLatencyHistogram::getBucket(boundary - 1), i - 1);
        }
    }
    uint64_t maxValue = std::numeric_limits<uint64_t>::max();
    ASSERT_EQUALS(OperationLatencyHistogram::getBucket(maxValue), nBuckets - 1);
}


TEST(OperationLatencyHistogram, Increment) {
    OperationLatencyHistogram hist;
    // Increment each bucket of each histogram type once.
    for (int i = 0; i < nBuckets; i++) {
        uint64_t latency = OperationLatencyHistogram::getBucketMicros(i);
        hist.incrementBucket(latency, i, HistogramType::opRead);
        hist.incrementBucket(latency, i, HistogramType::opWrite);
        hist.incrementBucket(latency, i, HistogramType::opCommand);
    }
    BSONObjBuilder outBuilder;
    hist.append(&outBuilder);
    BSONObj out = outBuilder.done();
    ASSERT_EQUALS(out["reads"]["ops"].Long(), nBuckets);
    ASSERT_EQUALS(out["writes"]["ops"].Long(), nBuckets);
    ASSERT_EQUALS(out["commands"]["ops"].Long(), nBuckets);
}


TEST(OperationLatencyHistogram, GlobalIncrement) {
    for (int i = 0; i < nBuckets; i++) {
        uint64_t latency = OperationLatencyHistogram::getBucketMicros(i);
        incrementGlobalHistogram(latency, HistogramType::opRead);
        incrementGlobalHistogram(latency, HistogramType::opWrite);
        incrementGlobalHistogram(latency, HistogramType::opCommand);
    }
    BSONObjBuilder outBuilder;
    appendGlobalHistogram(&outBuilder);
    BSONObj out = outBuilder.done();
    // Only checking GTE because these values could be effected by other tests.
    ASSERT_GTE(out["reads"]["ops"].Long(), nBuckets);
    ASSERT_GTE(out["writes"]["ops"].Long(), nBuckets);
    ASSERT_GTE(out["commands"]["ops"].Long(), nBuckets);
}

}  // namespace mongo