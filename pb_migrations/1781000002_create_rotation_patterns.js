/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
    console.log("🚀 Starting migration: Create rotation_patterns collection");

    let rotationPatterns;
    try {
        rotationPatterns = app.findCollectionByNameOrId("rotation_patterns");
        console.log("   - 'rotation_patterns' already exists, updating...");
    } catch (_) {
        console.log("   + Creating 'rotation_patterns' collection...");
        rotationPatterns = new Collection({
            id: "pbc_rotation_patterns",
            name: "rotation_patterns",
            type: "base",
        });
    }

    if (!rotationPatterns.fields.getByName("naam")) {
        rotationPatterns.fields.add(new TextField({
            name: "naam",
            required: true,
        }));
        console.log("   + Added 'naam' field");
    }

    if (!rotationPatterns.fields.getByName("pers")) {
        rotationPatterns.fields.add(new TextField({
            name: "pers",
            required: true,
        }));
        console.log("   + Added 'pers' field");
    }

    if (!rotationPatterns.fields.getByName("weken")) {
        rotationPatterns.fields.add(new NumberField({
            name: "weken",
            required: true,
            min: 1,
            max: 12,
        }));
        console.log("   + Added 'weken' field");
    }

    // patroon: JSON with week-indexed shift/team assignments
    // Structure: { "1": { "shifts": [{ "ploegType": "06-14", "teamId": "..." }, ...] }, "2": { ... } }
    if (!rotationPatterns.fields.getByName("patroon")) {
        rotationPatterns.fields.add(new JSONField({
            name: "patroon",
            required: true,
        }));
        console.log("   + Added 'patroon' field (JSON)");
    }

    if (!rotationPatterns.fields.getByName("start_datum")) {
        rotationPatterns.fields.add(new DateField({
            name: "start_datum",
            required: true,
        }));
        console.log("   + Added 'start_datum' field");
    }

    if (!rotationPatterns.fields.getByName("actief")) {
        rotationPatterns.fields.add(new BoolField({
            name: "actief",
        }));
        console.log("   + Added 'actief' field");
    }

    // Everyone can read, only admin can write
    rotationPatterns.listRule = "@request.auth.id != ''";
    rotationPatterns.viewRule = "@request.auth.id != ''";
    rotationPatterns.createRule = "@request.auth.role = 'Admin'";
    rotationPatterns.updateRule = "@request.auth.role = 'Admin'";
    rotationPatterns.deleteRule = "@request.auth.role = 'Admin'";

    rotationPatterns.indexes = [
        "CREATE INDEX `idx_rotation_patterns_pers_actief` ON `rotation_patterns` (`pers`, `actief`)",
    ];

    app.save(rotationPatterns);
    console.log("   ✅ rotation_patterns created/updated");
    console.log("🏁 Migration complete: rotation_patterns");

}, (app) => {
    console.log("↩️ Rolling back: removing rotation_patterns");
    try {
        const col = app.findCollectionByNameOrId("rotation_patterns");
        app.delete(col);
        console.log("   ✅ Deleted rotation_patterns");
    } catch (e) {
        console.warn("   ⚠ rotation_patterns not found:", e);
    }
});
