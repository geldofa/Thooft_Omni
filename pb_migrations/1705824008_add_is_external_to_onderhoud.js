migrate((app) => {
    const collection = app.findCollectionByNameOrId("onderhoud");

    collection.fields.add(new BoolField({
        "name": "is_external",
    }));

    return app.save(collection);
}, (app) => {
    const collection = app.findCollectionByNameOrId("onderhoud");

    collection.fields.removeByName("is_external");

    return app.save(collection);
})
