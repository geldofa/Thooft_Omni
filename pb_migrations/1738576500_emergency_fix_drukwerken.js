/// <reference path="../pb_data/types.d.ts" />

// Emergency fix: set rules to empty and ensure id field is correct
migrate((app) => {
    const collection = app.findCollectionByNameOrId("drukwerken");

    // Fix the id field's autogeneratePattern
    const idField = collection.fields.getByName("id");
    if (idField) {
        idField.autogeneratePattern = "[a-z0-9]{15}";
        idField.required = true;
        idField.min = 15;
        idField.max = 15;
        idField.pattern = "^[a-z0-9]+$";
    }

    // Set ALL rules to secure (authenticated user only)
    collection.listRule = "@request.auth.id != ''";
    collection.viewRule = "@request.auth.id != ''";
    collection.createRule = "@request.auth.id != ''";
    collection.updateRule = "@request.auth.id != ''";
    collection.deleteRule = "@request.auth.id != ''";

    app.save(collection);
}, (app) => {
    // No-op down migration
});
