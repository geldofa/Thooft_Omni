/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const collection = app.findCollectionByNameOrId("drukwerken");

    // CMYK context name
    if (!collection.fields.getByName("cmyk_naam")) {
        collection.fields.add(new TextField({ name: "cmyk_naam", required: false }));
    }

    // Papier relation
    if (!collection.fields.getByName("papier_id")) {
        collection.fields.add(new TextField({
            name: "papier_id",
            required: false,
        }));
    }

    // Papier metadata (denormalized for display)
    if (!collection.fields.getByName("papier_klasse")) {
        collection.fields.add(new TextField({ name: "papier_klasse", required: false }));
    }
    if (!collection.fields.getByName("papier_proef_profiel")) {
        collection.fields.add(new TextField({ name: "papier_proef_profiel", required: false }));
    }
    if (!collection.fields.getByName("papier_gram")) {
        collection.fields.add(new NumberField({ name: "papier_gram", required: false }));
    }

    // Front KCMY
    if (!collection.fields.getByName("front_k")) {
        collection.fields.add(new NumberField({ name: "front_k", required: false }));
    }
    if (!collection.fields.getByName("front_c")) {
        collection.fields.add(new NumberField({ name: "front_c", required: false }));
    }
    if (!collection.fields.getByName("front_m")) {
        collection.fields.add(new NumberField({ name: "front_m", required: false }));
    }
    if (!collection.fields.getByName("front_y")) {
        collection.fields.add(new NumberField({ name: "front_y", required: false }));
    }

    // Back KCMY
    if (!collection.fields.getByName("back_k")) {
        collection.fields.add(new NumberField({ name: "back_k", required: false }));
    }
    if (!collection.fields.getByName("back_c")) {
        collection.fields.add(new NumberField({ name: "back_c", required: false }));
    }
    if (!collection.fields.getByName("back_m")) {
        collection.fields.add(new NumberField({ name: "back_m", required: false }));
    }
    if (!collection.fields.getByName("back_y")) {
        collection.fields.add(new NumberField({ name: "back_y", required: false }));
    }

    return app.save(collection);
}, (app) => {
    const collection = app.findCollectionByNameOrId("drukwerken");

    const fields = [
        "cmyk_naam",
        "papier_id", "papier_klasse", "papier_proef_profiel", "papier_gram",
        "front_k", "front_c", "front_m", "front_y",
        "back_k", "back_c", "back_m", "back_y",
    ];
    fields.forEach(f => collection.fields.removeByName(f));

    return app.save(collection);
})
