migrate((app) => {
    try {
        const collection = app.findCollectionByNameOrId("operatoren");

        // 1. Add 'active' field
        try {
            collection.fields.getByName("active");
        } catch (e) {
            collection.fields.add({
                name: "active",
                type: "bool",
                presentable: true
            });
        }

        // 2. Add 'presses' field (Relation to persen)
        try {
            collection.fields.getByName("presses");
        } catch (e) {
            collection.fields.add({
                name: "presses",
                type: "relation",
                collectionId: "persen000000001",
                cascadeDelete: false,
                maxSelect: 10
            });
        }

        // 3. Add 'can_edit_tasks' field
        try {
            collection.fields.getByName("can_edit_tasks");
        } catch (e) {
            collection.fields.add({
                name: "can_edit_tasks",
                type: "bool"
            });
        }

        // 4. Add 'can_access_management' field
        try {
            collection.fields.getByName("can_access_management");
        } catch (e) {
            collection.fields.add({
                name: "can_access_management",
                type: "bool"
            });
        }

        app.save(collection);
        console.log("SUCCESS: Operatoren schema updated with active, presses, and permission fields.");

    } catch (e) {
        console.log("FATAL ERROR in operatoren schema update:", e.message);
    }
}, (app) => {
    // Rollback logic could be added here if needed
});
