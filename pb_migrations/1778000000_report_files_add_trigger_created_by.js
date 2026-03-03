/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
    console.log("🚀 Starting migration: Add trigger & created_by fields to report_files");

    const col = app.findCollectionByNameOrId("report_files");

    // 1. Add 'trigger' text field — "manual" or "auto"
    const existingTrigger = col.fields.getByName("trigger");
    if (existingTrigger) {
        console.log("   - 'trigger' field already exists, skipping.");
    } else {
        console.log("   + Adding 'trigger' text field...");
        col.fields.add(new TextField({
            name: "trigger",
            required: false,
        }));
    }

    // 2. Add 'created_by' text field — stores user display name for manual triggers
    const existingCreatedBy = col.fields.getByName("created_by");
    if (existingCreatedBy) {
        console.log("   - 'created_by' field already exists, skipping.");
    } else {
        console.log("   + Adding 'created_by' text field...");
        col.fields.add(new TextField({
            name: "created_by",
            required: false,
        }));
    }

    app.save(col);
    console.log("   ✅ report_files schema updated.");
    console.log("🏁 Migration complete.");

}, (app) => {
    console.log("↩️ Rolling back: removing trigger/created_by from report_files");
    try {
        const col = app.findCollectionByNameOrId("report_files");
        col.fields.removeByName("trigger");
        col.fields.removeByName("created_by");
        app.save(col);
        console.log("   ✅ Rollback complete.");
    } catch (e) {
        console.error("   ❌ Rollback failed:", e);
    }
});
