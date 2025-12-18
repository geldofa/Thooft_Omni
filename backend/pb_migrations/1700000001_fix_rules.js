migrate((app) => {
    const users = app.findCollectionByNameOrId("users");
    users.listRule = "@request.auth.id != ''";
    users.viewRule = "@request.auth.id != ''";
    users.createRule = "@request.auth.id != ''"; // Allow admins (already verified by role check in app?)
    users.updateRule = "@request.auth.id != ''";
    users.deleteRule = "@request.auth.id != ''";
    app.save(users);

    // Set rules for other collections as well to ensure frontend can function
    const baseCollections = ["persen", "operatoren", "ploegen", "categorieen", "onderhoud", "drukwerken"];

    baseCollections.forEach(name => {
        try {
            const col = app.findCollectionByNameOrId(name);
            col.listRule = "@request.auth.id != ''";
            col.viewRule = "@request.auth.id != ''";
            col.createRule = "@request.auth.id != ''";
            col.updateRule = "@request.auth.id != ''";
            col.deleteRule = "@request.auth.id != ''";
            app.save(col);
        } catch (e) {
            console.log(`Warning: Collection ${name} not found, skipping rules update.`);
        }
    });

    // Also handle names used in AuthContext if they differ (presses, categories, maintenance_tasks)
    const otherNames = ["presses", "categories", "maintenance_tasks", "feedback", "activity_logs"];
    otherNames.forEach(name => {
        try {
            const col = app.findCollectionByNameOrId(name);
            col.listRule = "@request.auth.id != ''";
            col.viewRule = "@request.auth.id != ''";
            col.createRule = "@request.auth.id != ''";
            col.updateRule = "@request.auth.id != ''";
            col.deleteRule = "@request.auth.id != ''";
            app.save(col);
        } catch (e) { }
    });
});
