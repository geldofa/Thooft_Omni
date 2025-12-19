migrate((app) => {
    try {
        const collection = app.findCollectionByNameOrId("operatoren");

        // Try to remove the old relation presses field
        try {
            const oldField = collection.fields.getByName("presses");
            if (oldField && oldField.type === "relation") {
                console.log("Removing old relation presses field...");
                collection.fields.removeByName("presses");
            }
        } catch (e) {
            console.log("No existing presses field found, will add fresh.");
        }

        // Add presses as JSON field
        try {
            collection.fields.getByName("presses");
            console.log("presses field already exists");
        } catch (e) {
            collection.fields.add({
                name: "presses",
                type: "json"
            });
            console.log("Added presses as JSON field");
        }

        app.save(collection);
        console.log("SUCCESS: Operatoren presses field changed to JSON.");

    } catch (e) {
        console.log("FATAL ERROR:", e.message);
    }
}, (app) => {
    // Rollback
});
