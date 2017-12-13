let rst = new ReplSetTest({
    name: 'rs0',
    nodes: 1
});

rst.startSet();
rst.initiate();

let primary = rst.getPrimary();

print("primary on " + primary.host);
print(primary instanceof Mongo);
