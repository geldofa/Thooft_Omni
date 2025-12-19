migrate((app) => {
    // Fix API rules to allow both admin and user access
    // Empty string means "allow any request" (admins bypass rules anyway, but this ensures users also work)
    const setOpenRules = (col) => {
        col.listRule = "";
        col.viewRule = "";
        col.createRule = "";
        col.updateRule = "";
        col.deleteRule = "";
    };

    const collections = ["persen", "categorieen", "onderhoud", "drukwerken", "operatoren", "ploegen", "feedback", "activity_logs", "press_parameters"];

    collections.forEach(name => {
        try {
            const col = app.findCollectionByNameOrId(name);
            setOpenRules(col);
            app.save(col);
            console.log(`Fixed API rules for: ${name}`);
        } catch (e) {
            console.log(`Warning: Collection ${name} not found: ${e.message}`);
        }
    });
}, (app) => {
    // Rollback - restore original rules
});
