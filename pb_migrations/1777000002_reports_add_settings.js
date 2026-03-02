/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
    console.log("🚀 Starting migration: Add description & settings fields to maintenance_reports");

    const col = app.findCollectionByNameOrId("maintenance_reports");

    // 1. Add 'description' text field
    const existingDesc = col.fields.getByName("description");
    if (existingDesc) {
        console.log("   - 'description' field already exists, skipping.");
    } else {
        console.log("   + Adding 'description' text field...");
        col.fields.add(new TextField({
            name: "description",
            required: false,
        }));
    }

    // 2. Add 'settings' JSON field (stores selectedPress, selectedPeriod, selectedStatus, etc.)
    const existingSettings = col.fields.getByName("settings");
    if (existingSettings) {
        console.log("   - 'settings' field already exists, skipping.");
    } else {
        console.log("   + Adding 'settings' JSON field...");
        col.fields.add(new JSONField({
            name: "settings",
            required: false,
        }));
    }

    // 3. Make 'period' field not required (we store the actual period in settings)
    const periodField = col.fields.getByName("period");
    if (periodField) {
        console.log("   ~ Updating 'period' field to not required...");
        periodField.required = false;
        // Add all possible period values
        periodField.values = ["day", "week", "month", "year", "Alles overtijd", "> 6 maanden", "> 1 jaar", "Deze Week", "14 Dagen", "Deze Maand", "Vandaag", "Gisteren", "Vorige Week", "Vorige Maand", "Dit Jaar", "Vorig Jaar"];
    }

    app.save(col);
    console.log("   ✅ maintenance_reports schema updated.");
    console.log("🏁 Migration complete.");

}, (app) => {
    console.log("↩️ Rolling back: removing description/settings from maintenance_reports");
    try {
        const col = app.findCollectionByNameOrId("maintenance_reports");
        col.fields.removeByName("description");
        col.fields.removeByName("settings");
        app.save(col);
        console.log("   ✅ Rollback complete.");
    } catch (e) {
        console.error("   ❌ Rollback failed:", e);
    }
});
