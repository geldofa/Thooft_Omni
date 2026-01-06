
migrate((app) => {
    try {
        const users = app.findCollectionByNameOrId("users");

        // 1. Properly add the username field if missing
        const hasUsername = users.fields.some(f => f.name === "username");

        if (!hasUsername) {
            console.log("Adding 'username' field to users collection...");
            // Use the JSON structure that PocketBase expect for fields
            users.fields.push(new Field({
                "name": "username",
                "type": "text",
                "required": true,
                "unique": true,
                "options": {
                    "min": 3,
                    "max": 100,
                    "pattern": "^[\\w\\.]+$"
                }
            }));
        }

        // Configuration attempt 3: 
        // PocketBase 0.22+ and 0.26 might have different JS API for auth.
        // Let's try to set identityFields via the passwordAuth object directly.
        users.passwordAuth.enabled = true;
        users.passwordAuth.identityFields = ["username", "email"];

        app.save(users);
        console.log("Users schema and auth settings saved.");

        // 2. Re-seed Demo Users
        const demoUsers = [
            { username: "admin", password: "admin123", name: "Admin", role: "Admin", email: "admin@example.com" },
            { username: "tom", password: "tom123", name: "Tom", role: "Meestergast", email: "tom@example.com" },
            { username: "lithoman", password: "litho123", name: "Lithoman Operator", role: "Operator", email: "lithoman@example.com" },
            { username: "c80", password: "c80123", name: "C80 Operator", role: "Operator", email: "c80@example.com" },
            { username: "c818", password: "c818123", name: "C818 Operator", role: "Operator", email: "c818@example.com" }
        ];

        demoUsers.forEach(data => {
            try {
                let record;
                try {
                    record = app.findAuthRecordByEmail("users", data.email);
                } catch (e) {
                    try {
                        record = app.findAuthRecordByUsername("users", data.username);
                    } catch (e2) {
                        record = new Record(users);
                    }
                }

                record.set("username", data.username);
                record.set("email", data.email);
                record.setPassword(data.password);
                record.set("name", data.name);
                record.set("role", data.role);
                record.setVerified(true);
                app.save(record);
                console.log(`Seeded: ${data.username}`);
            } catch (e) {
                console.log(`Error seeding ${data.username}:`, e.message);
            }
        });

    } catch (e) {
        console.log("Error in migration 1700000025:", e.message);
    }
}, (app) => { });
