migrate((app) => {
    const collection = new Collection({
        name: "app_settings",
        type: "base",
        listRule: "",
        viewRule: "",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
            {
                name: "key",
                type: "text",
                required: true,
                options: {
                    min: null,
                    max: null,
                    pattern: ""
                }
            },
            {
                name: "value",
                type: "json",
                required: false,
                options: {
                    maxSize: 2000000
                }
            }
        ],
        indexes: [
            "CREATE UNIQUE INDEX `idx_app_settings_key` ON `app_settings` (`key`)"
        ]
    });

    app.save(collection);

    // Insert default testing_mode record
    const record = new Record(collection);
    record.set("key", "testing_mode");
    record.set("value", false);
    app.save(record);

}, (app) => {
    try {
        const collection = app.findCollectionByNameOrId("app_settings");
        app.delete(collection);
    } catch (_) { /* ignore */ }
})
