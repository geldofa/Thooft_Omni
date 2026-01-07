
migrate((app) => {
    try {
        const users = app.findCollectionByNameOrId("users");
        const persen = app.findCollectionByNameOrId("persen");

        // 1. Add the "pers" field to the users collection if it's missing
        const hasPers = users.fields.some(f => f.name === "pers");

        if (!hasPers) {
            console.log("Adding 'pers' relation field to users collection...");
            users.fields.push(new Field({
                "name": "pers",
                "type": "relation",
                "required": false,
                "options": {
                    "collectionId": persen.id,
                    "cascadeDelete": false,
                    "minSelect": null,
                    "maxSelect": 1,
                    "displayFields": null
                }
            }));
            app.save(users);
            console.log("Users schema updated with 'pers' relation field.");
        }

        // 2. Map existing users to their presses based on the text 'press' field
        const records = app.findRecordsByFilter("users", "press != ''");
        const pressRecords = app.findRecordsByFilter("persen", "naam != ''");

        records.forEach(record => {
            const pressName = record.get("press");
            const pressId = pressRecords.find(p => p.get("naam") === pressName)?.id;

            if (pressId) {
                record.set("pers", pressId);
                app.save(record);
                console.log(`Linked user ${record.get("username")} to press ${pressName} (${pressId})`);
            }
        });

    } catch (e) {
        console.log("Error in migration 1706000002:", e.message);
    }
}, (app) => {
    // Rollback
    try {
        const users = app.findCollectionByNameOrId("users");
        users.fields = users.fields.filter(f => f.name !== "pers");
        app.save(users);
    } catch (e) {
        console.log("Error rolling back migration 1706000002:", e.message);
    }
});
