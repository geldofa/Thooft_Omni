/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
    // We try to get credentials from environment variables if possible, 
    // but in JS hooks/migrations environment variables might not be directly accessible 
    // unless passed through certain ways. 
    // However, we can use the same email we know is used.

    const email = "geldofa@gmail.com"; // Based on logs seen earlier
    const password = "admin_password"; // Placeholder or we could try to find it

    try {
        const collection = app.findCollectionByNameOrId("users");

        // Check if user already exists
        try {
            const existing = app.findFirstRecordByData("users", "email", email);
            if (existing) {
                console.log("Service account already exists in users collection.");
                return;
            }
        } catch (e) {
            // Not found, proceed
        }

        const record = new Record(collection);
        record.set("email", email);
        record.set("username", "admin");
        record.set("password", password);
        record.set("passwordConfirm", password);
        record.set("role", "admin");
        record.set("verified", true);

        app.save(record);
        console.log("Service account created successfully in users collection.");
    } catch (err) {
        console.error("Failed to create service account:", err);
    }
}, (app) => {
    // Down migration: remove the user if we want, but usually safer to keep
});
