/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
    console.log("🚀 Starting migration 1742000000_create_email_templates.js (PocketBase 0.23+)");

    const COLLECTION_NAME = "email_templates";
    const COLLECTION_ID = "email_templates01";

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

    // name – required text (bijv. 'Systeem Notificatie')
    const nameField = new TextField({
        name: "name",
        required: true,
    });
    col.fields.add(nameField);

    // subject – required text (het onderwerp van de mail)
    const subjectField = new TextField({
        name: "subject",
        required: true,
    });
    col.fields.add(subjectField);

    // title – text (de grote titel in de mail)
    const titleField = new TextField({
        name: "title",
        required: false,
    });
    col.fields.add(titleField);

    // message – editor (de body van de mail)
    const messageField = new EditorField({
        name: "message",
        required: false,
    });
    col.fields.add(messageField);

    // action_text – text (tekst op de knop)
    const actionTextField = new TextField({
        name: "action_text",
        required: false,
    });
    col.fields.add(actionTextField);

    // action_url – url (link van de knop)
    const actionUrlField = new URLField({
        name: "action_url",
        required: false,
    });
    col.fields.add(actionUrlField);

    // component – text (React Email component naam)
    const componentField = new TextField({
        name: "component",
        required: false,
    });
    col.fields.add(componentField);

    // ────────────────────────────────────────────────────────────────────────────
    // 3. API rules – alle acties vereisen een ingelogde gebruiker
    // ────────────────────────────────────────────────────────────────────────────
    const AUTH_RULE = "@request.auth.id != ''";
    col.listRule = AUTH_RULE;
    col.viewRule = AUTH_RULE;
    col.createRule = AUTH_RULE;
    col.updateRule = AUTH_RULE;
    col.deleteRule = AUTH_RULE;

    app.save(col);
    console.log(`   ✅ Collection '${COLLECTION_NAME}' created successfully.`);

    // ────────────────────────────────────────────────────────────────────────────
    // 4. Seed – voeg een standaard template toe
    // ────────────────────────────────────────────────────────────────────────────
    try {
        app.findFirstRecordByFilter(COLLECTION_NAME, "name = 'Systeem Notificatie'");
        console.log("   - Default template already seeded. Skipping.");
    } catch (_) {
        const templates = app.findCollectionByNameOrId(COLLECTION_NAME);
        const defaultTemplate = new Record(templates);
        defaultTemplate.set("name", "Systeem Notificatie");
        defaultTemplate.set("subject", "[Omni] Nieuwe melding");
        defaultTemplate.set("title", "Je hebt een nieuwe melding");
        defaultTemplate.set("message", "Er is een update beschikbaar in het systeem. Klik op de knop hieronder om de details te bekijken.");
        defaultTemplate.set("action_text", "Bekijk in portaal");
        defaultTemplate.set("action_url", "https://example.com");
        defaultTemplate.set("component", "NotificationEmail");
        app.save(defaultTemplate);
        console.log("   + Seeded default template: 'Systeem Notificatie'.");
    }

    console.log("🏁 Migration 1742000000_create_email_templates.js DONE.");

}, (app) => {
    // ────────────────────────────────────────────────────────────────────────────
    // Rollback: verwijder de collectie (inclusief alle data)
    // ────────────────────────────────────────────────────────────────────────────
    try {
        const col = app.findCollectionByNameOrId("email_templates");
        app.delete(col);
        console.log("↩️  Rolled back: 'email_templates' collection deleted.");
    } catch (_) {
        console.log("↩️  Rollback: 'email_templates' not found, nothing to delete.");
    }
});
