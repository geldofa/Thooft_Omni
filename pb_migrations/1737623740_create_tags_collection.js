migrate((app) => {
    const collection = new Collection({
        "id": "tags00000000001",
        "name": "tags",
        "type": "base",
        "system": false,
        "fields": [
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
            }
        ],
        "listRule": "@request.auth.id != \"\"",
        "viewRule": "@request.auth.id != \"\"",
        "createRule": "@request.auth.id != \"\"",
        "updateRule": "@request.auth.id != \"\"",
        "deleteRule": "@request.auth.id != \"\"",
        "options": {}
    });

    return app.save(collection);
}, (app) => {
    const collection = app.findCollectionByNameOrId("tags");
    return app.delete(collection);
})
