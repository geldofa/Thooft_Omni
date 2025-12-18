migrate((app) => {
    try {
        const collection = app.findCollectionByNameOrId("operatoren");

        // 1. Update 'interne_id' field
        const interneIdField = collection.fields.getByName("interne_id");
        if (interneIdField) {
            interneIdField.type = "text";
            interneIdField.required = false;
            // Clear numeric constraints if they exist in the underlying object
            if (interneIdField.min !== undefined) delete interneIdField.min;
            if (interneIdField.max !== undefined) delete interneIdField.max;
        }

        app.save(collection);
        console.log("SUCCESS: Operatoren schema updated: interne_id is now optional text.");

    } catch (e) {
        console.log("FATAL ERROR in operatoren schema fix:", e.message);
    }
}, (app) => {
    // Rollback logic could be added here if needed
});
