migrate((app) => {
    const collection = app.findCollectionByNameOrId("users");

    // Allow public listing and viewing so Quick Login can fetch accounts/passwords
    // NOTE: This should only be used in a trusted/testing environment.
    collection.listRule = "";
    collection.viewRule = "";

    return app.save(collection);
}, (app) => {
    const collection = app.findCollectionByNameOrId("users");

    // Revert to authenticated-only
    collection.listRule = "@request.auth.id != ''";
    collection.viewRule = "@request.auth.id != ''";

    return app.save(collection);
})
