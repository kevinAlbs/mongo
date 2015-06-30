<<<<<<< HEAD
// Test to check whether the number of intervals in a geoNear query equals 
=======
// Test to check whether the number of intervals in a geoNear query equals
>>>>>>> d879ba7b97b52e7f54bd93d0fdc147b127f87ece
// the number of inputStages it completes

var t = db.jstests_geo_s2explain;
t.drop();

var point1 = { loc : { type : "Point", coordinates : [10, 10] } };
var point2 = { loc : { type : "Point", coordinates : [10.001, 10] } };
assert.writeOK( t.insert( [ point1, point2] ) );

assert.commandWorked( t.ensureIndex( { loc : "2dsphere"} ) );

<<<<<<< HEAD
var explain = t.find( { 
        loc: { $nearSphere : { type : "Point", coordinates : [10, 10] } } 
    } ).limit(1).explain("executionStats");

// There should only be one search interval
assert.eq( 1, explain.executionStats.executionStages
                                    .inputStage.searchIntervals.length );

// Populates the collection with a few hundred points at varying distances
var points = [];
for( var i = 10; i < 70; i+=0.1 ) {
=======
var explain = t.find( {
        loc: { $nearSphere : { type : "Point", coordinates : [10, 10] } }
    } ).limit(1).explain("executionStats");
var inputStage = explain.executionStats.executionStages.inputStage;

assert.eq( 1, inputStage.searchIntervals.length );

// Populates the collection with a few hundred points at varying distances
var points = [];
for ( var i = 10; i < 70; i+=0.1 ) {
>>>>>>> d879ba7b97b52e7f54bd93d0fdc147b127f87ece
    points.push({ loc : { type : "Point", coordinates : [i, i] } });
}

assert.writeOK( t.insert( points ) );

<<<<<<< HEAD
explain = t.find( { 
        loc: { $nearSphere : { type : "Point", coordinates : [10, 10] } } 
    } ).limit(10).explain("executionStats");

// There should be 6 search intervals
assert.eq( 6, explain.executionStats.executionStages
                                    .inputStage.searchIntervals.length );

explain = t.find( { 
        loc: { $nearSphere : { type : "Point", coordinates : [10, 10] } } 
    } ).limit(50).explain("executionStats");

// There should be 8 search intervals
assert.eq( 8, explain.executionStats.executionStages
                                    .inputStage.searchIntervals.length );

explain = t.find( { 
        loc: { $nearSphere : { type : "Point", coordinates : [10, 10] } } 
    } ).limit(200).explain("executionStats");

// There should be 10 search intervals
assert.eq( 10, explain.executionStats.executionStages
                                     .inputStage.searchIntervals.length );
=======
explain = t.find( {
        loc: { $nearSphere : { type : "Point", coordinates : [10, 10] } }
    } ).limit(10).explain("executionStats");
inputStage = explain.executionStats.executionStages.inputStage;

assert.eq( inputStage.inputStages.length, inputStage.searchIntervals.length );

explain = t.find( {
        loc: { $nearSphere : { type : "Point", coordinates : [10, 10] } }
    } ).limit(50).explain("executionStats");
inputStage = explain.executionStats.executionStages.inputStage;

assert.eq( inputStage.inputStages.length, inputStage.searchIntervals.length );

explain = t.find( {
        loc: { $nearSphere : { type : "Point", coordinates : [10, 10] } }
    } ).limit(200).explain("executionStats");
inputStage = explain.executionStats.executionStages.inputStage;

assert.eq( inputStage.inputStages.length, inputStage.searchIntervals.length );
>>>>>>> d879ba7b97b52e7f54bd93d0fdc147b127f87ece
