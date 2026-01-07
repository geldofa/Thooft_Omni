
migrate((app) => {
    try {
        const collection = app.findCollectionByNameOrId("drukwerken");
        const persen = app.findCollectionByNameOrId("persen");

        // Add the "pers" field to the schema if it's missing
        const hasPers = collection.fields.some(f => f.name === "pers");

        if (!hasPers) {
            console.log("Adding 'pers' relation field to drukwerken collection...");
            collection.fields.push(new Field({
                "name": "pers",
                "type": "relation",
                "required": false,
                "options": {
                    "collectionId": persen.id,
                    "cascadeDelete": false,
                    "minSelect": null,
                    "maxSelect": 1,
                    "displayFields": null
                }
            }));
            app.save(collection);
            console.log("Drukwerken schema updated with 'pers' field.");
        }

    } catch (e) {
        console.log("Error in migration 1706000001:", e.message);
    }
}, (app) => {
    // Rollback
    try {
        const collection = app.findCollectionByNameOrId("drukwerken");
        collection.fields = collection.fields.filter(f => f.name !== "pers");
        app.save(collection);
    } catch (e) {
        console.log("Error rolling back migration 1706000001:", e.message);
    }
});
