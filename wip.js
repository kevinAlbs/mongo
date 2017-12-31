assert.commandWorked2 = function(res, msg) {
    if (assert._debug && msg) {
        print("in assert for: " + msg);
    }

    print ("called with " + res.constructor.name);

    let failed = false;

    if (typeof(res) !== "object") {
        doassert("unknown response given to commandWorked")
    }

    if (res.constructor === Object) {
        // response is plain JS object.
        if (res.ok === 0) {
            failed = true;
        }

        if (res.hasOwnProperty("writeErrors") && res.writeErrors.length > 0) {
            failed = true;
        }

        if (failed) {
            doassert("command failed: " + tojson(res) + " : " + msg, res);
        }
    }
    else if (res instanceof WriteResult || res instanceof BulkWriteResult
            || res instanceof WriteCommandError) {
        assert.writeOK(res, msg);
    }
    return res;
};

// Test out a variety of different failure cases.

// Unfortunately doassert prints

// Raw command responses.

jsTest.log("start");

const name = "commandAssertions";
db = db.getSiblingDB(name);
db.dropDatabase();
/*
print("1")
const rawSuccess = db.runCommand({"ping": 1});
assert.doesNotThrow(() => assert.commandWorked2(rawSuccess));
print("2")
const rawFailure = db.runCommand({"IHopeNobodyEverMakesThisACommand": 1});
assert.throws(() => assert.commandWorked2(rawFailure));
print("3")
// // prime coll with a document to produce duplicate key errors later.
assert.writeOK(db.coll.insert({_id: 1}));
print("4")
// check that a write error is also caught (even though response contains ok:1)
const rawWriteError = db.runCommand({insert: "coll", documents: [{_id: 1}]});
assert.throws(() => assert.commandWorked2(rawWriteError));
print("5")
// check with a bulk insert, where only one document fails
const rawBulkWriteError = db.runCommand({insert: "coll", documents: [{_id: 2}, {_id: 1}]});
assert.throws(() => assert.commandWorked2(rawBulkWriteError));
print("6")
// check with different error wrapper objects
const writeResultSuccess = db.coll.insert({_id: 3});
assert.doesNotThrow(() => assert.commandWorked2(writeResultSuccess));

print("7");
const writeResultError = db.coll.insert({_id: 1});
assert.throws(() => assert.commandWorked2(writeResultError));

print("8");
let bulk = db.coll.initializeUnorderedBulkOp();
bulk.insert({_id: 4});
const bulkResultWriteSuccess = bulk.execute();
assert.doesNotThrow(() => assert.commandWorked2(bulkResultWriteSuccess));
*/
// bulk api itself throws
print("9");
db.coll.insert({_id: 1});
bulk = db.coll.initializeUnorderedBulkOp();
bulk.insert({_id: 1});
const bulkResultWriteError = bulk.execute();
assert.throws(() => assert.commandWorked2(bulkResultWriteError));

// TODO: force a WriteCommandError as well

jsTest.log("end");