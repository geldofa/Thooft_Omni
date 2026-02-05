
migrate((app) => {
    const collections = [
        {
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
                    "primaryKey": true,
                    "autogeneratePattern": "[a-z0-9]{15}"
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
                    "id": "bool_system_managed",
                    "name": "system_managed",
                    "type": "bool",
                    "system": false,
                    "required": false,
                    "presentable": false
                },
                {
                    "id": "json_highlights_tag",
                    "name": "highlights",
                    "type": "json",
                    "system": false,
                    "required": false,
                    "presentable": false
                }
            ],
            "listRule": "",
            "viewRule": "",
            "createRule": "",
            "updateRule": "",
            "deleteRule": ""
        }
    ];

    return app.importCollections(collections, false);
}, (app) => {
    const collection = app.findCollectionByNameOrId("tags");
    collection.fields = collection.fields.filter(f => f.name !== "highlights");
    return app.save(collection);
});
