migrate((app) => {
    const collection = app.findCollectionByNameOrId("onderhoud");

    collection.fields.add(new RelationField({
        "name": "tags",
        "collectionId": "tags00000000001",
        "cascadeDelete": false,
        "minSelect": 0,
        "maxSelect": null,
        "presentable": false
    }));

    return app.save(collection);
}, (app) => {
    const collection = app.findCollectionByNameOrId("onderhoud");
    collection.fields.removeByName("tags");
    return app.save(collection);
})
