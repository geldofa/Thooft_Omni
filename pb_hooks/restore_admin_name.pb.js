
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
