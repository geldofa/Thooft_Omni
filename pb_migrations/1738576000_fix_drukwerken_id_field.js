/// <reference path="../pb_data/types.d.ts" />

// This migration fixes the id field autogenerate pattern, adds date fields, and restores access rules
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

    // Add date field if it doesn't exist
    if (!collection.fields.getByName("date")) {
        collection.fields.add({
            name: "date",
            type: "text",
            required: false,
            presentable: false
        });
    }

    // Add datum field if it doesn't exist
    if (!collection.fields.getByName("datum")) {
        collection.fields.add({
            name: "datum",
            type: "text",
            required: false,
            presentable: false
        });
    }

    // Ensure access rules are correct
    collection.listRule = "";
    collection.viewRule = "";
    collection.createRule = "";
    collection.updateRule = "";
    collection.deleteRule = "";

    app.save(collection);

    // Backfill missing dates from 'created' timestamp
    const query = "UPDATE drukwerken SET " +
        "date = strftime('%Y-%m-%d', created), " +
        "datum = strftime('%d.%m.%Y', created) " +
        "WHERE (date = '' OR date IS NULL) OR (datum = '' OR datum IS NULL)";

    app.db().newQuery(query).execute();
}, (app) => {
    // Down migration: remove the added fields
    const collection = app.findCollectionByNameOrId("drukwerken");
    collection.fields.removeByName("date");
    collection.fields.removeByName("datum");
    app.save(collection);
});
