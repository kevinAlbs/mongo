/**
 *    Copyright (C) 2013 10gen Inc.
 *
 *    This program is free software: you can redistribute it and/or  modify
 *    it under the terms of the GNU Affero General Public License, version 3,
 *    as published by the Free Software Foundation.
 *
 *    This program is distributed in the hope that it will be useful,
 *    but WITHOUT ANY WARRANTY; without even the implied warranty of
 *    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *    GNU Affero General Public License for more details.
 *
 *    You should have received a copy of the GNU Affero General Public License
 *    along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 *    As a special exception, the copyright holders give permission to link the
 *    code of portions of this program with the OpenSSL library under certain
 *    conditions as described in each individual source file and distribute
 *    linked combinations including the program with the OpenSSL library. You
 *    must comply with the GNU Affero General Public License in all respects for
 *    all of the code used other than as permitted herein. If you modify file(s)
 *    with this exception, you may extend this exception to your version of the
 *    file(s), but you are not obligated to do so. If you do not wish to do so,
 *    delete this exception statement from your version. If you delete this
 *    exception statement from all source files in the program, then also delete
 *    it in the license file.
 */

#pragma once

#include "third_party/s2/s2cellunion.h"
#include "third_party/s2/s2region.h"

#include "mongo/db/jsobj.h"
#include "mongo/db/geo/r2_region_coverer.h"
#include "mongo/db/geo/shapes.h"
#include "mongo/db/query/index_bounds_builder.h" // For OrderedIntervalList

namespace mongo {

    /**
     * Functions that compute expression index mappings.
     *
     * TODO: I think we could structure this more generally with respect to planning.
     */
    class ExpressionMapping {
    public:

        static BSONObj hash(const BSONElement& value);

        static void cover2d(const R2Region& region,
                            const BSONObj& indexInfoObj,
                            int maxCoveringCells,
                            OrderedIntervalList* oil,
                            R2CellUnion* excludedCells = nullptr);

        // Returns a vector of S2CellIds that cover the region
        static std::vector<S2CellId> get2dsphereCover(const S2Region& region,
                                                      const BSONObj& indexInfoObj);

        // Generates the OrderedIntervalList for a given covering
        static void transformToQueryIntervals(const std::vector<S2CellId>& cover,
                                              const BSONObj& indexInfoObj,
                                              OrderedIntervalList* oilOut);

        // TODO: what should we really pass in for indexInfoObj?
        // Generates an OrderedIntervalList that covers the entire region
        static void cover2dsphere(const S2Region& region,
                                  const BSONObj& indexInfoObj,
                                  OrderedIntervalList* oilOut);
    };

}  // namespace mongo
