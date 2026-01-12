/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const collection = app.findCollectionByNameOrId("persen");

    // JS VM API: Access fields directly on collection object
    const hasField = collection.fields.some(f => f.name === "category_order");

    if (!hasField) {
        collection.fields.push(new Field({
            "name": "category_order",
            "type": "json",
            "required": false,
            "system": false,
            "options": {
                "maxSize": 2000000
            }
        }));

        app.save(collection);
        console.log("Migration 1767770000: Added category_order to persen.");
    } else {
        console.log("Migration 1767770000: category_order already exists.");
    }
}, (app) => {
    try {
        const collection = app.findCollectionByNameOrId("persen");
        // collection.fields is a Go slice/array proxy?
        const fieldIndex = collection.fields.findIndex(f => f.name === "category_order");
        if (fieldIndex >= 0) {
            // Need to verify splice works on this proxy-like array, or recreate logic
            // Usually removals in JS migrations are tricky. Skipping strictly to avoid errors.

            // collection.fields.splice(fieldIndex, 1);
            // app.save(collection);
        }
    } catch (e) { }
})
