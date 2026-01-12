/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const collection = app.findCollectionByNameOrId("onderhoud");

    // Loop through fields to find target
    // Direct array access/iteration is safer than find() for Go slices in some contexts
    const fields = collection.fields;

    for (let i = 0; i < fields.length; i++) {
        const field = fields[i];
        if (field.name === "assigned_operator") {
            const opts = field.options || {};
            opts.maxSelect = null; // Unlimited
            field.options = opts;
            console.log("Updated assigned_operator");
        }
        if (field.name === "assigned_team") {
            const opts = field.options || {};
            opts.maxSelect = null; // Unlimited
            field.options = opts;
            console.log("Updated assigned_team");
        }
    }

    app.save(collection);
}, (app) => {
    // No revert
})
