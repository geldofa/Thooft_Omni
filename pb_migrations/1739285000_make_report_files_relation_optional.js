/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const collection = app.findCollectionByNameOrId("report_files");
    const field = collection.fields.getByName("maintenance_report");
    if (field) {
        field.required = false;
        app.save(collection);
    }
}, (app) => {
    const collection = app.findCollectionByNameOrId("report_files");
    const field = collection.fields.getByName("maintenance_report");
    if (field) {
        field.required = true;
        app.save(collection);
    }
});
