migrate((app) => {
    const collection = app.findCollectionByNameOrId("categorieen");
    console.log("SCHEMA DEBUG - Collection: " + collection.name);
    collection.fields.forEach(f => {
        console.log("FIELD: " + f.name + " (Type: " + f.type + ")");
    });
}, (app) => {
});
