#define MONGO_LOG_DEFAULT_COMPONENT ::mongo::logger::LogComponent::kGeo

#include "mongo/db/geo/geoparser.h"
#include "mongo/unittest/unittest.h"
#include "mongo/util/log.h"
#include "third_party/s2/s2.h"
#include "third_party/s2/s2latlng.h"

namespace mongo {
    TEST(S2WindowsFassert, Ticket) {
        S2Point pt;
        S2LatLng ll = S2LatLng::FromDegrees(0, -45).Normalized();
        pt = ll.ToPoint();

        union Exact {
            double asDouble;
            unsigned long long asLongLong;
        };

        Exact representation;
        representation.asDouble = pt.y();
        log() << "Exact representation of y is:";
        log() << representation.asLongLong;
        // On OSX     13827916308072577996
        // On Windows 13827916308072577997
    }
}
