/*
function _rawCommandReplyWorked(raw) {
    // response is plain JS object.
    if (raw.ok === 0) {
        return false;
    }

    // a write command response may have ok:1 but write errors
    if (raw.hasOwnProperty("writeErrors") && raw.writeErrors.length > 0) {
        return false;
    }

    return true;
}

assert.commandWorked = function(res, msg) {
    if (assert._debug && msg) {
        print("in assert for: " + msg);
    }

    if (typeof(res) !== "object") {
        doassert("unknown response given to commandWorked")
    }

    if (res instanceof WriteResult || res instanceof BulkWriteResult || res instanceof
WriteCommandError) {
        // For write results, even if ok:1, having writeErrors fails.
        assert.writeOK(res, msg);
    }
    else if (res.hasOwnProperty("ok")) {
        // Handle raw command responses or cases like MapReduceResult which extend command response.
        if (!_rawCommandReplyWorked(res)) {
            doassert("command failed: " + tojson(res) + " : " + msg, res);
        }
    }
    else {
        doassert("unknown type of result, cannot check ok: " + tojson(res) + " : " + msg, res);
    }
    return res;
};

assert.commandWorkedIgnoringWriteErrors = function(res, msg) {
    if (assert._debug && msg) {
        print("in assert for: " + msg);
    }

    if (typeof(res) !== "object") {
        doassert("unknown response given to commandWorkedIgnoringWriteErrors")
    }

    if (res.hasOwnProperty("ok")) {
        if (res.ok === 0) {
            doassert("command failed: " + tojson(res) + " : " + msg, res);
        }
    }
    else {
        doassert("unknown type of result, cannot check ok: " + tojson(res) + " : " + msg, res);
    }
    return res;
};

assert.commandFailed = function(res, msg) {
    if (assert._debug && msg) {
        print("in assert for: " + msg);
    }

    if (typeof(res) !== "object") {
        doassert("unknown response given to commandFailed")
    }

    if (res instanceof WriteResult || res instanceof BulkWriteResult || res instanceof
WriteCommandError) {
        assert.writeError(res, msg);
    }
    else if (res.hasOwnProperty("ok")) {
        if (_rawCommandReplyWorked(res)) {
            doassert("command worked when it should have failed: " + tojson(res) + " : " + msg,
res);
        }
    }
    else {
        doassert("unknown type of result, cannot check error: " + tojson(res) + " : " + msg, res);
    }
    return res;
};

// expectedCode can be an array of possible codes
assert.commandFailedWithCode = function(res, expectedCode, msg) {
    if (assert._debug && msg) {
        print("in assert for: " + msg);
    }

    if (typeof(res) !== "object") {
        doassert("unknown response given to commandFailedWithCode")
    }

    if (!Array.isArray(expectedCode)) {
        expectedCode = [expectedCode];
    }

    if (res instanceof WriteResult || res instanceof BulkWriteResult || res instanceof
WriteCommandError) {
        assert.writeErrorWithCode(res, expectedCode, msg);
    }
    else if (res.hasOwnProperty("ok")) {
        if (_rawCommandReplyWorked(res)) {
            doassert("command worked when it should have failed: " + tojson(res) + " : " + msg,
res);
        }
        let foundCode = false;
        if (res.hasOwnProperty("code") && expectedCode.indexOf(res.code) !== -1) {
            foundCode = true;
        }
        else if (res.hasOwnProperty("writeErrors")) {
            foundCode = res.writeErrors.some((err) => expectedCode.indexOf(err.code) !== -1);
        }
        if (!foundCode) {
            doassert("command did not fail with code " + expectedCode + tojson(res) + " : " + msg,
res)
        }
    }
    else {
        doassert("unknown type of result, cannot check error: " + tojson(res) + " : " + msg, res);
    }
    return res;
};
*/

jsTest.log("start");
db = db.getSiblingDB("commandAssertions");

function setup() {
    db.coll.drop();
    db.coll.insert({_id: 1});
}

// Raw command responses.
function rawCommandOk() {
    setup();
    let res = db.runCommand({"ping": 1});
    assert.doesNotThrow(() => assert.commandWorked(res));
    assert.doesNotThrow(() => assert.commandWorkedIgnoringWriteErrors(res));
    assert.throws(() => assert.commandFailed(res));
    assert.throws(() => assert.commandFailedWithCode(res, 0));
}

