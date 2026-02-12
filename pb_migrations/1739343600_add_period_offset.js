
migrate((app) => {
    const collection = app.findCollectionByNameOrId("maintenance_reports");

    collection.fields.add(new Field({
        "name": "period_offset",
        "type": "number",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
            "min": null,
            "max": null,
            "noDecimal": true
        }
    }));

    return app.save(collection);
}, (app) => {
    const collection = app.findCollectionByNameOrId("maintenance_reports");

    const field = collection.fields.getByName("period_offset");
    if (field) {
        collection.fields.removeById(field.id);
        return app.save(collection);
    }
})
