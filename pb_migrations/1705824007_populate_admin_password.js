migrate((app) => {
    try {
        const record = app.findFirstRecordByData("users", "username", "admin");
        record.set("plain_password", "admin1234");
        return app.save(record);
    } catch (e) {
        // user might not exist yet
    }
}, (app) => {
    return null;
})
