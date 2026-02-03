/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
    const email = "geldofa@gmail.com";
    const password = "admin_password";
    const username = "admin";

    try {
        const collection = app.findCollectionByNameOrId("users");

        let record;
        // Try finding by email first
        try {
            record = app.findFirstRecordByData("users", "email", email);
            console.log("Service account found by email.");
        } catch (e) {
            // Try finding by username
            try {
                record = app.findFirstRecordByData("users", "username", username);
                console.log("Service account found by username.");
            } catch (e2) {
                record = new Record(collection);
                record.set("email", email);
                record.set("username", username);
                record.set("password", password);
                record.set("passwordConfirm", password);
                record.set("verified", true);
                console.log("Creating new service account record...");
            }
        }

        record.set("role", "Admin"); // Casing must match: "Admin", "Meestergast", "Operator"
        app.save(record);
        console.log("Service account synchronized successfully with 'Admin' role.");
    } catch (err) {
        console.error("Failed to synchronize service account:", err);
    }
}, (app) => {
    // No-op
});
