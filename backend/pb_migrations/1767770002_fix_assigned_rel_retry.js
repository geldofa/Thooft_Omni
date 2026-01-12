/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const collection = app.findCollectionByNameOrId("onderhoud");

    try {
        const field = collection.fields.find(f => f.name === "assigned_operator");
        if (field && field.type === 'relation') {
            // Try setting maxSelect to null (unlimited)
            // Using direct property access on existing options object
            if (field.options) {
                field.options.maxSelect = null;
                console.log("Updated assigned_operator maxSelect to null");
            }
        }
    } catch (e) {
        console.log("Error updating assigned_operator: " + e.message);
    }

    try {
        const field = collection.fields.find(f => f.name === "assigned_team");
        if (field && field.type === 'relation') {
            if (field.options) {
                field.options.maxSelect = null;
                console.log("Updated assigned_team maxSelect to null");
            }
        }
    } catch (e) {
        console.log("Error updating assigned_team: " + e.message);
    }

    app.save(collection);
}, (app) => {
    // No revert
})
