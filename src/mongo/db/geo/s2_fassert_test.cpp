#include "mongo/unittest/unittest.h"
#include "third_party/s2/s2.h"
#include "third_party/s2/s2latlng.h"

namespace {
    TEST(S2Fassert, Ticket) {
        S2LatLng a(1.838544019, 89.73816011);
        S2LatLng b(-45, 0);
        S2LatLng c(-45, 0);
    }
}
