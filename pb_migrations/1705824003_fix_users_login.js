/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
    const collection = app.findCollectionByNameOrId("users");

    // Copy options to a local variable to be safe
    let options = collection.options;
    if (!options) {
        options = {};
    }

    // Initialize passwordAuth if missing
    if (!options.passwordAuth) {
        options.passwordAuth = {};
    }

    // Set identityFields to allow both username and email
    options.passwordAuth.identityFields = ["username", "email"];

    // Explicitly set verified if missing (to ensure no blocking)
    // Actually, verification requirement is separate option: requireEmailVerification
    if (typeof options.requireEmailVerification === 'undefined') {
        options.requireEmailVerification = false;
    }

    // Reassign options back to ensure update
    collection.options = options;

    app.save(collection);
}, (app) => {
    // Revert to email only (if needed)
    try {
        const collection = app.findCollectionByNameOrId("users");
        let options = collection.options || {};
        if (options.passwordAuth) {
            options.passwordAuth.identityFields = ["email"];
        }
        collection.options = options;
        app.save(collection);
    } catch (e) { }
})
