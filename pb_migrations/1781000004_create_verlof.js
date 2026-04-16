/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
    console.log("🚀 Starting migration: Create verlof collection");

    let verlof;
    try {
        verlof = app.findCollectionByNameOrId("verlof");
        console.log("   - 'verlof' already exists, updating...");
    } catch (_) {
        console.log("   + Creating 'verlof' collection...");
        verlof = new Collection({
            id: "pbc_verlof",
            name: "verlof",
            type: "base",
        });
    }

    if (!verlof.fields.getByName("operator")) {
        verlof.fields.add(new RelationField({
            name: "operator",
            required: true,
            collectionId: "operat000000001",
            maxSelect: 1,
        }));
        console.log("   + Added 'operator' relation field");
    }

    if (!verlof.fields.getByName("van")) {
        verlof.fields.add(new DateField({
            name: "van",
            required: true,
        }));
        console.log("   + Added 'van' field");
    }

    if (!verlof.fields.getByName("tot")) {
        verlof.fields.add(new DateField({
            name: "tot",
            required: true,
        }));
        console.log("   + Added 'tot' field");
    }

    if (!verlof.fields.getByName("type")) {
        verlof.fields.add(new SelectField({
            name: "type",
            required: true,
            values: ["Verlof", "Recup", "Ziek"],
            maxSelect: 1,
        }));
        console.log("   + Added 'type' field (select)");
    }

    if (!verlof.fields.getByName("opmerking")) {
        verlof.fields.add(new TextField({
            name: "opmerking",
            required: false,
        }));
        console.log("   + Added 'opmerking' field");
    }

    // Everyone authenticated can read, only admin/meestergast can write
    verlof.listRule   = "@request.auth.id != ''";
    verlof.viewRule   = "@request.auth.id != ''";
    verlof.createRule = "@request.auth.role = 'Admin' || @request.auth.role = 'Meestergast'";
    verlof.updateRule = "@request.auth.role = 'Admin' || @request.auth.role = 'Meestergast'";
    verlof.deleteRule = "@request.auth.role = 'Admin' || @request.auth.role = 'Meestergast'";

    app.save(verlof);
    console.log("   ✅ verlof collection created/updated");
    console.log("🏁 Migration complete: verlof");

}, (app) => {
    console.log("↩️ Rolling back: removing verlof");
    try {
        const col = app.findCollectionByNameOrId("verlof");
        app.delete(col);
        console.log("   ✅ Deleted verlof");
    } catch (e) {
        console.warn("   ⚠ verlof not found:", e);
    }
});
