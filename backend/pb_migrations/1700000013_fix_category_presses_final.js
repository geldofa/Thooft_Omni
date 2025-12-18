migrate((app) => {
    try {
        const collection = app.findCollectionByNameOrId("categorieen");

        let exists = false;
        try {
            collection.fields.getByName("presses");
            exists = true;
        } catch (e) { }

        if (!exists) {
            // Use RelationField directly from globals
            const field = new RelationField({
                "name": "presses",
                "collectionId": "persen000000001",
                "maxSelect": 10,
                "cascadeDelete": false
            });

            collection.fields.add(field);
            app.save(collection);
            console.log("SUCCESS: Field 'presses' added to 'categorieen' collection.");
        }

        // Migrate data if 'pers' exists and 'presses' is empty
        const records = app.findAllRecords("categorieen");
        let migratedCount = 0;
        records.forEach(record => {
            const oldPersId = record.getString("pers");
            const existingPresses = record.getStringSlice("presses");

            if (oldPersId && (!existingPresses || existingPresses.length === 0)) {
                record.set("presses", [oldPersId]);
                app.save(record);
                migratedCount++;
            }
        });
        if (migratedCount > 0) {
            console.log(`SUCCESS: Migrated ${migratedCount} categories to multi-press format.`);
        }

    } catch (e) {
        console.log("FATAL ERROR in category presses fix:", e.message);
    }
}, (app) => {
});
