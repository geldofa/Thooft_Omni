
migrate((app) => {
    // 1. Update app_settings to ensure testing_mode is public
    const settingsCollection = app.findCollectionByNameOrId("app_settings");
    settingsCollection.listRule = "key = 'testing_mode' || @request.auth.id != ''";
    settingsCollection.viewRule = "key = 'testing_mode' || @request.auth.id != ''";
    app.save(settingsCollection);

    // 2. Update users to allow public listing for Quick Login
    // CAUTION: This makes user data (including plain_password) public via API
    const usersCollection = app.findCollectionByNameOrId("users");
    usersCollection.listRule = "id != ''"; // Always true, allows public listing
    usersCollection.viewRule = "id != ''"; // Always true, allows public view
    return app.save(usersCollection);
}, (app) => {
    // No rollback needed for this debug fix
    return null;
});
