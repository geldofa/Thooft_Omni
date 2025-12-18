migrate((app) => {
    try {
        const users = app.findCollectionByNameOrId("users");

        const demoUsers = [
            { username: "tom", password: "tom123", name: "Tom", role: "Meestergast" },
            { username: "lithoman", password: "litho123", name: "Lithoman Operator", role: "Operator" },
            { username: "c80", password: "c80123", name: "C80 Operator", role: "Operator" },
            { username: "c818", password: "c818123", name: "C818 Operator", role: "Operator" }
        ];

        demoUsers.forEach(data => {
            try {
                // Try to find existing
                app.findAuthRecordByUsername("users", data.username);
            } catch (e) {
                // Create if missing
                const record = new Record(users);
                record.set("username", data.username);
                record.set("email", `${data.username}@example.com`);
                record.setPassword(data.password);
                record.set("name", data.name);
                record.set("role", data.role);
                record.setVerified(true);
                app.save(record);
                console.log(`Demo user created: ${data.username}`);
            }
        });

    } catch (e) {
        console.log("Error seeding demo users:", e.message);
    }
}, (app) => {
    //
});
