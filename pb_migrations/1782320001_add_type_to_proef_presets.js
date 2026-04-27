/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
    console.log("🚀 Starting migration: Adding type field to proef_presets");

    const collection = app.findCollectionByNameOrId("proef_presets");
    
    collection.fields.add(new TextField({ 
        name: "type",
        required: true,
        pattern: "^(Coated|Uncoated)$"
    }));

    app.save(collection);

    console.log("   ✅ 'type' field added to proef_presets");
    console.log("🏁 Migration complete");

}, (app) => {
    const collection = app.findCollectionByNameOrId("proef_presets");
    const field = collection.fields.getByName("type");
    if (field) {
        collection.fields.remove(field.id);
        app.save(collection);
    }
});
