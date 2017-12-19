// TestData.skipCheckDBHashes = true;
var rst = new ReplSetTest({n: 2});
rst.startSet();

print("started");
rst.stopSet();