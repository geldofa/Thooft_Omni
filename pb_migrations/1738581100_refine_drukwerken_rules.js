
migrate((app) => {
    const collection = app.findCollectionByNameOrId("drukwerken");

    // @request.auth.role = "Admin" || @request.auth.role = "Meestergast" || (@request.auth.role = "Operator" && pers = @request.auth.pers)
    const viewRule = '@request.auth.id != "" && (@request.auth.role = "Admin" || @request.auth.role = "Meestergast" || (@request.auth.role = "Operator" && pers = @request.auth.pers))';

    collection.listRule = viewRule;
    collection.viewRule = viewRule;
    collection.createRule = '@request.auth.id != ""';
    collection.updateRule = '@request.auth.id != ""';
    collection.deleteRule = '@request.auth.id != ""';

    app.save(collection);
}, (app) => {
    const collection = app.findCollectionByNameOrId("drukwerken");

    collection.listRule = "@request.auth.id != ''";
    collection.viewRule = "@request.auth.id != ''";
    collection.createRule = "@request.auth.id != ''";
    collection.updateRule = "@request.auth.id != ''";
    collection.deleteRule = "@request.auth.id != ''";

    app.save(collection);
})
