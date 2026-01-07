
migrate((app) => {
    try {
        const users = app.findCollectionByNameOrId("users");

        // 1. Add the "press" field to the schema if it's missing
        const hasPress = users.fields.some(f => f.name === "press");

        if (!hasPress) {
            console.log("Adding 'press' field to users collection...");
            users.fields.push(new Field({
                "name": "press",
                "type": "text",
                "required": false,
                "options": {
                    "min": null,
                    "max": null,
                    "pattern": ""
                }
            }));
        }

        app.save(users);
        console.log("Users schema updated with 'press' field.");

        // 2. Assign presses to existing demo users
        const userPressMapping = {
            "lithoman": "Lithoman",
            "c80": "C80",
            "c818": "C818"
        };

        Object.entries(userPressMapping).forEach(([username, pressName]) => {
            try {
                const record = app.findAuthRecordByUsername("users", username);
                record.set("press", pressName);
                app.save(record);
                console.log(`Updated user ${username} with press: ${pressName}`);
            } catch (e) {
                console.log(`Could not find or update user ${username}:`, e.message);
            }
        });

    } catch (e) {
        console.log("Error in migration 1706000000:", e.message);
    }
}, (app) => {
    // Rollback is complex for schema changes and data updates, leaving empty for simplicity
});
