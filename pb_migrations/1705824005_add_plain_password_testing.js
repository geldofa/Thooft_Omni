migrate((app) => {
    const collection = app.findCollectionByNameOrId("users");

    collection.fields.add(new TextField({
        name: "plain_password",
    }));

    return app.save(collection);
}, (app) => {
    const collection = app.findCollectionByNameOrId("users");
    const field = collection.fields.getByName("plain_password");
    if (field) {
        collection.fields.remove(field.id);
    }
    return app.save(collection);
})
