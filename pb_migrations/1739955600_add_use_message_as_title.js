/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const collection = app.findCollectionByNameOrId("feedback");

    collection.fields.add(new BoolField({
        "name": "use_message_as_title",
        "id": "bool839210452",
        "system": false,
        "required": false,
        "presentable": false,
    }));

    return app.save(collection);
}, (app) => {
    const collection = app.findCollectionByNameOrId("feedback");

    collection.fields.removeById("bool839210452");

    return app.save(collection);
})
