/// <reference path="../../types.d.ts" />

migrate((app) => {
    try {
        const collection = app.findCollectionByNameOrId("onderhoud");

        // Add 'opmerkingen' field
        try {
            collection.fields.getByName("opmerkingen");
        } catch (e) {
            collection.fields.add({
                name: "opmerkingen",
                type: "text",
                required: false,
            });
            console.log("Added 'opmerkingen' field to 'onderhoud' collection.");
        }

        // Add 'commentDate' field
        try {
            collection.fields.getByName("commentDate");
        } catch (e) {
            collection.fields.add({
                name: "commentDate",
                type: "date",
                required: false,
            });
            console.log("Added 'commentDate' field to 'onderhoud' collection.");
        }

        app.save(collection);
    } catch (e) {
        console.log("Error adding fields to 'onderhoud' collection: " + e.message);
    }
}, (app) => {
    // Rollback not strictly necessary for adding optional fields
});
