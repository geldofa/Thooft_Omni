/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const collection = app.findCollectionByNameOrId("maintenance_reports");

    collection.fields.add(new Field({
        name: "is_rolling",
        type: "bool",
        required: false,
        defaultValue: true
    }));

    app.save(collection);
}, (app) => {
    const collection = app.findCollectionByNameOrId("maintenance_reports");
    const field = collection.fields.getByName("is_rolling");
    if (field) {
        collection.fields.removeById(field.id);
        app.save(collection);
    }
})
