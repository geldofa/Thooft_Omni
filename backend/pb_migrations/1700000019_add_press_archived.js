migrate((app) => {
    try {
        const collection = app.findCollectionByNameOrId("persen");

        // Add 'archived' field if it doesn't exist
        try {
            collection.fields.getByName("archived");
            console.log("Field 'archived' already exists on persen.");
        } catch (e) {
            collection.fields.add({
                name: "archived",
                type: "bool",
                presentable: false
            });
            console.log("Added 'archived' field to persen.");
        }

        app.save(collection);
        console.log("SUCCESS: persen schema updated with archived field.");

    } catch (e) {
        console.log("FATAL ERROR in persen schema update:", e.message);
    }
}, (app) => {
    // Rollback logic - remove the field
    try {
        const collection = app.findCollectionByNameOrId("persen");
        const field = collection.fields.getByName("archived");
        collection.fields.remove(field);
        app.save(collection);
    } catch (e) {
        console.log("Rollback error:", e.message);
    }
});
