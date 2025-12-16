/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
    const collection = app.findCollectionByNameOrId("users");

    // Add 'role' field
    // In v0.23, we check if field exists by name
    if (!collection.fields.getByName("role")) {
        collection.fields.add(new Field({
            name: "role",
            type: "select",
            maxSelect: 1,
            values: ["admin", "meestergast", "press"]
        }));
    }

    // Add 'press' field
    if (!collection.fields.getByName("press")) {
        collection.fields.add(new Field({
            name: "press",
            type: "text"
        }));
    }

    app.save(collection);
}, (app) => {
    // Optional revert
});
