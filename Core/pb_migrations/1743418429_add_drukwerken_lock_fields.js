/// <reference path="../pb_data/types.d.ts" />

// Migration: Add is_finished and locked bool fields to drukwerken collection
migrate((app) => {
    const collection = app.findCollectionByNameOrId("drukwerken");

    collection.fields.add(new BoolField({
        name: "is_finished",
        required: false,
    }));

    collection.fields.add(new BoolField({
        name: "locked",
        required: false,
    }));

    app.save(collection);
}, (app) => {
    const collection = app.findCollectionByNameOrId("drukwerken");

    collection.fields.removeByName("is_finished");
    collection.fields.removeByName("locked");

    app.save(collection);
});
