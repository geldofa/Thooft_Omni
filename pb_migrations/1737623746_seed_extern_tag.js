migrate((app) => {
    const collection = app.findCollectionByNameOrId("tags");

    try {
        // Check if it already exists
        app.findFirstRecordByFilter("tags", "naam = 'Extern'");
        console.log("Extern tag already exists, skipping seed.");
    } catch (e) {
        console.log("Seeding Extern tag...");
        const record = new Record(collection);
        record.set("naam", "Extern");
        record.set("kleur", "#ef4444");
        record.set("active", true);
        record.set("system_managed", true);
        app.save(record);
        console.log("Successfully seeded Extern tag.");
    }
})
