/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
    console.log("🚀 Starting migration 1772000000_create_report_configs.js");

    const COLLECTION_NAME = "report_configs";
    const COLLECTION_ID = "report_configs01";

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

    // name (type: text, required: true) - bijv. 'Wekelijks Onderhoud Lithoman'
    col.fields.add(new TextField({
        name: "name",
        required: true,
    }));

    // description (type: text) - Korte uitleg voor de gebruiker op de kaart
    col.fields.add(new TextField({
        name: "description",
        required: false,
    }));

    // report_type (type: text, required: true) - Om te bepalen welke component geladen moet worden
    col.fields.add(new TextField({
        name: "report_type",
        required: true,
    }));

    // settings (type: json, default: {}) - Dit veld bevat ALLE specifieke filters en instellingen
    col.fields.add(new JSONField({
        name: "settings",
        required: false,
    }));

    // ────────────────────────────────────────────────────────────────────────────
    // 3. API rules – alle acties vereisen een ingelogde gebruiker
    // ────────────────────────────────────────────────────────────────────────────
    const AUTH_RULE = "@request.auth.id != \"\"";
    col.listRule = AUTH_RULE;
    col.viewRule = AUTH_RULE;
    col.createRule = AUTH_RULE;
    col.updateRule = AUTH_RULE;
    col.deleteRule = AUTH_RULE;

    app.save(col);
    console.log(`   ✅ Collection '${COLLECTION_NAME}' created successfully.`);
    console.log("🏁 Migration 1772000000_create_report_configs.js DONE.");

}, (app) => {
    // ────────────────────────────────────────────────────────────────────────────
    // Rollback: verwijder de collectie
    // ────────────────────────────────────────────────────────────────────────────
    try {
        const col = app.findCollectionByNameOrId("report_configs");
        app.delete(col);
        console.log("↩️  Rolled back: 'report_configs' collection deleted.");
    } catch (_) {
        console.log("↩️  Rollback: 'report_configs' not found, nothing to delete.");
    }
});
