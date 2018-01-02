jsTest.log("start");
db = db.getSiblingDB("commandAssertions");
const fakeErrCode = 1234567890;
let tests = [];

function setup() {
    db.coll.drop();
    db.coll.insert({_id: 1});
}

// Raw command responses.
tests.push(function rawCommandOk() {
    setup();
    let res = db.runCommand({"ping": 1});
    assert.doesNotThrow(() => assert.commandWorked(res));
    assert.doesNotThrow(() => assert.commandWorkedIgnoringWriteErrors(res));
    assert.throws(() => assert.commandFailed(res));
    assert.throws(() => assert.commandFailedWithCode(res, 0));
});

tests.push(function rawCommandErr() {
    let res = db.runCommand({"IHopeNobodyEverMakesThisACommand": 1});
    assert.throws(() => assert.commandWorked(res));
    assert.throws(() => assert.commandWorkedIgnoringWriteErrors(res));
    assert.doesNotThrow(() => assert.commandFailed(res));
    assert.doesNotThrow(() => assert.commandFailedWithCode(res, 59));
    // commandFailedWithCode should succeed any of the passed error codes are matched.
    assert.doesNotThrow(() => assert.commandFailedWithCode(res, [59, fakeErrCode]));
});

tests.push(function rawCommandWriteOk() {
    let res = db.runCommand({insert: "coll", documents: [{_id: 2}]});
    assert.doesNotThrow(() => assert.commandWorked(res));
    assert.doesNotThrow(() => assert.commandWorkedIgnoringWriteErrors(res));
    assert.throws(() => assert.commandFailed(res));
    assert.throws(() => assert.commandFailedWithCode(res, 0));
});

tests.push(function rawCommandWriteErr() {
    let res = db.runCommand({insert: "coll", documents: [{_id: 1}]});
    assert.throws(() => assert.commandWorked(res));
    assert.doesNotThrow(() => assert.commandWorkedIgnoringWriteErrors(res));
    assert.doesNotThrow(() => assert.commandFailed(res));
    assert.doesNotThrow(() => assert.commandFailedWithCode(res, 11000));
    assert.doesNotThrow(() => assert.commandFailedWithCode(res, [11000, fakeErrCode]));
});

tests.push(function collWriteOk() {
    let res = db.coll.insert({_id: 2});
    assert(res instanceof WriteResult);
    assert.doesNotThrow(() => assert.commandWorked(res));
    assert.doesNotThrow(() => assert.commandWorkedIgnoringWriteErrors(res));
    assert.throws(() => assert.commandFailed(res));
    assert.throws(() => assert.commandFailedWithCode(res, 0));
});

tests.push(function collWriteErr() {
    let res = db.coll.insert({_id: 1});
    assert(res instanceof WriteResult);
    assert.throws(() => assert.commandWorked(res));
    assert.doesNotThrow(() => assert.commandWorkedIgnoringWriteErrors(res));
    assert.doesNotThrow(() => assert.commandFailed(res));
    assert.doesNotThrow(() => assert.commandFailedWithCode(res, 11000));
    assert.doesNotThrow(() => assert.commandFailedWithCode(res, [11000, fakeErrCode]));
});

tests.push(function collMultiWriteOk() {
    let res = db.coll.insert([{_id: 3}, {_id: 2}]);
    assert(res instanceof BulkWriteResult);
    assert.doesNotThrow(() => assert.commandWorked(res));
    assert.doesNotThrow(() => assert.commandWorkedIgnoringWriteErrors(res));
    assert.throws(() => assert.commandFailed(res));
    assert.throws(() => assert.commandFailedWithCode(res, 0));
});

tests.push(function collMultiWriteErr() {
    let res = db.coll.insert([{_id: 1}, {_id: 2}]);
    assert(res instanceof BulkWriteResult);
    assert.throws(() => assert.commandWorked(res));
    assert.doesNotThrow(() => assert.commandWorkedIgnoringWriteErrors(res));
    assert.doesNotThrow(() => assert.commandFailed(res));
    assert.doesNotThrow(() => assert.commandFailedWithCode(res, 11000));
    assert.doesNotThrow(() => assert.commandFailedWithCode(res, [11000, fakeErrCode]));
});

tests.push(function mapReduceOk() {
    let res = db.coll.mapReduce(
        function() {
            emit(this._id, 0)
        },
        function(k, v) {
            return v[0];
        },
        {out: "coll_out"});
    assert(res instanceof MapReduceResult);
    assert.doesNotThrow(() => assert.commandWorked(res));
    assert.doesNotThrow(() => assert.commandWorkedIgnoringWriteErrors(res));
    assert.throws(() => assert.commandFailed(res));
    assert.throws(() => assert.commandFailedWithCode(res, 0));
});

tests.push(function mapReduceErr() {
    // db.coll.mapReduce throws if the command response has ok:0
    // Instead manually construct a MapReduceResult with ok:0
    let res = new MapReduceResult(
        db, {"ok": 0, "errmsg": "Example Error", "code": 139, "codeName": "JSInterpreterFailure"});
    assert.throws(() => assert.commandWorked(res));
    assert.throws(() => assert.commandWorkedIgnoringWriteErrors(res));
    assert.doesNotThrow(() => assert.commandFailed(res));
    assert.doesNotThrow(() => assert.commandFailedWithCode(res, 139));
    assert.doesNotThrow(() => assert.commandFailedWithCode(res, [139, fakeErrCode]));
});

