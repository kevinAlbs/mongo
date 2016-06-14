// Checks that histogram counters for collections are updated as we expect.
// Counts which diverge from original design of the histogram are noted in comments.

var name = "operationalLatencyHistogramTest";

var testDB = db.getSiblingDB(name);
var testColl = testDB[name + "coll"];
var testCollHelper = testDB[name + "coll_helper"];

testColl.drop();
testCollHelper.drop();

// Test aggregation command output format.
var commandResult = testDB.runCommand(
    {aggregate: testColl.getName(), pipeline: [{$collStats: {latencyStats: {}}}]});
assert.commandWorked(commandResult, "Aggregation command failed");
assert(commandResult.result.length == 1);

var stats = commandResult.result[0];
var histogramTypes = ["reads", "writes", "commands"];

assert(stats.hasOwnProperty("localTime"));
assert(stats.hasOwnProperty("latencyStats"));

histogramTypes.forEach(function(key) {
    assert(stats.latencyStats.hasOwnProperty(key));
    assert(stats.latencyStats[key].hasOwnProperty("ops"));
    assert(stats.latencyStats[key].hasOwnProperty("latency"));
});

function getHistogramStats() {
    return testColl.latencyStats().toArray()[0].latencyStats;
}

var lastHistogram = getHistogramStats();

// Checks that the difference in the histogram is what we expect, and also
// accounts for the $collStats aggregation stage itself.
function checkHistogramDiff(reads, writes, commands) {
    var thisHistogram = getHistogramStats();
    assert.eq(thisHistogram.reads.ops - lastHistogram.reads.ops, reads);
    assert.eq(thisHistogram.writes.ops - lastHistogram.writes.ops, writes);
    // Running the aggregation itself will increment command stats by one.
    assert.eq(thisHistogram.commands.ops - lastHistogram.commands.ops, commands + 1);
    lastHistogram = thisHistogram;
}

// Insert
var numRecords = 100;
for (var i = 0; i < numRecords; i++) {
    testColl.insert({_id: i});
}
checkHistogramDiff(0, numRecords, 0);

// Update
for (var i = 0; i < numRecords; i++) {
    testColl.update({_id: i}, {x: i});
}
checkHistogramDiff(0, numRecords, 0);

// Find
var cursors = {};
for (var i = 0; i < numRecords; i++) {
    cursors[i] = testColl.find({x: {$gte: i}}).batchSize(2);
    assert.eq(cursors[i].next()._id, i);
}
checkHistogramDiff(numRecords, 0, 0);

// GetMore
for (var i = 0; i < numRecords / 2; i++) {
    // Trigger two getmore commands.
    assert.eq(cursors[i].next()._id, i + 1);
    assert.eq(cursors[i].next()._id, i + 2);
    assert.eq(cursors[i].next()._id, i + 3);
    assert.eq(cursors[i].next()._id, i + 4);
}
checkHistogramDiff(numRecords, 0, 0);

// KillCursors
// The last cursor has no additional results, hence does not need to be closed.
for (var i = 0; i < numRecords - 1; i++) {
    cursors[i].close();
}
// Note: design doc says this should not be recorded, but it is counted as collection command.
checkHistogramDiff(0, 0, numRecords - 1);

// Remove
for (var i = 0; i < numRecords; i++) {
    testColl.remove({_id: i});
}
checkHistogramDiff(0, numRecords, 0);

// Upsert
for (var i = 0; i < numRecords; i++) {
    testColl.update({_id: i}, {x: i}, {upsert: 1});
}
checkHistogramDiff(0, numRecords, 0);

// Aggregate
for (var i = 0; i < numRecords; i++) {
    testColl.aggregate([{$match: {x: i}}, {$group: {_id: "$x"}}]);
}
// Note: design doc says read, but it is counted as two commands due to how top records operations.
checkHistogramDiff(0, 0, 2 * numRecords);

// Count
for (var i = 0; i < numRecords; i++) {
    testColl.count({x: i});
}
// Note: design doc says read, but it is counted as command.
checkHistogramDiff(0, 0, numRecords);

// Group
testColl.group({initial: {}, reduce: function() {}, key: {a: 1}});
// Note: design doc says read, but it is counted as command.
checkHistogramDiff(0, 0, 1);

// ParallelCollectionScan
testDB.runCommand({parallelCollectionScan: testColl.getName(), numCursors: 5});
// Note: design doc says read, but it is counted as command.
checkHistogramDiff(0, 0, 1);

// FindAndModify
testColl.findAndModify({query: {}, update: {pt: {type: "point", coordinates: [0, 0]}}});
// Note: design doc says write, but it is not counted.
checkHistogramDiff(0, 0, 0);

// CreateIndex
testColl.createIndex({pt: "2dsphere"});
// Note: design doc says command, but it is not counted.
checkHistogramDiff(0, 0, 0);

// GeoNear
testDB.runCommand({geoNear: testColl.getName(), near: {type: "point", coordinates: [0, 0]}});
// Note: design doc says read, but this is counted as command.
checkHistogramDiff(0, 0, 1);

// GetIndexes
testColl.getIndexes();
checkHistogramDiff(0, 0, 1);

// Reindex
testColl.reIndex();
checkHistogramDiff(0, 0, 1);

// DropIndex
testColl.dropIndex({pt: "2dsphere"});
checkHistogramDiff(0, 0, 1);

// Explain
testColl.explain().find();
// Note: design doc says command, but it is not counted.
checkHistogramDiff(0, 0, 0);

// CollStats
testDB.runCommand({collStats: testColl.getName()});
checkHistogramDiff(0, 0, 1);

// CollMod
testDB.runCommand({collStats: testColl.getName(), validationLevel: "off"});
checkHistogramDiff(0, 0, 1);

// Compact
testDB.runCommand({compact: testColl.getName()});
checkHistogramDiff(0, 0, 1);

// DataSize
testColl.dataSize();
checkHistogramDiff(0, 0, 1);

// PlanCache
testColl.getPlanCache().listQueryShapes();
checkHistogramDiff(0, 0, 1);

// Commands which occur on the database only should not effect the collection stats.
testDB.serverStatus();
checkHistogramDiff(0, 0, 0);

testColl.runCommand("whatsmyuri");
checkHistogramDiff(0, 0, 0);

// Test non-commands.
testColl.runCommand("IHopeNobodyEverMakesThisACommand");
checkHistogramDiff(0, 0, 0);

commandResult = testDB.runCommand({aggregate: testColl.getName(), pipeline: [{$collStats: true}]});
assert.commandFailed(commandResult);
