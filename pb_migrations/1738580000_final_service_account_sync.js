/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
    const email = "geldofa@gmail.com";
    const username = "admin";
    const password = "admin_password";

    try {
        const collection = app.findCollectionByNameOrId("users");

        // Find existing record by electronic mail OR by handle
        const records = app.findRecordsByFilter("users", `email = "${email}" || username = "${username}"`, "-created", 1);

        let record;
        if (records.length > 0) {
            record = records[0];
            console.log(`Found existing user record (ID: ${record.id}), updating...`);
        } else {
            record = new Record(collection);
            record.set("email", email);
            record.set("username", username);
            record.set("password", password);
            record.set("passwordConfirm", password);
            record.set("verified", true);
            console.log("Creating fresh service account record...");
        }

        record.set("role", "Admin");
        // Ensure email is set if it was found by username only
        if (!record.get("email")) record.set("email", email);

        app.save(record);
        console.log("Service account successfully synchronized with 'Admin' role.");
    } catch (err) {
        console.error("CRITICAL: Failed final service account sync:", err);
    }
}, (app) => {
    // No-op
});
