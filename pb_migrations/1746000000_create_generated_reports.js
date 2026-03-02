/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
    console.log("🚀 Starting migration 1746000000_create_generated_reports.js");

    const COLLECTION_NAME = "generated_reports";
    const COLLECTION_ID = "generated_reps01";

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

    // title (type: text, required: true) - Bijv. 'Onderhoud Nu Nodig - Lithoman'
    col.fields.add(new TextField({
        name: "title",
        required: true,
    }));

    // report_type (type: text) - Bijv. 'taken', 'drukwerken'
    col.fields.add(new TextField({
        name: "report_type",
        required: false,
    }));

    // trigger_type (type: text) - 'M' voor Manueel, 'A' voor Auto
    col.fields.add(new TextField({
        name: "trigger_type",
        required: false,
    }));

    // document (type: file, required: true, maxSelect: 1, mimeTypes: ['application/pdf'])
    col.fields.add(new FileField({
        name: "document",
        required: true,
        maxSelect: 1,
        mimeTypes: ["application/pdf"],
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
    console.log("🏁 Migration 1746000000_create_generated_reports.js DONE.");

}, (app) => {
    // ────────────────────────────────────────────────────────────────────────────
    // Rollback: verwijder de collectie
    // ────────────────────────────────────────────────────────────────────────────
    try {
        const col = app.findCollectionByNameOrId("generated_reports");
        app.delete(col);
        console.log("↩️  Rolled back: 'generated_reports' collection deleted.");
    } catch (_) {
        console.log("↩️  Rollback: 'generated_reports' not found, nothing to delete.");
    }
});
