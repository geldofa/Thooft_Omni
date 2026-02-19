migrate((app) => {
    const settingsCollection = app.findCollectionByNameOrId("app_settings");
    settingsCollection.listRule = "key = 'testing_mode' || @request.auth.id != ''";
    settingsCollection.viewRule = "key = 'testing_mode' || @request.auth.id != ''";
    app.save(settingsCollection);

    const usersCollection = app.findCollectionByNameOrId("users");
    // Allow public list so Quick Login can show buttons before auth
    // CAUTION: This exposes plain_password if it's stored in a text field
    usersCollection.listRule = "id != '' || @request.auth.id != ''";
    usersCollection.viewRule = "id != '' || @request.auth.id != ''";
    return app.save(usersCollection);
}, (app) => {
    const settingsCollection = app.findCollectionByNameOrId("app_settings");
    settingsCollection.listRule = "";
    settingsCollection.viewRule = "";
    app.save(settingsCollection);

    const usersCollection = app.findCollectionByNameOrId("users");
    usersCollection.listRule = "";
    usersCollection.viewRule = "";
    return app.save(usersCollection);
});
