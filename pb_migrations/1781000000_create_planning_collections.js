/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
    console.log("🚀 Starting migration: Create planning_dagen and planning_opmerkingen collections");

    // ══════════════════════════════════════════════════════════════════════════
    // 1. planning_dagen — One record per day per press, with shifts as JSON
    // ══════════════════════════════════════════════════════════════════════════

    let planningDagen;
    try {
        planningDagen = app.findCollectionByNameOrId("planning_dagen");
        console.log("   - 'planning_dagen' already exists, updating...");
    } catch (_) {
        console.log("   + Creating 'planning_dagen' collection...");
        planningDagen = new Collection({
            id: "pbc_planning_dagen",
            name: "planning_dagen",
            type: "base",
        });
    }

    // Add fields if missing
    if (!planningDagen.fields.getByName("datum")) {
        planningDagen.fields.add(new DateField({
            name: "datum",
            required: true,
        }));
        console.log("   + Added 'datum' field");
    }

    if (!planningDagen.fields.getByName("pers")) {
        planningDagen.fields.add(new TextField({
            name: "pers",
            required: true,
        }));
        console.log("   + Added 'pers' field");
    }

    if (!planningDagen.fields.getByName("overrides")) {
        planningDagen.fields.add(new JSONField({
            name: "overrides",
            required: true,
        }));
        console.log("   + Added 'overrides' field (JSON)");
    }

    // Access rules: all authenticated users can read, all can write (permission check in frontend)
    planningDagen.listRule = "@request.auth.id != ''";
    planningDagen.viewRule = "@request.auth.id != ''";
    planningDagen.createRule = "@request.auth.id != ''";
    planningDagen.updateRule = "@request.auth.id != ''";
    planningDagen.deleteRule = "@request.auth.id != ''";

    // Unique index on datum + pers
    planningDagen.indexes = [
        "CREATE UNIQUE INDEX `idx_planning_dagen_datum_pers` ON `planning_dagen` (`datum`, `pers`)",
        "CREATE INDEX `idx_planning_dagen_datum` ON `planning_dagen` (`datum`)",
    ];

    app.save(planningDagen);
    console.log("   ✅ planning_dagen created/updated");

    // ══════════════════════════════════════════════════════════════════════════
    // 2. planning_opmerkingen — Notes per shift type per press per week
    // ══════════════════════════════════════════════════════════════════════════

    let planningOpmerkingen;
    try {
        planningOpmerkingen = app.findCollectionByNameOrId("planning_opmerkingen");
        console.log("   - 'planning_opmerkingen' already exists, updating...");
    } catch (_) {
        console.log("   + Creating 'planning_opmerkingen' collection...");
        planningOpmerkingen = new Collection({
            id: "pbc_planning_opmerkingen",
            name: "planning_opmerkingen",
            type: "base",
        });
    }

    if (!planningOpmerkingen.fields.getByName("pers")) {
        planningOpmerkingen.fields.add(new TextField({
            name: "pers",
            required: true,
        }));
        console.log("   + Added 'pers' field");
    }

    if (!planningOpmerkingen.fields.getByName("ploeg_type")) {
        planningOpmerkingen.fields.add(new TextField({
            name: "ploeg_type",
            required: true,
        }));
        console.log("   + Added 'ploeg_type' field");
    }

    if (!planningOpmerkingen.fields.getByName("week_start")) {
        planningOpmerkingen.fields.add(new DateField({
            name: "week_start",
            required: true,
        }));
        console.log("   + Added 'week_start' field");
    }

    if (!planningOpmerkingen.fields.getByName("tekst")) {
        planningOpmerkingen.fields.add(new TextField({
            name: "tekst",
            required: false,
        }));
        console.log("   + Added 'tekst' field");
    }

    planningOpmerkingen.listRule = "@request.auth.id != ''";
    planningOpmerkingen.viewRule = "@request.auth.id != ''";
    planningOpmerkingen.createRule = "@request.auth.id != ''";
    planningOpmerkingen.updateRule = "@request.auth.id != ''";
    planningOpmerkingen.deleteRule = "@request.auth.id != ''";

    planningOpmerkingen.indexes = [
        "CREATE UNIQUE INDEX `idx_planning_opm_key` ON `planning_opmerkingen` (`pers`, `ploeg_type`, `week_start`)",
    ];

    app.save(planningOpmerkingen);
    console.log("   ✅ planning_opmerkingen created/updated");

    console.log("🏁 Migration complete: planning_dagen + planning_opmerkingen");

}, (app) => {
    console.log("↩️ Rolling back: removing planning_dagen and planning_opmerkingen");
    try {
        const col1 = app.findCollectionByNameOrId("planning_dagen");
        app.delete(col1);
        console.log("   ✅ Deleted planning_dagen");
    } catch (e) {
        console.warn("   ⚠ planning_dagen not found:", e);
    }
    try {
        const col2 = app.findCollectionByNameOrId("planning_opmerkingen");
        app.delete(col2);
        console.log("   ✅ Deleted planning_opmerkingen");
    } catch (e) {
        console.warn("   ⚠ planning_opmerkingen not found:", e);
    }
});
