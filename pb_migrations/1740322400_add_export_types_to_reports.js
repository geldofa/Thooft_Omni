/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const collection = app.findCollectionByNameOrId("pbc_3361522781");

    // Add export_types field
    collection.fields.add(new Field({
        name: "export_types",
        type: "json",
        required: false,
        presentable: false,
        system: false
    }));

    return app.save(collection);
}, (app) => {
    const collection = app.findCollectionByNameOrId("pbc_3361522781");

    collection.fields.removeByName("export_types");

    return app.save(collection);
})
