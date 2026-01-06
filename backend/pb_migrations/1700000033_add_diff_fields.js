
migrate((app) => {
    try {
        const logs = app.findCollectionByNameOrId("activity_logs");

        const fieldsToAdd = [
            { name: "oldValue", type: "text" },
            { name: "newValue", type: "text" }
        ];

        let changed = false;
        fieldsToAdd.forEach(f => {
            const exists = logs.fields.some(field => field.name === f.name);
            if (!exists) {
                console.log(`Adding field ${f.name} to activity_logs`);
                logs.fields.push(new Field({
                    name: f.name,
                    type: f.type
                }));
                changed = true;
            }
        });

        if (changed) {
            app.save(logs);
            console.log("Successfully added oldValue and newValue fields to activity_logs");
        }

    } catch (e) {
        console.log("Error in migration 1700000033:", e.message);
    }
}, (app) => {
    try {
        const logs = app.findCollectionByNameOrId("activity_logs");

        // Removing fields in rollback is optional but good practice
        const oldValue = logs.fields.getByName("oldValue");
        if (oldValue) logs.fields.remove(oldValue);

        const newValue = logs.fields.getByName("newValue");
        if (newValue) logs.fields.remove(newValue);

        app.save(logs);
    } catch (e) { }
})
