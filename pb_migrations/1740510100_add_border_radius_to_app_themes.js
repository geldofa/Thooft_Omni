/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
    console.log("🚀 Migration 1740420000_add_border_radius_to_app_themes.js (PocketBase 0.23+)");

    try {
        const col = app.findCollectionByNameOrId("app_themes");

        // Guard: skip if field already exists
        try {
            col.fields.getByName("border_radius");
            console.log("   - Field 'border_radius' already exists. Skipping.");
            return;
        } catch (_) {
            // Field not found → add it
        }

        col.fields.add(new TextField({
            name: "border_radius",
            required: false,
        }));

        app.save(col);
        console.log("   ✅ Field 'border_radius' added to 'app_themes'.");

        // Seed default value on any existing records that have no border_radius set
        try {
            const records = app.findRecordsByFilter("app_themes", "border_radius = ''", "-created", 0, 0);
            records.forEach(r => {
                r.set("border_radius", "0.5rem");
                app.save(r);
            });
            if (records.length > 0) {
                console.log(`   ✅ Seeded default border_radius on ${records.length} existing records.`);
            }
        } catch (e) {
            console.warn("   ⚠️  Could not seed existing records:", e);
        }

        console.log("🏁 Migration 1740420000 DONE.");
    } catch (e) {
        console.error("❌ Migration failed:", e);
        throw e;
    }

}, (app) => {
    // Rollback: remove the field
    try {
        const col = app.findCollectionByNameOrId("app_themes");
        const field = col.fields.getByName("border_radius");
        col.fields.remove(field);
        app.save(col);
        console.log("↩️  Rolled back: 'border_radius' removed from 'app_themes'.");
    } catch (_) {
        console.log("↩️  Rollback: field not found, nothing to remove.");
    }
});
