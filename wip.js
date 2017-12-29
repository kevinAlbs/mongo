assert.commandWorked2 = function(res, msg) {
    if (assert._debug && msg)
        print("in assert for: " + msg);

    let failed = false;

    if (typeof(res) === "object" && !res.prototype) {
        // response is plain JS object.
        if (res.ok == 0) {
            failed = true;
        }

        if (res.hasOwnProperty("writeErrors") && res.writeErrors.length > 0) {
            failed = true;
        }

        if (failed) {
            doassert("command failed: " + tojson(res) + " : " + msg, res);
        }
    }

    return res;
};

// Test out a variety of different failure cases.

// Raw command responses.

let simpleSuccessRaw = db.runCommand({"ping": 1});
assert.doesNotThrow(() => assert.commandWorked2(simpleSuccessRaw));
let simpleFailureRaw = db.runCommand({"IHopeNobodyEverMakesThisACommand": 1});
assert.throws(() => assert.commandWorked2(simpleFailureResponse));