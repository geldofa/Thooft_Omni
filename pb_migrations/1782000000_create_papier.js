/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
    console.log("🚀 Starting migration: Create papier collection");

    let papier;
    try {
        papier = app.findCollectionByNameOrId("papier");
        console.log("   - 'papier' already exists, updating...");
    } catch (_) {
        console.log("   + Creating 'papier' collection...");
        papier = new Collection({
            id: "pbc_papier",
            name: "papier",
            type: "base",
        });
    }

    if (!papier.fields.getByName("naam")) {
        papier.fields.add(new TextField({
            name: "naam",
            required: true,
        }));
        console.log("   + Added 'naam' field");
    }

    if (!papier.fields.getByName("klasse")) {
        papier.fields.add(new TextField({
            name: "klasse",
            required: false,
        }));
        console.log("   + Added 'klasse' field");
    }

    if (!papier.fields.getByName("proef_profiel")) {
        papier.fields.add(new TextField({
            name: "proef_profiel",
            required: false,
        }));
        console.log("   + Added 'proef_profiel' field");
    }

    if (!papier.fields.getByName("gram_per_m2")) {
        papier.fields.add(new NumberField({
            name: "gram_per_m2",
            required: false,
        }));
        console.log("   + Added 'gram_per_m2' field");
    }

    // Everyone authenticated can read, only admin/meestergast can write
    papier.listRule   = "@request.auth.id != ''";
    papier.viewRule   = "@request.auth.id != ''";
    papier.createRule = "@request.auth.role = 'Admin' || @request.auth.role = 'Meestergast'";
    papier.updateRule = "@request.auth.role = 'Admin' || @request.auth.role = 'Meestergast'";
    papier.deleteRule = "@request.auth.role = 'Admin' || @request.auth.role = 'Meestergast'";

    app.save(papier);
    console.log("   ✅ papier collection created/updated");
    console.log("🏁 Migration complete: papier");

}, (app) => {
    console.log("↩️ Rolling back: removing papier");
    try {
        const col = app.findCollectionByNameOrId("papier");
        app.delete(col);
        console.log("   ✅ Deleted papier");
    } catch (e) {
        console.warn("   ⚠ papier not found:", e);
    }
});
