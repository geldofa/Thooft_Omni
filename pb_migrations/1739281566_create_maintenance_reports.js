/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    // 1. Create maintenance_reports collection
    const pressCollection = app.findCollectionByNameOrId("persen");

    const reportsCollection = new Collection({
        name: "maintenance_reports",
        type: "base",
        system: false,
        schema: [
            {
                name: "name",
                type: "text",
                required: true,
                presentable: true,
            },
            {
                name: "press_ids",
                type: "relation",
                required: false,
                presentable: false,
                options: {
                    collectionId: pressCollection.id,
                    cascadeDelete: false,
                    minSelect: null,
                    maxSelect: null,
                    displayFields: []
                }
            },
            {
                name: "period",
                type: "select",
                required: true,
                presentable: false,
                options: {
                    maxSelect: 1,
                    values: ["day", "week", "month", "year"]
                }
            },
            {
                name: "auto_generate",
                type: "bool",
                required: false,
                presentable: false
            },
            {
                name: "schedule_day",
                type: "number",
                required: false,
                presentable: false,
                options: {
                    min: 1,
                    max: 31,
                    noDecimal: true
                }
            },
            {
                name: "last_run",
                type: "date",
                required: false,
                presentable: false
            },
            {
                name: "email_enabled",
                type: "bool",
                required: false,
                presentable: false
            },
            {
                name: "email_recipients",
                type: "text",
                required: false,
                presentable: false
            },
            {
                name: "email_subject",
                type: "text",
                required: false,
                presentable: false
            }
        ]
    });

    app.save(reportsCollection);

    // 2. Create report_files collection
    // We need to fetch the fresh collection object to get its ID,
    // although save() might update the object in place, fetching is safer.
    const createdReportsCollection = app.findCollectionByNameOrId("maintenance_reports");

    const filesCollection = new Collection({
        name: "report_files",
        type: "base",
        system: false,
        schema: [
            {
                name: "file",
                type: "file",
                required: true,
                presentable: false,
                options: {
                    maxSelect: 1,
                    maxSize: 5242880, // 5MB
                    mimeTypes: ["application/pdf"],
                    thumbs: [],
                    protected: false
                }
            },
            {
                name: "maintenance_report",
                type: "relation",
                required: true,
                presentable: false,
                options: {
                    collectionId: createdReportsCollection.id,
                    cascadeDelete: true, // If report config is deleted, delete files? Usually safe.
                    minSelect: null,
                    maxSelect: 1,
                    displayFields: []
                }
            },
            {
                name: "generated_at",
                type: "date",
                required: false,
                presentable: false
            }
        ]
    });

    app.save(filesCollection);

}, (app) => {
    // Revert operations
    const filesCollection = app.findCollectionByNameOrId("report_files");
    if (filesCollection) {
        app.delete(filesCollection);
    }

    const reportsCollection = app.findCollectionByNameOrId("maintenance_reports");
    if (reportsCollection) {
        app.delete(reportsCollection);
    }
});
