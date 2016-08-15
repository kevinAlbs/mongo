// Inserts data for the experimental $skyline stage.
const nPoints = 1000000;
const bufferSize = 5000;
db.coll.drop();
Random.setRandomSeed();
print("");
let buffer = [];

for (let i = 0; i < nPoints; i++) {
    buffer.push({
        x: Random.rand(),
        y: Random.rand(),
        z: Random.rand()
    });

    if (buffer.length >= bufferSize || i == nPoints - 1) {
        db.coll.insert(buffer);
        buffer = [];
        print("\033[1A" + Array(parseInt(50 * i / nPoints)).join("."));
    }
}
print("Inserted " + nPoints + " into db.coll, indexing...");
db.coll.createIndex({x: 1});
print("Index on x created");
print("Test the $skyline stage with db.coll.aggregate({$skyline: {x: 1}})");