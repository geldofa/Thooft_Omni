/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
    console.log("🚀 Starting migration: Create sluitingsdagen collection");

    let sluitingsdagen;
    try {
        sluitingsdagen = app.findCollectionByNameOrId("sluitingsdagen");
        console.log("   - 'sluitingsdagen' already exists, updating...");
    } catch (_) {
        console.log("   + Creating 'sluitingsdagen' collection...");
        sluitingsdagen = new Collection({
            id: "pbc_sluitingsdagen",
            name: "sluitingsdagen",
            type: "base",
        });
    }

    if (!sluitingsdagen.fields.getByName("datum")) {
        sluitingsdagen.fields.add(new DateField({
            name: "datum",
            required: true,
        }));
        console.log("   + Added 'datum' field");
    }

    if (!sluitingsdagen.fields.getByName("omschrijving")) {
        sluitingsdagen.fields.add(new TextField({
            name: "omschrijving",
            required: true,
        }));
        console.log("   + Added 'omschrijving' field");
    }

    if (!sluitingsdagen.fields.getByName("type")) {
        sluitingsdagen.fields.add(new SelectField({
            name: "type",
            required: false,
            values: ["feestdag", "brugdag", "bedrijfssluiting"],
            maxSelect: 1,
        }));
        console.log("   + Added 'type' field (select)");
    }

    // Everyone can read, only admin/meestergast can write
    sluitingsdagen.listRule = "@request.auth.id != ''";
    sluitingsdagen.viewRule = "@request.auth.id != ''";
    sluitingsdagen.createRule = "@request.auth.role = 'Admin' || @request.auth.role = 'Meestergast'";
    sluitingsdagen.updateRule = "@request.auth.role = 'Admin' || @request.auth.role = 'Meestergast'";
    sluitingsdagen.deleteRule = "@request.auth.role = 'Admin' || @request.auth.role = 'Meestergast'";

    sluitingsdagen.indexes = [
        "CREATE UNIQUE INDEX `idx_sluitingsdagen_datum` ON `sluitingsdagen` (`datum`)",
    ];

    app.save(sluitingsdagen);
    console.log("   ✅ sluitingsdagen created/updated");
    console.log("🏁 Migration complete: sluitingsdagen");

}, (app) => {
    console.log("↩️ Rolling back: removing sluitingsdagen");
    try {
        const col = app.findCollectionByNameOrId("sluitingsdagen");
        app.delete(col);
        console.log("   ✅ Deleted sluitingsdagen");
    } catch (e) {
        console.warn("   ⚠ sluitingsdagen not found:", e);
    }
});
