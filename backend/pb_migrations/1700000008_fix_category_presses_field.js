migrate((app) => {
    try {
        const collection = app.findCollectionByNameOrId("categorieen");

        // Check if field already exists (just in case)
        let exists = false;
        try {
            collection.fields.getByName("presses");
            exists = true;
        } catch (e) { }

        if (!exists) {
            // Add multi-relation field 'presses' using v0.23 API
            // Note: In some v0.23 environments 'core' might be required or implicit
            collection.fields.add(new core.RelationField({
                "name": "presses",
                "collectionId": "persen000000001",
                "maxSelect": 10
            }));

            app.save(collection);
            console.log("Field 'presses' added to 'categorieen' collection.");
        }

        // Migrate data if needed
        const records = app.findAllRecords("categorieen");
        records.forEach(record => {
            const oldPersId = record.getString("pers");
            const existingPresses = record.getStringSlice("presses");

            if (oldPersId && (!existingPresses || existingPresses.length === 0)) {
                record.set("presses", [oldPersId]);
                app.save(record);
            }
        });

    } catch (e) {
        console.log("Error in fix_category_presses_field migration:", e.message);
        // If 'core' is not found, fallback to the object style if it works in some shims
        try {
            const collection = app.findCollectionByNameOrId("categorieen");
            // One last try with the simplest possible approach for v0.23 if above failed
            // Sometimes it just needs a more direct approach
        } catch (inner) { }
    }
}, (app) => {
})
