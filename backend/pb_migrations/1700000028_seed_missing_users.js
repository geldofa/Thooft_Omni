
migrate((app) => {
    try {
        const users = app.findCollectionByNameOrId("users");

        const demoUsers = [
            { username: "tom", password: "tom12345", name: "Tom", role: "Meestergast", email: "tom@example.com" },
            { username: "c80", password: "c8012345", name: "C80 Operator", role: "Operator", email: "c80@example.com" },
            { username: "c818", password: "c81812345", name: "C818 Operator", role: "Operator", email: "c818@example.com" }
        ];

        demoUsers.forEach(data => {
            try {
                let record;
                try {
                    record = app.findAuthRecordByUsername("users", data.username);
                    console.log(`User ${data.username} already exists, updating.`);
                } catch (e) {
                    try {
                        record = app.findAuthRecordByEmail("users", data.email);
                        console.log(`User ${data.email} already exists, updating.`);
                    } catch (e2) {
                        record = new Record(users);
                        console.log(`Creating user: ${data.username}`);
                    }
                }

                record.set("username", data.username);
                record.set("email", data.email);
                record.setPassword(data.password);
                record.set("name", data.name);
                record.set("role", data.role);
                record.setVerified(true);
                app.save(record);
            } catch (e) {
                console.log(`Error seeding ${data.username}:`, e.message);
            }
        });

    } catch (e) {
        console.log("Error in migration 1700000028:", e.message);
    }
}, (app) => { });
