
// Ensure the primary admin account always has the Admin role on startup
// and the PocketBase superadmin always exists
onBootstrap((e) => {
    e.next();

    // 1. Ensure app user has Admin role
    try {
        const admin = $app.findFirstRecordByFilter("users", "email = 'geldofa@gmail.com'");
        if (admin.get("role") !== "Admin") {
            admin.set("role", "Admin");
            $app.save(admin);
            console.log("✅ [restore_admin] Admin role restored for geldofa@gmail.com");
        }
    } catch (err) {
        console.log("⚠️ [restore_admin] Could not restore admin role:", err);
    }

    // 2. Ensure PocketBase superadmin exists
    try {
        $app.findAuthRecordByEmail("_superusers", "omni@thooft.be");
    } catch (err) {
        // Doesn't exist — create it
        try {
            const superusers = $app.findCollectionByNameOrId("_superusers");
            const su = new Record(superusers);
            su.setEmail("omni@thooft.be");
            su.setPassword("Admin1234");
            $app.save(su);
            console.log("✅ [restore_admin] Superadmin omni@thooft.be created");
        } catch (e2) {
            console.log("⚠️ [restore_admin] Could not create superadmin:", e2);
        }
    }
});

routerAdd("GET", "/api/debug/restore-admin-name", (c) => {
    try {
        const records = $app.findRecordsByFilter("users", 'username ~ "admin_old_"', "-created", 1);
        if (records.length > 0) {
            const record = records[0];
            const oldName = record.get("username");
            record.set("username", "admin");
            // Also ensure role is lowercase 'admin' for consistency
            record.set("role", "admin");
            $app.save(record);
            return c.json(200, { message: "Renamed " + oldName + " back to admin and normalized role." });
        }
        return c.json(200, { message: "No admin_old user found to restore." });
    } catch (e) {
        return c.json(500, { error: e.toString() });
    }
});
