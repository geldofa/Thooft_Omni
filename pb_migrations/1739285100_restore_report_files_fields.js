/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const collection = app.findCollectionByNameOrId("report_files");
    const reports = app.findCollectionByNameOrId("maintenance_reports");

    if (!collection) {
        throw new Error("Collection report_files not found");
    }

    // Use the Field constructor which seems safest in this environment
    // Add file field
    if (!collection.fields.getByName("file")) {
        collection.fields.add(new Field({
            name: "file",
            type: "file",
            required: true,
            maxSelect: 1,
            maxSize: 5242880,
            mimeTypes: ["application/pdf"],
            protected: false
        }));
    }

    // Add relation field
    if (!collection.fields.getByName("maintenance_report")) {
        collection.fields.add(new Field({
            name: "maintenance_report",
            type: "relation",
            collectionId: reports.id,
            cascadeDelete: true,
            maxSelect: 1,
            required: false
        }));
    }

    // Add generated_at field
    if (!collection.fields.getByName("generated_at")) {
        collection.fields.add(new Field({
            name: "generated_at",
            type: "date",
            required: false
        }));
    }

    app.save(collection);
}, (app) => {
    // Revert logic
})
