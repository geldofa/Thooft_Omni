migrate((app) => {
    const collection = app.findCollectionByNameOrId("tags");

    collection.listRule = "@request.auth.id != \"\"";
    collection.viewRule = "@request.auth.id != \"\"";
    collection.createRule = "@request.auth.id != \"\"";
    collection.updateRule = "@request.auth.id != \"\"";
    collection.deleteRule = "@request.auth.id != \"\"";

    return app.save(collection);
})