tests.push(function errObject() {
    // Some functions throw an Error with a code property attached.
    let threw = false;
    let res = null;
    try {
        db.eval("IHopeNobodyEverMakesThisABuiltInReference");
    } catch(e) {
        threw = true;
        res = e;
    }
    assert(threw);
    assert(res instanceof Error);
    assert(res.hasOwnProperty("code"));
    assert.throws(() => assert.commandWorked(res));
    assert.throws(() => assert.commandWorkedIgnoringWriteErrors(res));
    assert.doesNotThrow(() => assert.commandFailed(res));
    assert.doesNotThrow(() => assert.commandFailedWithCode(res, 139));
    assert.doesNotThrow(() => assert.commandFailedWithCode(res, [139, fakeErrCode]));
});

// Test when the insert command fails with ok:0 (i.e. not failing due to write err)
tests.push(function collInsertNotOK() {
    let res = db.coll.insert({x:1}, {writeConcern: {"bad": 1}});
    assert(res instanceof WriteCommandError);
    assert.throws(() => assert.commandWorked(res));
    assert.throws(() => assert.commandWorkedIgnoringWriteErrors(res));
    assert.doesNotThrow(() => assert.commandFailed(res));
    assert.doesNotThrow(() => assert.commandFailedWithCode(res, 9));
    assert.doesNotThrow(() => assert.commandFailedWithCode(res, [9, fakeErrCode]));
});

tests.push(function collMultiInsertNotOK() {
    let res = db.coll.insert([{x:1},{x:2}], {writeConcern: {"bad": 1}});
    assert(res instanceof WriteCommandError);
    assert.throws(() => assert.commandWorked(res));
    assert.throws(() => assert.commandWorkedIgnoringWriteErrors(res));
    assert.doesNotThrow(() => assert.commandFailed(res));
    assert.doesNotThrow(() => assert.commandFailedWithCode(res, 9));
    assert.doesNotThrow(() => assert.commandFailedWithCode(res, [9, fakeErrCode]));
});

tests.push(function crudInsertOneOk() {
    let res = db.coll.insertOne({_id: 2});
    assert(res.hasOwnProperty("acknowledged"));
    assert.doesNotThrow(() => assert.commandWorked(res));
    assert.doesNotThrow(() => assert.commandWorkedIgnoringWriteErrors(res));
    assert.throws(() => assert.commandFailed(res));
    assert.throws(() => assert.commandFailedWithCode(res, 0));
});

tests.push(function crudInsertOneErr() {
    let threw = false;
    let res = null;
    try {
        db.coll.insertOne({_id: 1});
    } catch(e) {
        threw = true;
        res = e;
    }
    assert(threw);
    // WriteError is private to bulk_api.js, so cannot assert instanceof WriteError
    assert(res instanceof WriteError);
    assert.throws(() => assert.commandWorked(res));
    assert.throws(() => assert.commandWorkedIgnoringWriteErrors(res));
    assert.doesNotThrow(() => assert.commandFailed(res));
    assert.doesNotThrow(() => assert.commandFailedWithCode(res, 11000));
    assert.doesNotThrow(() => assert.commandFailedWithCode(res, [11000, fakeErrCode]));
});

tests.push(function rawMultiWriteErr() {
    // TODO: not sure how to generate a command response containing more than one writeError
    let res = {
        "ok" : 1,
        "writeErrors" : [
            { "index" : 0, "code" : 1, "errmsg" : "Test Error" },
            { "index" : 1, "code" : 2, "errmsg" : "Test Error" }
        ]
    };

    assert.throws(() => assert.commandWorked(res));
    assert.doesNotThrow(() => assert.commandWorkedIgnoringWriteErrors(res));
    assert.doesNotThrow(() => assert.commandFailed(res));
    assert.doesNotThrow(() => assert.commandFailedWithCode(res, 1));
    assert.doesNotThrow(() => assert.commandFailedWithCode(res, [1, fakeErrCode]));
});

tests.push(function bulkMultiWriteErr() {
    // TODO: not sure how to generate a command response containing more than one writeError
    let res = new BulkWriteResult({
        "ok" : 1,
        "writeErrors" : [
            { "index" : 0, "code" : 1, "errmsg" : "Test Error" },
            { "index" : 1, "code" : 2, "errmsg" : "Test Error" }
        ]
    });

    assert.throws(() => assert.commandWorked(res));
    assert.doesNotThrow(() => assert.commandWorkedIgnoringWriteErrors(res));
    assert.doesNotThrow(() => assert.commandFailed(res));
    assert.doesNotThrow(() => assert.commandFailedWithCode(res, 1));
    assert.doesNotThrow(() => assert.commandFailedWithCode(res, [1, fakeErrCode]));
});

tests.forEach((test) => {
    jsTest.log("===" + test.name + "===");
    setup();
    test();
});

jsTest.log("end");