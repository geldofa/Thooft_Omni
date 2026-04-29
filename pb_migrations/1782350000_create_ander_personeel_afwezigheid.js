/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
    console.log("🚀 Starting migration: Create ander_personeel_afwezigheid collection");

    const collection = new Collection({
        id: "pbc_ander_personeel_afwezigheid",
        name: "ander_personeel_afwezigheid",
        type: "base",
    });

    collection.fields.add(new TextField({ name: "naam", required: true }));
    collection.fields.add(new DateField({ name: "datum", required: true }));
    collection.fields.add(new SelectField({
        name: "type",
        required: true,
        values: ["Verlof", "Recup", "Ziek"],
        maxSelect: 1,
    }));
    collection.fields.add(new TextField({ name: "opmerking", required: false }));

    collection.listRule   = "@request.auth.id != ''";
    collection.viewRule   = "@request.auth.id != ''";
    collection.createRule = "@request.auth.role = 'Admin' || @request.auth.role = 'Meestergast'";
    collection.updateRule = "@request.auth.role = 'Admin' || @request.auth.role = 'Meestergast'";
    collection.deleteRule = "@request.auth.role = 'Admin' || @request.auth.role = 'Meestergast'";

    app.save(collection);

    console.log("   ✅ ander_personeel_afwezigheid collection created");
    console.log("🏁 Migration complete");

}, (app) => {
    try {
        const col = app.findCollectionByNameOrId("ander_personeel_afwezigheid");
        app.delete(col);
    } catch (_) {}
});
