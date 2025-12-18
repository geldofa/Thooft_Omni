migrate((app) => {
    try {
        const col = app.findCollectionByNameOrId("categorieen");
        col.listRule = "@request.auth.id != ''";
        col.viewRule = "@request.auth.id != ''";
        col.createRule = "@request.auth.id != ''";
        col.updateRule = "@request.auth.id != ''";
        col.deleteRule = "@request.auth.id != ''";
        app.save(col);
        console.log("Verified API rules for 'categorieen' collection.");
    } catch (e) {
        console.log("Error verifying rules for categorieen:", e.message);
    }
}, (app) => {
    // Undo logic
});
