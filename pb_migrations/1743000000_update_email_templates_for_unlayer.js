/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
    console.log("🚀 Starting migration 1743000000_update_email_templates_for_unlayer.js (PocketBase 0.23+)");

    const COLLECTION_NAME = "email_templates";

    // ────────────────────────────────────────────────────────────────────────────
    // 1. Find the collection
    // ────────────────────────────────────────────────────────────────────────────
    let col;
    try {
        col = app.findCollectionByNameOrId(COLLECTION_NAME);
    } catch (_) {
        console.log(`   ⚠️ Collection '${COLLECTION_NAME}' not found. Run the create migration first.`);
        return;
    }

    // ────────────────────────────────────────────────────────────────────────────
    // 2. Remove old fields (title, message, action_text, action_url, component)
    // ────────────────────────────────────────────────────────────────────────────
    const fieldsToRemove = ["title", "message", "action_text", "action_url", "component"];

    for (const fieldName of fieldsToRemove) {
        const field = col.fields.find((f) => f.name === fieldName);
        if (field) {
            col.fields.removeById(field.id);
            console.log(`   - Removed field '${fieldName}'.`);
        } else {
            console.log(`   - Field '${fieldName}' not found, skipping removal.`);
        }
    }

    // ────────────────────────────────────────────────────────────────────────────
    // 3. Add new fields for Unlayer
    // ────────────────────────────────────────────────────────────────────────────

    // design – JSON (het ruwe Unlayer design object)
    const existingDesign = col.fields.find((f) => f.name === "design");
    if (!existingDesign) {
        const designField = new JSONField({
            name: "design",
            required: false,
            maxSize: 5000000, // 5 MB — Unlayer designs can be large
        });
        col.fields.add(designField);
        console.log("   + Added field 'design' (JSON).");
    } else {
        console.log("   - Field 'design' already exists. Skipping.");
    }

    // html_content – editor (de geëxporteerde HTML)
    const existingHtml = col.fields.find((f) => f.name === "html_content");
    if (!existingHtml) {
        const htmlField = new EditorField({
            name: "html_content",
            required: false,
        });
        col.fields.add(htmlField);
        console.log("   + Added field 'html_content' (editor).");
    } else {
        console.log("   - Field 'html_content' already exists. Skipping.");
    }

    // ────────────────────────────────────────────────────────────────────────────
    // 4. Save changes
    // ────────────────────────────────────────────────────────────────────────────
    app.save(col);
    console.log(`   ✅ Collection '${COLLECTION_NAME}' updated for Unlayer.`);
    console.log("🏁 Migration 1743000000_update_email_templates_for_unlayer.js DONE.");

}, (app) => {
    // ────────────────────────────────────────────────────────────────────────────
    // Rollback: re-add removed fields, remove new fields
    // ────────────────────────────────────────────────────────────────────────────
    const COLLECTION_NAME = "email_templates";

    let col;
    try {
        col = app.findCollectionByNameOrId(COLLECTION_NAME);
    } catch (_) {
        console.log("↩️  Rollback: collection not found, nothing to do.");
        return;
    }

    // Remove new fields
    const newFields = ["design", "html_content"];
    for (const fieldName of newFields) {
        const field = col.fields.find((f) => f.name === fieldName);
        if (field) {
            col.fields.removeById(field.id);
            console.log(`   ↩️ Removed field '${fieldName}'.`);
        }
    }

    // Re-add old fields
    col.fields.add(new TextField({ name: "title", required: false }));
    col.fields.add(new EditorField({ name: "message", required: false }));
    col.fields.add(new TextField({ name: "action_text", required: false }));
    col.fields.add(new URLField({ name: "action_url", required: false }));
    col.fields.add(new TextField({ name: "component", required: false }));

    app.save(col);
    console.log("↩️  Rolled back: old fields restored, new fields removed.");
});
