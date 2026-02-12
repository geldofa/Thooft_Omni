
migrate((app) => {
    const collection = app.findCollectionByNameOrId("maintenance_reports");

    collection.fields.add(new Field({
        "name": "schedule_hour",
        "type": "number",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
            "min": 0,
            "max": 23,
            "noDecimal": true
        }
    }));

    collection.fields.add(new Field({
        "name": "schedule_weekdays",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
            "maxSize": 2000000
        }
    }));

    collection.fields.add(new Field({
        "name": "schedule_month_type",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
            "min": null,
            "max": null,
            "pattern": ""
        }
    }));

    collection.fields.add(new Field({
        "name": "custom_date",
        "type": "date",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
            "min": "",
            "max": ""
        }
    }));

    return app.save(collection);
}, (app) => {
    const collection = app.findCollectionByNameOrId("maintenance_reports");

    const fields = ["schedule_hour", "schedule_weekdays", "schedule_month_type", "custom_date"];
    fields.forEach(name => {
        const field = collection.fields.getByName(name);
        if (field) {
            collection.fields.removeById(field.id);
        }
    });

    return app.save(collection);
})
