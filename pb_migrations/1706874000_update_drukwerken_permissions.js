/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
    const collection = app.findCollectionByNameOrId("drukwerken");

    // Allow any authenticated user to create/view/edit/delete jobs
    // You might want to restrict deleteRule to admin later
    collection.listRule = "@request.auth.id != ''";
    collection.viewRule = "@request.auth.id != ''";
    collection.createRule = "@request.auth.id != ''";
    collection.updateRule = "@request.auth.id != ''";
    collection.deleteRule = "@request.auth.id != ''";

    app.save(collection);
}, (app) => {
    // Revert to admin-only (empty string)
    const collection = app.findCollectionByNameOrId("drukwerken");

    collection.listRule = "";
    collection.viewRule = "";
    collection.createRule = "";
    collection.updateRule = "";
    collection.deleteRule = "";

    app.save(collection);
});
