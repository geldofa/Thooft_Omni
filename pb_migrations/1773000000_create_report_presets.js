/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
    console.log("🚀 Starting migration 1773000000_create_report_presets.js");

    const COLLECTION_NAME = "report_presets";
    const COLLECTION_ID = "report_pres01";

    // ────────────────────────────────────────────────────────────────────────────
    // 1. Guard: skip if the collection already exists
    // ────────────────────────────────────────────────────────────────────────────
    try {
        app.findCollectionByNameOrId(COLLECTION_NAME);
        console.log(`   - Collection '${COLLECTION_NAME}' already exists. Skipping.`);
        return;
    } catch (_) {
        // Not found → continue to create
    }

    // ────────────────────────────────────────────────────────────────────────────
    // 2. Create the collection
    // ────────────────────────────────────────────────────────────────────────────
    const col = new Collection({
        id: COLLECTION_ID,
        name: COLLECTION_NAME,
        type: "base",
    });

    // name (type: text, required: true)
    col.fields.add(new TextField({
        name: "name",
        required: true,
    }));

    // description (type: text)
    col.fields.add(new TextField({
        name: "description",
        required: false,
    }));

    // report_type (type: text)
    col.fields.add(new TextField({
        name: "report_type",
        required: true,
    }));

    // settings (type: json)
    col.fields.add(new JSONField({
        name: "settings",
        required: false,
    }));

    // is_automated (type: bool)
    col.fields.add(new BoolField({
        name: "is_automated",
        required: false,
    }));

    // email_recipients (type: text)
    col.fields.add(new TextField({
        name: "email_recipients",
        required: false,
    }));

    // ────────────────────────────────────────────────────────────────────────────
    // 3. API rules
    // ────────────────────────────────────────────────────────────────────────────
    const AUTH_RULE = "@request.auth.id != \"\"";
    col.listRule = AUTH_RULE;
    col.viewRule = AUTH_RULE;
    col.createRule = AUTH_RULE;
    col.updateRule = AUTH_RULE;
    col.deleteRule = AUTH_RULE;

    app.save(col);
    console.log(`   ✅ Collection '${COLLECTION_NAME}' created successfully.`);
    console.log("🏁 Migration 1773000000_create_report_presets.js DONE.");

}, (app) => {
    // ────────────────────────────────────────────────────────────────────────────
    // Rollback: delete the collection
    // ────────────────────────────────────────────────────────────────────────────
    try {
        const col = app.findCollectionByNameOrId("report_presets");
        app.delete(col);
        console.log("↩️  Rolled back: 'report_presets' collection deleted.");
    } catch (_) {
        console.log("↩️  Rollback: 'report_presets' not found, nothing to delete.");
    }
});
