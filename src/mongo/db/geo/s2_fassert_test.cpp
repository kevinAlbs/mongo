#define MONGO_LOG_DEFAULT_COMPONENT ::mongo::logger::LogComponent::kGeo

#include "mongo/db/geo/geoparser.h"
#include "mongo/unittest/unittest.h"
#include "mongo/util/log.h"
#include "third_party/s2/s2.h"
#include "third_party/s2/s2latlng.h"
#include "third_party/s2/s2edgeutil.h"

namespace mongo {
    union Exact {
        double asDouble;
        unsigned long long asLongLong;
    };

    void printHex(double num) {
        Exact converter;
        converter.asDouble = num;
        log() << std::hex << converter.asLongLong;
    }

    TEST(S2Fassert, Ticket) {
        S2Point pt;
        S2LatLng ll = S2LatLng::FromDegrees(0, -45).Normalized();

        pt = ll.ToPoint();
        log() << "Exact representation of y is:";
        printHex(pt.y());
        // On OSX     0xbfe6a09e667f3bcc
        // On Windows 0xbfe6a09e667f3bcd
    }


    TEST(S2Fassert, OnOSX) {
        // These are exact representations of the points which trigger the fassert error on Windows
        S2Point a(0x3f72b579b431bee4, 0x3feffbb2817d5fad, 0x3fa06d338a2f992d);
        S2Point b(0x3fe6a09e667f3bcd, 0xbfe6a09e667f3bcd, 0x0);
        S2Point c(0x3fe6a09e667f3bcc, 0xbfe6a09e667f3bcc, 0x0);
        S2Point d(0x3fe6becebc67a3a9, 0xbfe682459384dfd4, 0x0);

        log() << S2EdgeUtil::EdgeOrVertexCrossing(a,b,c,d);
    }
}
