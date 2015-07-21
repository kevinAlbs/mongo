#define MONGO_LOG_DEFAULT_COMPONENT ::mongo::logger::LogComponent::kQuery
#include "mongo/util/log.h"
#include "mongo/unittest/unittest.h"
#include "mongo/db/geo/geometry_container.h"
#include "mongo/db/geo/geoconstants.h"
#include "mongo/db/geo/shapes.h"
#include "third_party/s2/s2.h"
#include "third_party/s2/s2cellid.h"
#include "third_party/s2/s2regioncoverer.h"
#include "mongo/bson/json.h"
#include "mongo/bson/bsonobj.h"


namespace mongo {
class RegionBuffer: public S2Region {
public:
    RegionBuffer(const GeometryContainer& geoContainer, double bufferDistance)
        : _geoContainer(geoContainer), _bufferDistance(bufferDistance) {}
    S2Cap GetCapBound() const {
        const S2Region& region = _geoContainer.getS2Region();
        S2Cap initialBound = region.GetCapBound();
        S1Angle distance = S1Angle::Radians(initialBound.angle().radians() + _bufferDistance);
        return S2Cap::FromAxisAngle(initialBound.axis(), distance);
    }

    bool MayIntersect(S2Cell const& cell) const {
        S2Cap cellCap = cell.GetCapBound();
        PointWithCRS cellCentroid;
        cellCentroid.point = cellCap.axis();
        cellCentroid.crs = SPHERE;
        return _geoContainer.minDistance(cellCentroid) / kRadiusOfEarthInMeters <
                _bufferDistance + cellCap.angle().radians();
    }

    bool Contains(S2Cell const& cell) const {
        S2Cap cellCap = cell.GetCapBound();
        PointWithCRS cellCentroid;
        cellCentroid.point = cellCap.axis();
        cellCentroid.crs = SPHERE;
        return _geoContainer.minDistance(cellCentroid) / kRadiusOfEarthInMeters <
                _bufferDistance - cellCap.angle().radians();
    }

    bool VirtualContainsPoint(S2Point const& p) const { return false; }
    void Encode(Encoder* const encoder) const {}
    bool Decode(Decoder* const decoder) { return true; }
    bool DecodeWithinScope(Decoder* const decoder) { return true; }
    S2Region* Clone() const { return nullptr; }
    S2LatLngRect GetRectBound() const { return S2LatLngRect::Empty(); }

private:
    const GeometryContainer& _geoContainer;
    double _bufferDistance; // in radians
};


TEST(geo, line_covering) {
    GeometryContainer container;
    std::string rawGeoJSON = "{$geometry: {type: 'LineString', coordinates: [[0,0],[.5,.5]]}}";
    BSONObj geoJSONObj = fromjson(rawGeoJSON);
    log() << geoJSONObj;
    BSONElement geoJSON = geoJSONObj.getField("$geometry");
    container.parseFromQuery(geoJSON);
    RegionBuffer buffer(container, 0.1);

    S2RegionCoverer coverer;

    std::vector<S2CellId> cover;
    coverer.GetCovering(buffer, &cover);

    std::cout << "[";
    for (S2CellId cell : cover) {
        std::cout << "'" << cell.toString() << "',";
    }
    std::cout << "]";

}

}