function rawCommandErr() {
    setup();
    let res = db.runCommand({"IHopeNobodyEverMakesThisACommand": 1});
    assert.throws(() => assert.commandWorked(res));
    assert.throws(() => assert.commandWorkedIgnoringWriteErrors(res));
    assert.doesNotThrow(() => assert.commandFailed(res));
    assert.doesNotThrow(() => assert.commandFailedWithCode(res, 59));
}

function rawCommandWriteOk() {
    setup();
    let res = db.runCommand({insert: "coll", documents: [{_id: 2}]});
    assert.doesNotThrow(() => assert.commandWorked(res));
    assert.doesNotThrow(() => assert.commandWorkedIgnoringWriteErrors(res));
    assert.throws(() => assert.commandFailed(res));
    assert.throws(() => assert.commandFailedWithCode(res, 0));
}

function rawCommandWriteErr() {
    setup();
    let res = db.runCommand({insert: "coll", documents: [{_id: 1}]});
    assert.throws(() => assert.commandWorked(res));
    assert.doesNotThrow(() => assert.commandWorkedIgnoringWriteErrors(res));
    assert.doesNotThrow(() => assert.commandFailed(res));
    assert.doesNotThrow(() => assert.commandFailedWithCode(res, 11000));
}

function collWriteOk() {
    setup();
    let res = db.coll.insert({_id: 2});
    assert(res instanceof WriteResult);
    assert.doesNotThrow(() => assert.commandWorked(res));
    assert.doesNotThrow(() => assert.commandWorkedIgnoringWriteErrors(res));
    assert.throws(() => assert.commandFailed(res));
    assert.throws(() => assert.commandFailedWithCode(res, 0));
}

function collWriteErr() {
    setup();
    let res = db.coll.insert({_id: 1});
    assert(res instanceof WriteResult);
    assert.throws(() => assert.commandWorked(res));
    assert.doesNotThrow(() => assert.commandWorkedIgnoringWriteErrors(res));
    assert.doesNotThrow(() => assert.commandFailed(res));
    assert.doesNotThrow(() => assert.commandFailedWithCode(res, 11000));
}

function collMultiWriteOk() {
    setup();
    let res = db.coll.insert([{_id: 3}, {_id: 2}]);
    assert(res instanceof BulkWriteResult);
    assert.doesNotThrow(() => assert.commandWorked(res));
    assert.doesNotThrow(() => assert.commandWorkedIgnoringWriteErrors(res));
    assert.throws(() => assert.commandFailed(res));
    assert.throws(() => assert.commandFailedWithCode(res, 0));
}

function collMultiWriteErr() {
    setup();
    let res = db.coll.insert([{_id: 3}, {_id: 1}]);
    assert(res instanceof BulkWriteResult);
    assert.throws(() => assert.commandWorked(res));
    assert.doesNotThrow(() => assert.commandWorkedIgnoringWriteErrors(res));
    assert.doesNotThrow(() => assert.commandFailed(res));
    assert.doesNotThrow(() => assert.commandFailedWithCode(res, 11000));
}

function mapReduceOk() {
    setup();
    let res = db.coll.mapReduce(
        function() {
            emit(this._id, 0)
        },
        function(k, v) {
            return v[0];
        },
        {out: "coll_out"});
    assert.doesNotThrow(() => assert.commandWorked(res));
    assert.doesNotThrow(() => assert.commandWorkedIgnoringWriteErrors(res));
    assert.throws(() => assert.commandFailed(res));
    assert.throws(() => assert.commandFailedWithCode(res, 0));
}

function mapReduceErr() {
    // db.coll.mapReduce throws if the command response has ok:0
    // Instead manually construct a MapReduceResult with ok:0
    let res = new MapReduceResult(
        db, {"ok": 0, "errmsg": "Example Error", "code": 139, "codeName": "JSInterpreterFailure"});
    assert.throws(() => assert.commandWorked(res));
    assert.throws(() => assert.commandWorkedIgnoringWriteErrors(res));
    assert.doesNotThrow(() => assert.commandFailed(res));
    assert.doesNotThrow(() => assert.commandFailedWithCode(res, 139));
}

rawCommandOk();
rawCommandErr();
rawCommandWriteOk();
rawCommandWriteErr();
collWriteOk();
collWriteErr();
collMultiWriteOk();
collMultiWriteErr();
mapReduceOk();
mapReduceErr();

jsTest.log("end");