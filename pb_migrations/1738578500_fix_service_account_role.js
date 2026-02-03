/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
    const email = "geldofa@gmail.com";

    try {
        const record = app.findFirstRecordByData("users", "email", email);
        if (record) {
            record.set("role", "Admin"); // Casing must match collection allowed values: "Admin", "Meestergast", "Operator"
            app.save(record);
            console.log("Service account role updated to 'Admin'.");
        } else {
            console.warn("Service account not found to update.");
        }
    } catch (err) {
        console.error("Failed to update service account role:", err);
    }
}, (app) => {
    // No-op
});
