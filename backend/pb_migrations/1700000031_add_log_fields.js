
migrate((app) => {
    try {
        const logs = app.findCollectionByNameOrId("activity_logs");

        const fieldsToAdd = [
            { name: "entityId", type: "text" },
            { name: "entityName", type: "text" },
            { name: "press", type: "text" }
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
            console.log("Successfully added fields to activity_logs");
        } else {
            console.log("Activity logs already has the required fields");
        }

    } catch (e) {
        console.log("Error in migration 1700000031:", e.message);
    }
}, (app) => { });
