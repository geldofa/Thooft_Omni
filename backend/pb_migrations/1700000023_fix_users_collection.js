
migrate((app) => {
    try {
        const users = app.findCollectionByNameOrId("users");

        // 1. Add username field if it doesn't exist (though auth collections usually have it, let's ensure it's configured)
        // Ensure authentication settings are correct
        users.passwordAuth.enabled = true;

        // PocketBase 0.22+ uses identityFields but direct assignment might be safer in migrations depends on JS VM
        // Actually, we can use app.saveCollection(users) after modification.
        // Let's ensure the 'username' field is in identityFields.
        if (!users.passwordAuth.identityFields.includes("username")) {
            users.passwordAuth.identityFields.push("username");
        }

        app.save(users);
        console.log("Users collection authentication settings updated.");

        // 2. Seed Demo Users
        const demoUsers = [
            { username: "admin", password: "admin123", name: "Admin", role: "Admin", email: "admin@example.com" },
            { username: "tom", password: "tom123", name: "Tom", role: "Meestergast", email: "tom@example.com" },
            { username: "lithoman", password: "litho123", name: "Lithoman Operator", role: "Operator", email: "lithoman@example.com" },
            { username: "c80", password: "c80123", name: "C80 Operator", role: "Operator", email: "c80@example.com" },
            { username: "c818", password: "c818123", name: "C818 Operator", role: "Operator", email: "c818@example.com" }
        ];

        demoUsers.forEach(data => {
            try {
                // Try to find if user exists by email or username
                let record;
                try {
                    record = app.findAuthRecordByUsername("users", data.username);
                    console.log(`User already exists: ${data.username}. Updating password.`);
                } catch (e) {
                    try {
                        record = app.findAuthRecordByEmail("users", data.email);
                        console.log(`User already exists by email: ${data.email}. Updating username and password.`);
                    } catch (e2) {
                        record = new Record(users);
                        console.log(`Creating new demo user: ${data.username}`);
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
                console.log(`Error seeding user ${data.username}:`, e.message);
            }
        });

    } catch (e) {
        console.log("Error in migration 1700000023:", e.message);
    }
}, (app) => {
    // No rollback for demo data
});
