migrate((app) => {
    // Ensure the Dutch collections have correct rules and missing fields
    const syncRules = (col) => {
        col.listRule = "@request.auth.id != ''";
        col.viewRule = "@request.auth.id != ''";
        col.createRule = "@request.auth.id != ''";
        col.updateRule = "@request.auth.id != ''";
        col.deleteRule = "@request.auth.id != ''";
    };

    const collections = ["persen", "categorieen", "onderhoud", "drukwerken"];
    collections.forEach(name => {
        try {
            const col = app.findCollectionByNameOrId(name);
            syncRules(col);

            // Ensure 'onderhoud' has necessary fields that might be missing from initial migration
            if (name === "onderhoud") {
                // 'task' is title in frontend
                // 'last_date' is lastMaintenance
                // 'next_date' is nextMaintenance
                // 'comment' is where we store notes

                // Let's add 'notes' just in case the frontend already uses it or we want a clean separation
                try {
                    col.fields.getByName("notes");
                } catch (e) {
                    col.fields.add({
                        name: "notes",
                        type: "text",
                        required: false,
                    });
                }
            }

            app.save(col);
        } catch (e) {
            console.log(`Warning: Collection ${name} not found or error during sync: ${e.message}`);
        }
    });

    // Create missing technical collections expected by frontend
    try {
        app.findCollectionByNameOrId("feedback");
    } catch (e) {
        const feedback = new Collection({
            name: "feedback",
            type: "base",
            fields: [
                { name: "type", type: "text" },
                { name: "message", type: "text" },
                { name: "user", type: "text" },
                { name: "status", type: "text" },
                { name: "context", type: "json" }
            ]
        });
        syncRules(feedback);
        app.save(feedback);
    }

    try {
        app.findCollectionByNameOrId("activity_logs");
    } catch (e) {
        const logs = new Collection({
            name: "activity_logs",
            type: "base",
            fields: [
                { name: "user", type: "text" },
                { name: "action", type: "text" },
                { name: "entity", type: "text" },
                { name: "details", type: "text" }
            ]
        });
        syncRules(logs);
        app.save(logs);
    }
}, (app) => {
    // Rollback logic
});
