
migrate((app) => {
    try {
        const collection = app.findCollectionByNameOrId("categorieen");

        // Find the field by name or ID
        // ID from initial migration: relation3496103353
        const field = collection.fields.find(f => f.name === "presses" || f.id === "relation3496103353");

        if (field) {
            field.name = "pers_ids";
            return app.save(collection);
        }

        console.log("Field 'presses' not found in 'categorieen', skipping rename.");
    } catch (e) {
        console.error("Migration failed to rename presses to pers_ids:", e);
        throw e;
    }
}, (app) => {
    try {
        const collection = app.findCollectionByNameOrId("categorieen");
        const field = collection.fields.find(f => f.name === "pers_ids" || f.id === "relation3496103353");

        if (field) {
            field.name = "presses";
            return app.save(collection);
        }
    } catch (e) {
        // Ignore error if collection doesn't exist
    }
});
