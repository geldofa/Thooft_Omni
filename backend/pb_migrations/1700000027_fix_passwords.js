
migrate((app) => {
    try {
        const users = app.findCollectionByNameOrId("users");

        const demoUsers = [
            { username: "tom", password: "tom12345", email: "tom@example.com" },
            { username: "c80", password: "c8012345", email: "c80@example.com" },
            { username: "c818", password: "c81812345", email: "c818@example.com" }
        ];

        demoUsers.forEach(data => {
            try {
                let record;
                try {
                    record = app.findAuthRecordByUsername("users", data.username);
                } catch (e) {
                    record = app.findAuthRecordByEmail("users", data.email);
                }

                record.setPassword(data.password);
                app.save(record);
                console.log(`Updated password for: ${data.username}`);
            } catch (e) {
                console.log(`Error updating ${data.username}:`, e.message);
            }
        });

    } catch (e) {
        console.log("Error in migration 1700000027:", e.message);
    }
}, (app) => { });
