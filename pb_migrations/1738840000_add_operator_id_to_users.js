/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const collection = app.findCollectionByNameOrId("users");

    // Add operator_id field to link users to operators
    collection.fields.push(new Field({
        system: false,
        name: "operator_id",
        type: "text",
        required: false,
        options: {}
    }));

    return app.save(collection);
}, (app) => {
    const collection = app.findCollectionByNameOrId("users");
    const field = collection.fields.find(f => f.name === "operator_id");
    if (field) {
        collection.fields.splice(collection.fields.indexOf(field), 1);
    }
    return app.save(collection);
});
