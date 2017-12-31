// Examples of different errors.

function setup() {
    db = db.getSiblingDB("ex");
    db.dropDatabase();
    db.coll.drop();
    db.coll.insert({_id: 1});
    try { throw new Error(); } catch(e) {
        let line = e.stack.split("\n")[1]; // Error.stack is Moz specific.
        let fn = line.substring(0, line.indexOf("@"));
        print("===" + fn + "===");
    }
}

// Raw commands.
function rawCommandWriteOk() {
    setup();
    let res = db.runCommand({insert: "coll", documents: [{_id: 2}]});
    printjson(res);
}

function rawCommandWriteErr() {
    setup();
    let res = db.runCommand({insert: "coll", documents: [{_id: 1}]});
    printjson(res);
}

// DBCollection.insert
function collInsertOk() {
    setup();
    let res = db.coll.insert({_id: 2});
    print(res.toString());
}

function collInsertErr() {
    setup();
    let res = db.coll.insert({_id: 1});
    print(res.toString());
}

// Bulk API
function bulkInsertOk() {
    setup();
    let bulk = db.coll.initializeUnorderedBulkOp();
    bulk.insert({_id: 2});
    let res = bulk.execute();
    print(res.toString());
}

function bulkInsertErr() {
    setup();
    let bulk = db.coll.initializeUnorderedBulkOp();
    bulk.insert({_id: 1});
    try {
        bulk.execute();
    } catch(res) {
        print("caught exception:");
        print(res.toString());
    }
}

function crudInsert() {
    setup();
    try {
        // Implemented in terms of bulk op, so has same behavior.
        db.coll.insertOne({_id: 1});
    } catch(res) {
        print("caught exception:");
        print(res.toString());
    }
}

// DBCollection.bulkWrite


rawCommandWriteOk();
rawCommandWriteErr();
collInsertOk();
collInsertErr();
bulkInsertOk();
bulkInsertErr();
crudInsert();