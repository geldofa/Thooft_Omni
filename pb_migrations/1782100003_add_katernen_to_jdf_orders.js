migrate((app) => {
    const collection = app.findCollectionByNameOrId("jdf_orders");
    const field = new Field({
        type: "json",
        name: "katernen",
        required: false,
    });
    collection.fields.add(field);
    app.save(collection);
}, (app) => {
    const collection = app.findCollectionByNameOrId("jdf_orders");
    collection.fields.removeByName("katernen");
    app.save(collection);
});
