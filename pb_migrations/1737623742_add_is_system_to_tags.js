migrate((app) => {
    const collection = app.findCollectionByNameOrId("tags");

    console.log("Applying migration: adding system_managed to tags");

    collection.fields.add(new BoolField({
        "name": "system_managed",
        "required": false,
        "presentable": false
    }));

    return app.save(collection);
}, (app) => {
    const collection = app.findCollectionByNameOrId("tags");

    collection.fields.removeByName("system_managed");

    return app.save(collection);
})
