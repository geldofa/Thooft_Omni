/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
    console.log("🚀 Starting migration 1740510000_create_app_themes.js (PocketBase 0.23+)");

    const COLLECTION_NAME = "app_themes";
    const COLLECTION_ID = "app_themes000001";

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

    // theme_name – required text
    const themeNameField = new TextField({
        name: "theme_name",
        required: true,
    });
    col.fields.add(themeNameField);

    // is_active – boolean, default false
    const isActiveField = new BoolField({
        name: "is_active",
        required: false,
    });
    col.fields.add(isActiveField);

    // primary_color – text, default '#2563eb'
    const primaryColorField = new TextField({
        name: "primary_color",
        required: false,
    });
    col.fields.add(primaryColorField);

    // background_color – text, default '#ffffff'
    const backgroundColorField = new TextField({
        name: "background_color",
        required: false,
    });
    col.fields.add(backgroundColorField);

    // text_color – text, default '#0f172a'
    const textColorField = new TextField({
        name: "text_color",
        required: false,
    });
    col.fields.add(textColorField);

    // logo – file field, optional (max 1 file, common image MIME types)
    const logoField = new FileField({
        name: "logo",
        required: false,
        maxSelect: 1,
        mimeTypes: ["image/jpeg", "image/png", "image/svg+xml", "image/gif", "image/webp"],
    });
    col.fields.add(logoField);

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
    // 4. Seed – voeg één standaard thema toe
    // ────────────────────────────────────────────────────────────────────────────
    try {
        app.findFirstRecordByFilter(COLLECTION_NAME, "theme_name = 'Default'");
        console.log("   - Default theme already seeded. Skipping.");
    } catch (_) {
        const themes = app.findCollectionByNameOrId(COLLECTION_NAME);
        const defaultTheme = new Record(themes);
        defaultTheme.set("theme_name", "Default");
        defaultTheme.set("is_active", true);
        defaultTheme.set("primary_color", "#2563eb");
        defaultTheme.set("background_color", "#ffffff");
        defaultTheme.set("text_color", "#0f172a");
        app.save(defaultTheme);
        console.log("   + Seeded default theme.");
    }

    console.log("🏁 Migration 1740510000_create_app_themes.js DONE.");

}, (app) => {
    // ────────────────────────────────────────────────────────────────────────────
    // Rollback: verwijder de collectie (inclusief alle data)
    // ────────────────────────────────────────────────────────────────────────────
    try {
        const col = app.findCollectionByNameOrId("app_themes");
        app.delete(col);
        console.log("↩️  Rolled back: 'app_themes' collection deleted.");
    } catch (_) {
        console.log("↩️  Rollback: 'app_themes' not found, nothing to delete.");
    }
});
