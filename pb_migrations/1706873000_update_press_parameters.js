/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
    const collectionData = [{
        "id": "pressparam00001",
        "name": "press_parameters",
        "type": "base",
        "system": false,
        "fields": [
            {
                "autogeneratePattern": "[a-z0-9]{15}",
                "hidden": false,
                "id": "text3208210256",
                "max": 15,
                "min": 15,
                "name": "id",
                "pattern": "^[a-z0-9]+$",
                "presentable": false,
                "primaryKey": true,
                "required": true,
                "system": true,
                "type": "text"
            },
            {
                "cascadeDelete": false,
                "collectionId": "persen000000001",
                "hidden": false,
                "id": "relation_press",
                "maxSelect": 1,
                "minSelect": 0,
                "name": "press",
                "presentable": false,
                "required": false,
                "system": false,
                "type": "relation"
            },
            {
                "autogeneratePattern": "",
                "hidden": false,
                "id": "field_marge",
                "max": 0,
                "min": 0,
                "name": "marge",
                "pattern": "",
                "presentable": false,
                "primaryKey": false,
                "required": false,
                "system": false,
                "type": "text"
            },
            {
                "hidden": false,
                "id": "field_opstart",
                "max": null,
                "min": null,
                "name": "opstart",
                "onlyInt": false,
                "presentable": false,
                "required": false,
                "system": false,
                "type": "number"
            },
            {
                "hidden": false,
                "id": "field_k_4_4",
                "max": null,
                "min": null,
                "name": "k_4_4",
                "onlyInt": false,
                "presentable": false,
                "required": false,
                "system": false,
                "type": "number"
            },
            {
                "hidden": false,
                "id": "field_k_4_0",
                "max": null,
                "min": null,
                "name": "k_4_0",
                "onlyInt": false,
                "presentable": false,
                "required": false,
                "system": false,
                "type": "number"
            },
            {
                "hidden": false,
                "id": "field_k_1_0",
                "max": null,
                "min": null,
                "name": "k_1_0",
                "onlyInt": false,
                "presentable": false,
                "required": false,
                "system": false,
                "type": "number"
            },
            {
                "hidden": false,
                "id": "field_k_1_1",
                "max": null,
                "min": null,
                "name": "k_1_1",
                "onlyInt": false,
                "presentable": false,
                "required": false,
                "system": false,
                "type": "number"
            },
            {
                "hidden": false,
                "id": "field_k_4_1",
                "max": null,
                "min": null,
                "name": "k_4_1",
                "onlyInt": false,
                "presentable": false,
                "required": false,
                "system": false,
                "type": "number"
            },
            {
                "hidden": false,
                "id": "autodate2990389176",
                "name": "created",
                "onCreate": true,
                "onUpdate": false,
                "presentable": false,
                "system": true,
                "type": "autodate"
            },
            {
                "hidden": false,
                "id": "autodate3332085495",
                "name": "updated",
                "onCreate": true,
                "onUpdate": true,
                "presentable": false,
                "system": true,
                "type": "autodate"
            }
        ],
        "indexes": [],
        "listRule": "",
        "viewRule": "",
        "createRule": "",
        "updateRule": "",
        "deleteRule": "",
        "options": {}
    }
    ];

    app.importCollections(collectionData, false);
}, (app) => {
    // optionally revert
});
