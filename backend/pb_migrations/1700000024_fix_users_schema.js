
migrate((app) => {
    try {
        const users = app.findCollectionByNameOrId("users");

        // 1. Add the "username" field to the schema if it's missing
        // Auth collections in newer PocketBase often have it as a system field, 
        // but if it's missing in the fields list, we must add it.
        const hasUsername = users.fields.some(f => f.name === "username");

        if (!hasUsername) {
            console.log("Adding missing 'username' field to users collection...");
            users.fields.push({
                "name": "username",
                "type": "text",
                "required": true,
                "unique": true,
                "options": {
                    "min": 3,
                    "max": 100,
                    "pattern": "^[\\w\\.]+$"
                }
            });
        }

        // 2. Configure Authentication
        users.passwordAuth.enabled = true;
        if (!users.passwordAuth.identityFields.includes("username")) {
            users.passwordAuth.identityFields.push("username");
        }

        app.save(users);
        console.log("Users schema and auth settings updated successfully.");

        // 3. Seed/Update Demo Users
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
                console.log(`Seeded/Updated user: ${data.username}`);
            } catch (e) {
                console.log(`Error seeding user ${data.username}:`, e.message);
            }
        });

    } catch (e) {
        console.log("Error in migration 1700000024:", e.message);
    }
}, (app) => { });
