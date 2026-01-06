
migrate((app) => {
    try {
        const users = app.findCollectionByNameOrId("users");

        // 1. Add Unique Index for username if it doesn't exist
        // The previous migration might have added the field but failed to save properly or just failed the auth check.
        // Let's ensure the field exists AND has a unique index.
        const hasUsername = users.fields.some(f => f.name === "username");
        if (!hasUsername) {
            console.log("Adding missing 'username' field...");
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

        // Ensure indices are updated
        const indexName = "idx_username_users000000000001";
        const hasIndex = users.indexes.some(idx => idx.includes("`username`"));
        if (!hasIndex) {
            console.log("Adding unique index for username...");
            users.indexes.push(`CREATE UNIQUE INDEX \`${indexName}\` ON \`users\` (\`username\`)`);
        }

        // 2. Configure Authentication
        users.passwordAuth.enabled = true;
        users.passwordAuth.identityFields = ["username", "email"];

        app.save(users);
        console.log("Users schema, indices and auth settings updated.");

        // 3. Re-seed Demo Users
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
                console.log(`Seeded user: ${data.username}`);
            } catch (e) {
                console.log(`Error seeding ${data.username}:`, e.message);
            }
        });

    } catch (e) {
        console.log("Error in migration 1700000026:", e.message);
    }
}, (app) => { });
