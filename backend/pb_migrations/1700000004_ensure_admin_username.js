migrate((app) => {
    try {
        const users = app.findCollectionByNameOrId("users");

        // Find the admin user by email if possible
        const adminEmail = "geldofa@gmail.com";
        let adminRecord;
        try {
            adminRecord = app.findAuthRecordByEmail("users", adminEmail);
        } catch (e) {
            // Create if missing
            adminRecord = new Record(users);
            adminRecord.set("email", adminEmail);
            adminRecord.setPassword("admin123");
            adminRecord.set("name", "Admin");
            adminRecord.set("role", "Admin");
            adminRecord.setVerified(true);
        }

        // Force username to 'admin' for demo purposes
        adminRecord.set("username", "admin");
        app.save(adminRecord);

    } catch (e) {
        console.log("Error ensuring admin user:", e.message);
    }
}, (app) => {
    //
});
