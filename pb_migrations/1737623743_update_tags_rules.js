migrate((app) => {
    const collection = app.findCollectionByNameOrId("tags");

    // Allow anyone to read tags, but restrict creation to authenticated users (including superusers who skip rules)
    // Actually, setting it to empty allows anyone if the request is not authenticated.
    // Superusers always skip rules, but if the rule is specified, PB checks it against the auth model.
    // In PB 0.23, superusers are NOT record auth models.

    collection.listRule = "";
    collection.viewRule = "";
    collection.createRule = "";
    collection.updateRule = "";
    collection.deleteRule = "";

    return app.save(collection);
})
