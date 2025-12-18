migrate((app) => {
    try {
        const collection = app.findCollectionByNameOrId("categorieen");

        // 1. Find the 'pers' field (the old name)
        try {
            const oldField = collection.fields.getByName("pers");
            if (oldField) {
                // Rename it to 'presses'
                oldField.name = "presses";
                oldField.maxSelect = 10; // Ensure it's multi-relation
                console.log("Renaming 'pers' to 'presses' and setting maxSelect to 10.");
            }
        } catch (e) {
            console.log("'pers' field not found, checking for 'presses'...");
        }

        // 2. Ensure 'presses' field has correct settings
        try {
            const pressesField = collection.fields.getByName("presses");
            if (pressesField) {
                pressesField.maxSelect = 10;
                console.log("Ensuring 'presses' field maxSelect is 10.");
            }
        } catch (e) {
            console.log("'presses' field still not found. Adding it now.");
            // If it still doesn't exist, we must have a real issue. 
            // Let's add it as a fallback.
            collection.fields.add(new RelationField({
                "name": "presses",
                "collectionId": "persen000000001",
                "maxSelect": 10
            }));
        }

        app.save(collection);
        console.log("SUCCESS: Category schema updated.");

    } catch (e) {
        console.log("FATAL ERROR in category field rename:", e.message);
    }
}, (app) => {
});
