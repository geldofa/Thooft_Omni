/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
    console.log("🚀 Starting migration: Add mailing fields to report_files");

    const col = app.findCollectionByNameOrId("report_files");

    // 1. email_status: 'sent', 'failed', 'none'
    if (!col.fields.getByName("email_status")) {
        console.log("   + Adding 'email_status' field...");
        col.fields.add(new TextField({
            name: "email_status",
            required: false,
        }));
    }

    // 2. email_recipients: actual recipients used
    if (!col.fields.getByName("email_recipients")) {
        console.log("   + Adding 'email_recipients' field...");
        col.fields.add(new TextField({
            name: "email_recipients",
            required: false,
        }));
    }

    // 3. email_error: for failure details
    if (!col.fields.getByName("email_error")) {
        console.log("   + Adding 'email_error' field...");
        col.fields.add(new TextField({
            name: "email_error",
            required: false,
        }));
    }

    app.save(col);
    console.log("   ✅ report_files schema updated with mailing fields.");

}, (app) => {
    try {
        const col = app.findCollectionByNameOrId("report_files");
        col.fields.removeByName("email_status");
        col.fields.removeByName("email_recipients");
        col.fields.removeByName("email_error");
        app.save(col);
    } catch (e) { }
});
