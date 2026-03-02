/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
    console.log("🚀 Starting migration: Add multi-press support to ploegen");

    const ploegen = app.findCollectionByNameOrId("ploegen");

    // 1. Add 'presses' JSON field (array of press names, like operatoren)
    const existingPresses = ploegen.fields.getByName("presses");
    if (existingPresses) {
        console.log("   - 'presses' field already exists, skipping.");
    } else {
        console.log("   + Adding 'presses' JSON field...");
        ploegen.fields.add(new JSONField({
            name: "presses",
            required: false,
        }));
    }

    // 2. Add 'active' bool field if missing
    const existingActive = ploegen.fields.getByName("active");
    if (existingActive) {
        console.log("   - 'active' field already exists, skipping.");
    } else {
        console.log("   + Adding 'active' bool field...");
        ploegen.fields.add(new BoolField({
            name: "active",
        }));
    }

    app.save(ploegen);
    console.log("   ✅ Schema updated.");

    // 3. Migrate data: copy existing 'pers' relation values to 'presses' array
    console.log("   🔄 Migrating existing pers relation data to presses array...");
    const records = app.findAllRecords("ploegen");
    let migrated = 0;

    records.forEach(record => {
        const currentPresses = record.get("presses");

        // Only migrate if presses is empty/null (don't overwrite existing data)
        if (!currentPresses || (Array.isArray(currentPresses) && currentPresses.length === 0)) {
            const persId = record.get("pers");
            if (persId) {
                try {
                    const press = app.findRecordById("persen", persId);
                    const pressName = press.get("naam");
                    if (pressName) {
                        record.set("presses", [pressName]);
                        app.save(record);
                        migrated++;
                        console.log(`   + Migrated ploeg "${record.get("naam")}": pers relation → presses ["${pressName}"]`);
                    }
                } catch (e) {
                    console.log(`   ⚠ Could not resolve pers relation for ploeg "${record.get("naam")}": ${e}`);
                }
            }
        }
    });

    // 4. Set active=true for records where it's not set
    records.forEach(record => {
        const active = record.get("active");
        if (active === null || active === undefined || active === "" || active === false) {
            record.set("active", true);
            app.save(record);
        }
    });

    console.log(`   ✅ Migrated ${migrated} ploegen records.`);
    console.log("🏁 Migration complete: ploegen now supports multi-press.");

}, (app) => {
    // Rollback: remove the presses and active fields
    console.log("↩️ Rolling back: removing presses/active fields from ploegen");
    try {
        const ploegen = app.findCollectionByNameOrId("ploegen");
        ploegen.fields.removeByName("presses");
        ploegen.fields.removeByName("active");
        app.save(ploegen);
        console.log("   ✅ Rollback complete.");
    } catch (e) {
        console.error("   ❌ Rollback failed:", e);
    }
});
