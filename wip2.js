function _rawCommandReplyWorked(raw) {
    // response is plain JS object.
    if (raw.ok === 0) {
        return false;
    }

    if (raw.hasOwnProperty("writeErrors") && raw.writeErrors.length > 0) {
        return false;
    }

    return true;
}

assert.commandWorked2 = function(res, msg) {
    if (assert._debug && msg) {
        print("in assert for: " + msg);
    }

    if (typeof(res) !== "object") {
        doassert("unknown response given to commandWorked")
    }

    if (res.constructor === Object) {
        // response is plain JS object
        if (!_rawCommandReplyWorked(res)) {
            doassert("command failed: " + tojson(res) + " : " + msg, res);
        }
    }
    else if (res instanceof WriteResult || res instanceof BulkWriteResult || res instanceof WriteCommandError) {
        assert.writeOK(res, msg);
    }
    else {
        doassert("unknown type of result, cannot check ok: " + tojson(res) + " : " + msg, res);
    }
    return res;
};

assert.commandFailed2 = function(res, msg) {
    if (assert._debug && msg) {
        print("in assert for: " + msg);
    }

    if (typeof(res) !== "object") {
        doassert("unknown response given to commandWorked")
    }

    if (res.constructor === Object) {
        // response is plain JS object
        if (_rawCommandReplyWorked(res)) {
            doassert("command worked when it should have failed: " + tojson(res) + " : " + msg, res);
        }
    }
    else if (res instanceof WriteResult || res instanceof BulkWriteResult || res instanceof WriteCommandError) {
        assert.writeError(res, msg);
    }
    else {
        doassert("unknown type of result, cannot check error: " + tojson(res) + " : " + msg, res);
    }
    return res;
};

// expectedCode can be an array of possible codes
assert.commandFailedWithCode2 = function(res, expectedCode, msg) {
    if (assert._debug && msg) {
        print("in assert for: " + msg);
    }

    if (typeof(res) !== "object") {
        doassert("unknown response given to commandWorked")
    }

    if (res.constructor === Object) {
        if (!Array.isArray(expectedCode)) {
            expectedCode = [expectedCode];
        }
        // response is plain JS object
        if (_rawCommandReplyWorked(res)) {
            doassert("command worked when it should have failed: " + tojson(res) + " : " + msg, res);
        }
        let foundCode = false;
        if (res.hasOwnProperty("code") && expectedCode.indexOf(res.code) !== -1) {
            foundCode = true;
        } else if (res.hasOwnProperty("writeErrors")) {
            foundCode = res.writeErrors.some((err) => expectedCode.indexOf(err.code) !== -1);
        }
        if (!foundCode) {
            doassert("command did not fail with code " + expectedCode + tojson(res) + " : " + msg, res)
        }
    }
    else if (res instanceof WriteResult || res instanceof BulkWriteResult || res instanceof WriteCommandError) {
        assert.writeErrorWithCode(res, expectedCode, msg);
    }
    else {
        doassert("unknown type of result, cannot check error: " + tojson(res) + " : " + msg, res);
    }
    return res;
};

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
    assert.doesNotThrow(() => assert.commandWorked2(res));
    assert.throws(() => assert.commandFailed2(res));
    assert.throws(() => assert.commandFailedWithCode2(res, 0));
}

function rawCommandErr() {
    setup();
    let res = db.runCommand({"IHopeNobodyEverMakesThisACommand": 1});
    assert.throws(() => assert.commandWorked2(res));
    assert.doesNotThrow(() => assert.commandFailed2(res));
    assert.doesNotThrow(() => assert.commandFailedWithCode2(res, 59));
}

function rawCommandWriteOk() {
    setup();
    let res = db.runCommand({insert: "coll", documents: [{_id: 2}]});
    assert.doesNotThrow(() => assert.commandWorked2(res));
    assert.throws(() => assert.commandFailed2(res));
    assert.throws(() => assert.commandFailedWithCode2(res, 0));
}

function rawCommandWriteErr() {
    setup();
    let res = db.runCommand({insert: "coll", documents: [{_id: 1}]});
    assert.throws(() => assert.commandWorked2(res));
    assert.doesNotThrow(() => assert.commandFailed2(res));
    assert.doesNotThrow(() => assert.commandFailedWithCode2(res, 11000));
}

function collWriteOk() {
    setup();
    let res = db.coll.insert({_id: 2});
    assert(res instanceof WriteResult);
    assert.doesNotThrow(() => assert.commandWorked2(res));
    assert.throws(() => assert.commandFailed2(res));
    assert.throws(() => assert.commandFailedWithCode2(res, 0));
}

function collWriteErr() {
    setup();
    let res = db.coll.insert({_id: 1});
    assert(res instanceof WriteResult);
    assert.throws(() => assert.commandWorked2(res));
    assert.doesNotThrow(() => assert.commandFailed2(res));
    assert.doesNotThrow(() => assert.commandFailedWithCode2(res, 11000));
}

function collMultiWriteOk() {
    setup();
    let res = db.coll.insert([{_id: 3}, {_id: 2}]);
    assert(res instanceof BulkWriteResult);
    assert.doesNotThrow(() => assert.commandWorked2(res));
    assert.throws(() => assert.commandFailed2(res));
    assert.throws(() => assert.commandFailedWithCode2(res, 0));
}

function collMultiWriteErr() {
    setup();
    let res = db.coll.insert([{_id: 3}, {_id: 1}]);
    assert(res instanceof BulkWriteResult);
    assert.throws(() => assert.commandWorked2(res));
    assert.doesNotThrow(() => assert.commandFailed2(res));
    assert.doesNotThrow(() => assert.commandFailedWithCode2(res, 11000));
}

rawCommandOk();
rawCommandErr();
rawCommandWriteOk();
rawCommandWriteErr();
collWriteOk();
collWriteErr();
collMultiWriteOk();
collMultiWriteErr();

jsTest.log("end");