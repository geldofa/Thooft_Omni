migrate((app) => {
    try {
        const collection = app.findCollectionByNameOrId("categorieen");

        // Add multi-relation field 'presses'
        collection.fields.add({
            "name": "presses",
            "type": "relation",
            "required": false,
            "collectionId": "persen000000001", // ID for 'persen' collection
            "maxSelect": 10,
            "cascadeDelete": false
        });

        // Migrate data from 'pers' to 'presses' if 'pers' exists
        try {
            const records = app.findAllRecords("categorieen");
            records.forEach(record => {
                const oldPersId = record.get("pers");
                if (oldPersId) {
                    record.set("presses", [oldPersId]);
                    app.save(record);
                }
            });
        } catch (e) {
            console.log("Migration of existing categories skipped or failed:", e.message);
        }

        app.save(collection);
        console.log("Collection 'categorieen' updated with 'presses' multi-relation field.");

    } catch (e) {
        console.log("Error updating categorieen collection:", e.message);
    }
}, (app) => {
    // Undo logic (optional, but good practice to keep fields if possible)
});
