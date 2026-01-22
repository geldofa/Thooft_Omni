migrate((app) => {
    const collection = app.findCollectionByNameOrId("users");

    collection.listRule = "";
    collection.viewRule = "";

    app.save(collection);
}, (app) => {
    const collection = app.findCollectionByNameOrId("users");

    collection.listRule = "@request.auth.id != ''";
    collection.viewRule = "@request.auth.id != ''";

    app.save(collection);
})
