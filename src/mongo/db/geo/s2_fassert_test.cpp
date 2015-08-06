#define MONGO_LOG_DEFAULT_COMPONENT ::mongo::logger::LogComponent::kGeo

#include "mongo/db/geo/geoparser.h"
#include "mongo/unittest/unittest.h"
#include "mongo/util/log.h"
#include "third_party/s2/s2.h"
#include "third_party/s2/s2latlng.h"

namespace mongo {
    union Exact {
        double asDouble;
        unsigned long long asLongLong;
    };

    TEST(S2WindowsFassert, Ticket) {
        S2Point pt;
        S2LatLng ll = S2LatLng::FromDegrees(0, -45);
        Exact representation;

        representation.asDouble = ll.lng().radians();
        log() << "lng is:";
        log() << representation.asLongLong;

        representation.asDouble = drem(ll.lng().radians(), 2 * M_PI);
        log() << "After drem it is:";
        log() << representation.asLongLong;
        // On OSX     13828621494152080664
        // On Windows <same>

        ll = ll.Normalized();

        representation.asDouble = ll.lng().radians();
        log() << "Normalized lng:";
        log() << representation.asLongLong;
        representation.asDouble = ll.lat().radians();
        log() << "Normalized lat:";
        log() << representation.asLongLong;

        pt = ll.ToPoint();
        representation.asDouble = pt.y();
        log() << "Exact representation of y is:";
        log() << representation.asLongLong;
        // On OSX     13827916308072577996
        // On Windows 13827916308072577997
    }
}
