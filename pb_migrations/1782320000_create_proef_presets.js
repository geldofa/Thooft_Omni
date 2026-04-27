/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
    console.log("🚀 Starting migration: Creating proef_presets collection");

    const collection = new Collection({
        id: "pbc_proef_presets",
        name: "proef_presets",
        type: "base",
    });

    collection.fields.add(new TextField({ name: "naam", required: true }));
    collection.fields.add(new TextField({ name: "omschrijving" }));

    collection.listRule   = "@request.auth.id != ''";
    collection.viewRule   = "@request.auth.id != ''";
    collection.createRule = "@request.auth.role = 'Admin' || @request.auth.role = 'Meestergast'";
    collection.updateRule = "@request.auth.role = 'Admin' || @request.auth.role = 'Meestergast'";
    collection.deleteRule = "@request.auth.role = 'Admin' || @request.auth.role = 'Meestergast'";

    app.save(collection);

    console.log("   ✅ proef_presets collection created");
    console.log("🏁 Migration complete");

}, (app) => {
    const collection = app.findCollectionByNameOrId("proef_presets");
    app.delete(collection);
});
