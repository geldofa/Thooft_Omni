
migrate((app) => {
    try {
        const collection = app.findCollectionByNameOrId("onderhoud");

        // Update assigned_operator to allow multiple
        const assigned_operator = collection.fields.getByName("assigned_operator");
        if (assigned_operator) {
            assigned_operator.maxSelect = 0; // 0 means unlimited
        }

        // Update assigned_team to allow multiple
        const assigned_team = collection.fields.getByName("assigned_team");
        if (assigned_team) {
            assigned_team.maxSelect = 0;
        }

        app.save(collection);
        console.log("Successfully updated assigned fields in onderhoud to allow multiple selections");

    } catch (e) {
        console.log("Error in migration 1700000032:", e.message);
    }
}, (app) => {
    try {
        const collection = app.findCollectionByNameOrId("onderhoud");

        const assigned_operator = collection.fields.getByName("assigned_operator");
        if (assigned_operator) {
            assigned_operator.maxSelect = 1;
        }

        const assigned_team = collection.fields.getByName("assigned_team");
        if (assigned_team) {
            assigned_team.maxSelect = 1;
        }

        app.save(collection);
    } catch (e) { }
})
