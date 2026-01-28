/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
    const collection = app.findCollectionByNameOrId("categorieen");

    // Using JSON field to store press-specific subtexts
    // Structure: { "press_id_1": "subtext for press 1", "press_id_2": "subtext for press 2" }
    collection.fields.add(new Field({
        hidden: false,
        id: "json_subtexts_001",
        maxSize: 0,
        name: "subtexts",
        presentable: false,
        required: false,
        system: false,
        type: "json"
    }));

    return app.save(collection);
}, (app) => {
    const collection = app.findCollectionByNameOrId("categorieen");

    collection.fields.removeById("json_subtexts_001");

    return app.save(collection);
});
