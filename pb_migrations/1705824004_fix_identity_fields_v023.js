migrate((app) => {
    const collection = app.findCollectionByNameOrId("users");

    // In PB 0.23, identityFields is under passwordAuth in the options
    collection.passwordAuth.identityFields = ["username", "email"];

    return app.save(collection);
}, (app) => {
    const collection = app.findCollectionByNameOrId("users");
    collection.passwordAuth.identityFields = ["email"];
    return app.save(collection);
})
