/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const collection = app.findCollectionByNameOrId("drukwerken");

    // Add voltooid_op field
    collection.fields.add(new DateField({
        name: "voltooid_op",
        required: false,
        presentable: false,
        system: false,
    }));

    return app.save(collection);
}, (app) => {
    const collection = app.findCollectionByNameOrId("drukwerken");

    collection.fields.removeByName("voltooid_op");

    return app.save(collection);
})
