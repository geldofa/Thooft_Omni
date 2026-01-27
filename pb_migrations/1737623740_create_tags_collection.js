migrate((app) => {
    const collection = new Collection({
        "id": "tags00000000001",
        "name": "tags",
        "type": "base",
        "system": false,
        "fields": [
            {
                "id": "text3208210256",
                "name": "id",
                "type": "text",
                "system": true,
                "required": true,
                "presentable": false,
                "primaryKey": true
            },
            {
                "id": "text4232952120",
                "name": "naam",
                "type": "text",
                "system": false,
                "required": true,
                "presentable": true
            },
            {
                "id": "text1184577734",
                "name": "kleur",
                "type": "text",
                "system": false,
                "required": false,
                "presentable": false
            },
            {
                "id": "bool1260321794",
                "name": "active",
                "type": "bool",
                "system": false,
                "required": false,
                "presentable": false
            },
            {
                "id": "autodate2990389176",
                "name": "created",
                "type": "autodate",
                "system": true,
                "required": false,
                "presentable": false,
                "onCreate": true,
                "onUpdate": false
            },
            {
                "id": "autodate3332085495",
                "name": "updated",
                "type": "autodate",
                "system": true,
                "required": false,
                "presentable": false,
                "onCreate": true,
                "onUpdate": true
            }
        ],
        "listRule": "",
        "viewRule": "",
        "createRule": "",
        "updateRule": "",
        "deleteRule": "",
        "options": {}
    });

    return app.save(collection);
}, (app) => {
    const collection = app.findCollectionByNameOrId("tags");
    return app.delete(collection);
})
