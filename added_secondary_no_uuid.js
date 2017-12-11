// run this with:
// python ./buildscripts/resmoke.py --suites=sharding ./added_secondary_no_uuid.js | tee added_secondary_no_uuid.log
// then you can see the output of each server in the log file. Using the port you can filter out just the log output of the secondary.

// init with one shard with one node rs
var st = new ShardingTest({shards: 1, rs: {nodes: 1}, mongos: 1});
var mongos = st.s;
var rs = st.rs0;

// create `test.coll`.
mongos.getDB("test").coll.insert({_id: 1, x: 1});

// add a node to shard rs
var newNode = rs.add({'shardsvr': ''});
rs.reInitiate();
rs.awaitSecondaryNodes();

print("new secondary on port " + newNode.port);
newNode.setSlaveOk(true);

// the test db has UUIDs on collections
var testDB = newNode.getDB("test");
jsTest.log("listCollections on `test`");
var res = testDB.runCommand({"listCollections": 1});
printjson(res); // has UUIDs

// but the local db has no UUIDs on collections
var localDB = newNode.getDB("local");
jsTest.log("listCollections on `local`");
res = localDB.runCommand({"listCollections": 1});
printjson(res); // no UUIDs