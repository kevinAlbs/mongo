#include <iomanip>

#include "mongo/unittest/unittest.h"
#include "geoparser.h"
#include "third_party/s2/s2.h"
#include "third_party/s2/s2latlng.h"

namespace {
    TEST(S2Fassert, Ticket) {
        S2Point out;
        S2LatLng ll = S2LatLng::FromDegrees(0, -45).Normalized();
        out = ll.ToPoint();
        std::cout << std::setprecision(100) << out.x() << std::endl;
        std::cout << std::setprecision(100) << out.y() << std::endl;
        std::cout << std::setprecision(100) << out.z() << std::endl;

        std::cout << "Binary representation of out.x() is" << std::endl;

        union Rep {
            double dValue;
            uint64_t iValue;
        };

        Rep outUnion;
        outUnion.dValue= out.y();
        std::cout << outUnion.iValue;
        std::cout << std::endl;
    }
}
