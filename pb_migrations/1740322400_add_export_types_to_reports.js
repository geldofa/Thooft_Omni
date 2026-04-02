/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const collection = app.findCollectionByNameOrId("maintenance_reports");

    // Add export_types field
    collection.fields.add(new JSONField({
        name: "export_types",
        required: false,
        presentable: false,
        system: false
    }));

    return app.save(collection);
}, (app) => {
    const collection = app.findCollectionByNameOrId("maintenance_reports");

    collection.fields.removeByName("export_types");

    return app.save(collection);
})
