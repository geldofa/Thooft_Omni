/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  // Note: System collections (_mfas, _otps, _externalAuths, _authOrigins, _superusers)
  // are auto-created by PocketBase on first boot and must NOT be redefined here.
  const collections = [
    {
      "id": "users000000000001",
      "system": false,
      "type": "auth",
      "name": "users",
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
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text1579384326",
          "max": 0,
          "min": 0,
          "name": "name",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        },
        {
          "hidden": false,
          "id": "file376926767",
          "maxSelect": 1,
          "maxSize": 0,
          "mimeTypes": ["image/jpeg", "image/png", "image/svg+xml", "image/gif", "image/webp"],
          "name": "avatar",
          "presentable": false,
          "protected": false,
          "required": false,
          "system": false,
          "thumbs": null,
          "type": "file"
        },
        {
          "hidden": false,
          "id": "select4234026498",
          "maxSelect": 1,
          "name": "role",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "select",
          "values": ["Admin", "Meestergast", "Operator"]
        },
        {
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text2110028989",
          "max": 0,
          "min": 0,
          "name": "press",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        },
        {
          "cascadeDelete": false,
          "collectionId": "persen000000001",
          "hidden": false,
          "id": "relation3496103353",
          "maxSelect": 1,
          "minSelect": 0,
          "name": "pers",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "relation"
        },
        {
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text_plain_password",
          "max": 0,
          "min": 0,
          "name": "plain_password",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        },
        {
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text_operator_id",
          "max": 0,
          "min": 0,
          "name": "operator_id",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        }
      ],
      "indexes": [],
      "listRule": "",
      "viewRule": "",
      "createRule": "",
      "updateRule": "@request.auth.id != ''",
      "deleteRule": "@request.auth.id != ''",
      "options": {},
      "passwordAuth": {
        "enabled": true,
        "identityFields": ["username", "email"]
      },
      "oauth2": {
        "providers": [],
        "mappedFields": { "id": "", "name": "", "username": "", "avatarURL": "" },
        "enabled": false
      },
      "mfa": { "enabled": false, "duration": 1800, "rule": "" },
      "otp": { "enabled": false, "duration": 180, "length": 8 },
      "authRule": ""
    },
    {
      "id": "persen000000001",
      "system": false,
      "type": "base",
      "name": "persen",
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
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text4232952120",
          "max": 0,
          "min": 0,
          "name": "naam",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": true,
          "system": false,
          "type": "text"
        },
        {
          "hidden": false,
          "id": "select2063623452",
          "maxSelect": 0,
          "name": "status",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "select",
          "values": ["actief", "niet actief"]
        },
        {
          "hidden": false,
          "id": "json488299729",
          "maxSize": 0,
          "name": "category_order",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "json"
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
    },
    {
      "id": "operat000000001",
      "system": false,
      "type": "base",
      "name": "operatoren",
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
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text4232952120",
          "max": 0,
          "min": 0,
          "name": "naam",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": true,
          "system": false,
          "type": "text"
        },
        {
          "hidden": false,
          "id": "number1583193895",
          "max": 99,
          "min": 1,
          "name": "interne_id",
          "onlyInt": false,
          "presentable": false,
          "required": false,
          "system": false,
          "type": "number"
        },
        {
          "hidden": false,
          "id": "select1179941808",
          "maxSelect": 0,
          "name": "dienstverband",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "select",
          "values": ["Intern", "Extern"]
        },
        {
          "hidden": false,
          "id": "bool1260321794",
          "name": "active",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "bool"
        },
        {
          "hidden": false,
          "id": "json2558999997",
          "maxSize": 0,
          "name": "presses",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "json"
        },
        {
          "hidden": false,
          "id": "bool1378303622",
          "name": "can_edit_tasks",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "bool"
        },
        {
          "hidden": false,
          "id": "bool1718557907",
          "name": "can_access_management",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "bool"
        },
        {
          "cascadeDelete": false,
          "collectionId": "users000000000001",
          "hidden": false,
          "id": "relation1508115251",
          "maxSelect": 1,
          "minSelect": 0,
          "name": "linked_user",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "relation"
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
    },
    {
      "id": "ploegen00000001",
      "system": false,
      "type": "base",
      "name": "ploegen",
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
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text4232952120",
          "max": 0,
          "min": 0,
          "name": "naam",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": true,
          "system": false,
          "type": "text"
        },
        {
          "cascadeDelete": false,
          "collectionId": "persen000000001",
          "hidden": false,
          "id": "relation3496103353",
          "maxSelect": 0,
          "minSelect": 0,
          "name": "pers",
          "presentable": false,
          "required": true,
          "system": false,
          "type": "relation"
        },
        {
          "cascadeDelete": false,
          "collectionId": "operat000000001",
          "hidden": false,
          "id": "relation1799805473",
          "maxSelect": 3,
          "minSelect": 0,
          "name": "leden",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "relation"
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
    },
    {
      "id": "catego000000001",
      "system": false,
      "type": "base",
      "name": "categorieen",
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
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text4232952120",
          "max": 0,
          "min": 0,
          "name": "naam",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": true,
          "system": false,
          "type": "text"
        },
        {
          "cascadeDelete": false,
          "collectionId": "persen000000001",
          "hidden": false,
          "id": "relation3496103353",
          "maxSelect": 10,
          "minSelect": 0,
          "name": "pers_ids",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "relation"
        },
        {
          "hidden": false,
          "id": "json_subtexts_001",
          "maxSize": 0,
          "name": "subtexts",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "json"
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
    },
    {
      "id": "onderh000000001",
      "system": false,
      "type": "base",
      "name": "onderhoud",
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
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text1384045349",
          "max": 0,
          "min": 0,
          "name": "task",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": true,
          "system": false,
          "type": "text"
        },
        {
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text4259315622",
          "max": 0,
          "min": 0,
          "name": "task_subtext",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        },
        {
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text2345380270",
          "max": 0,
          "min": 0,
          "name": "subtask",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        },
        {
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text1184577734",
          "max": 0,
          "min": 0,
          "name": "subtask_subtext",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        },
        {
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text2490651244",
          "max": 0,
          "min": 0,
          "name": "comment",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        },
        {
          "hidden": false,
          "id": "date1018557222",
          "max": "",
          "min": "",
          "name": "last_date",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "date"
        },
        {
          "hidden": false,
          "id": "date2483978656",
          "max": "",
          "min": "",
          "name": "next_date",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "date"
        },
        {
          "hidden": false,
          "id": "number432467915",
          "max": null,
          "min": null,
          "name": "interval",
          "onlyInt": false,
          "presentable": false,
          "required": false,
          "system": false,
          "type": "number"
        },
        {
          "hidden": false,
          "id": "select2674243334",
          "maxSelect": 0,
          "name": "interval_unit",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "select",
          "values": ["Dagen", "Weken", "Maanden", "Jaren"]
        },
        {
          "cascadeDelete": false,
          "collectionId": "persen000000001",
          "hidden": false,
          "id": "relation3496103353",
          "maxSelect": 0,
          "minSelect": 0,
          "name": "pers",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "relation"
        },
        {
          "cascadeDelete": false,
          "collectionId": "catego000000001",
          "hidden": false,
          "id": "relation105650625",
          "maxSelect": 0,
          "minSelect": 0,
          "name": "category",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "relation"
        },
        {
          "cascadeDelete": false,
          "collectionId": "operat000000001",
          "hidden": false,
          "id": "relation2863374728",
          "maxSelect": 999,
          "minSelect": 0,
          "name": "assigned_operator",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "relation"
        },
        {
          "cascadeDelete": false,
          "collectionId": "ploegen00000001",
          "hidden": false,
          "id": "relation764959974",
          "maxSelect": 0,
          "minSelect": 0,
          "name": "assigned_team",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "relation"
        },
        {
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text3267509033",
          "max": 0,
          "min": 0,
          "name": "opmerkingen",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        },
        {
          "hidden": false,
          "id": "date2824192398",
          "max": "",
          "min": "",
          "name": "commentDate",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "date"
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
        },
        {
          "hidden": false,
          "id": "number1169138922",
          "max": 1000,
          "min": 0,
          "name": "sort_order",
          "onlyInt": false,
          "presentable": false,
          "required": false,
          "system": false,
          "type": "number"
        },
        {
          "hidden": false,
          "id": "bool_is_external",
          "name": "is_external",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "bool"
        },
        {
          "cascadeDelete": false,
          "collectionId": "tags00000000001",
          "hidden": false,
          "id": "relation_tags",
          "maxSelect": null,
          "minSelect": 0,
          "name": "tags",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "relation"
        }
      ],
      "indexes": [],
      "listRule": "",
      "viewRule": "",
      "createRule": "",
      "updateRule": "",
      "deleteRule": "",
      "options": {}
    },
    {
      "id": "drukw0000000001",
      "system": false,
      "type": "base",
      "name": "drukwerken",
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
          "hidden": false,
          "id": "number1581467836",
          "max": null,
          "min": null,
          "name": "order_nummer",
          "onlyInt": false,
          "presentable": false,
          "required": true,
          "system": false,
          "type": "number"
        },
        {
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text2952383652",
          "max": 0,
          "min": 0,
          "name": "klant_order_beschrijving",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        },
        {
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text588074085",
          "max": 0,
          "min": 0,
          "name": "versie",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        },
        {
          "hidden": false,
          "id": "number3448404693",
          "max": null,
          "min": null,
          "name": "blz",
          "onlyInt": false,
          "presentable": false,
          "required": false,
          "system": false,
          "type": "number"
        },
        {
          "hidden": false,
          "id": "number4002346712",
          "max": null,
          "min": null,
          "name": "ex_omw",
          "onlyInt": false,
          "presentable": false,
          "required": false,
          "system": false,
          "type": "number"
        },
        {
          "hidden": false,
          "id": "number981402410",
          "max": null,
          "min": null,
          "name": "netto_oplage",
          "onlyInt": false,
          "presentable": false,
          "required": false,
          "system": false,
          "type": "number"
        },
        {
          "hidden": false,
          "id": "bool3001764897",
          "name": "opstart",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "bool"
        },
        {
          "hidden": false,
          "id": "number2220578519",
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
          "id": "number2201391822",
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
          "id": "number2247970853",
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
          "id": "number4076495027",
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
          "id": "number4096893528",
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
          "id": "number2476462252",
          "max": null,
          "min": null,
          "name": "max_bruto",
          "onlyInt": false,
          "presentable": false,
          "required": false,
          "system": false,
          "type": "number"
        },
        {
          "hidden": false,
          "id": "number3708644343",
          "max": null,
          "min": null,
          "name": "groen",
          "onlyInt": false,
          "presentable": false,
          "required": false,
          "system": false,
          "type": "number"
        },
        {
          "hidden": false,
          "id": "number188999999",
          "max": null,
          "min": null,
          "name": "rood",
          "onlyInt": false,
          "presentable": false,
          "required": false,
          "system": false,
          "type": "number"
        },
        {
          "hidden": false,
          "id": "number2521038553",
          "max": null,
          "min": null,
          "name": "delta",
          "onlyInt": false,
          "presentable": false,
          "required": false,
          "system": false,
          "type": "number"
        },
        {
          "hidden": false,
          "id": "number4016564101",
          "max": null,
          "min": null,
          "name": "delta_percent",
          "onlyInt": false,
          "presentable": false,
          "required": false,
          "system": false,
          "type": "number"
        },
        {
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text2067855703",
          "max": 0,
          "min": 0,
          "name": "opmerking",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
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
        },
        {
          "cascadeDelete": false,
          "collectionId": "persen000000001",
          "hidden": false,
          "id": "relation3496103353",
          "maxSelect": 1,
          "minSelect": 0,
          "name": "pers",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "relation"
        },
        {
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text_date_field",
          "max": 0,
          "min": 0,
          "name": "date",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        },
        {
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text_datum_field",
          "max": 0,
          "min": 0,
          "name": "datum",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        }
      ],
      "indexes": [],
      "listRule": "@request.auth.id != \"\" && (@request.auth.role = \"Admin\" || @request.auth.role = \"Meestergast\" || (@request.auth.role = \"Operator\" && pers = @request.auth.pers))",
      "viewRule": "@request.auth.id != \"\" && (@request.auth.role = \"Admin\" || @request.auth.role = \"Meestergast\" || (@request.auth.role = \"Operator\" && pers = @request.auth.pers))",
      "createRule": "@request.auth.id != ''",
      "updateRule": "@request.auth.id != ''",
      "deleteRule": "@request.auth.id != ''",
      "options": {}
    },
    {
      "id": "pbc_2456230977",
      "system": false,
      "type": "base",
      "name": "feedback",
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
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text2363381545",
          "max": 0,
          "min": 0,
          "name": "type",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        },
        {
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text3065852031",
          "max": 0,
          "min": 0,
          "name": "message",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        },
        {
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text2375276105",
          "max": 0,
          "min": 0,
          "name": "user",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        },
        {
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text2063623452",
          "max": 0,
          "min": 0,
          "name": "status",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        },
        {
          "hidden": false,
          "id": "json3797779838",
          "maxSize": 0,
          "name": "context",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "json"
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
        },
        {
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text1346949349",
          "max": 0,
          "min": 0,
          "name": "admin_comment",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        },
        {
          "hidden": false,
          "id": "bool1639016958",
          "name": "archived",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "bool"
        }
      ],
      "indexes": [],
      "listRule": "@request.auth.id != ''",
      "viewRule": "@request.auth.id != ''",
      "createRule": "@request.auth.id != ''",
      "updateRule": "@request.auth.role = 'Admin'",
      "deleteRule": "@request.auth.role = 'Admin'",
      "options": {}
    },
    {
      "id": "pbc_444539071",
      "system": false,
      "type": "base",
      "name": "activity_logs",
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
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text2375276105",
          "max": 0,
          "min": 0,
          "name": "user",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        },
        {
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text1204587666",
          "max": 0,
          "min": 0,
          "name": "action",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        },
        {
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text237519976",
          "max": 0,
          "min": 0,
          "name": "entity",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        },
        {
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text1915095946",
          "max": 0,
          "min": 0,
          "name": "details",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
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
        },
        {
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text4129827324",
          "max": 0,
          "min": 0,
          "name": "entityId",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        },
        {
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text3455428709",
          "max": 0,
          "min": 0,
          "name": "entityName",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        },
        {
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text2110028989",
          "max": 0,
          "min": 0,
          "name": "press",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        },
        {
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text2836301454",
          "max": 0,
          "min": 0,
          "name": "oldValue",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        },
        {
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text1971237878",
          "max": 0,
          "min": 0,
          "name": "newValue",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        }
      ],
      "indexes": [],
      "listRule": "",
      "viewRule": "",
      "createRule": "",
      "updateRule": "",
      "deleteRule": "",
      "options": {}
    },
    {
      "id": "pressparam00001",
      "system": false,
      "type": "base",
      "name": "press_parameters",
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
    },
    {
      "id": "tags00000000001",
      "name": "tags",
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
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text4232952120",
          "max": 0,
          "min": 0,
          "name": "naam",
          "pattern": "",
          "presentable": true,
          "primaryKey": false,
          "required": true,
          "system": false,
          "type": "text"
        },
        {
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text1184577734",
          "max": 0,
          "min": 0,
          "name": "kleur",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        },
        {
          "hidden": false,
          "id": "bool1260321794",
          "name": "active",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "bool"
        },
        {
          "hidden": false,
          "id": "bool_system_managed",
          "name": "system_managed",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "bool"
        },
        {
          "hidden": false,
          "id": "json_highlights",
          "maxSize": 0,
          "name": "highlights",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "json"
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
      "listRule": "@request.auth.id != \"\"",
      "viewRule": "@request.auth.id != \"\"",
      "createRule": "@request.auth.id != \"\"",
      "updateRule": "@request.auth.id != \"\"",
      "deleteRule": "@request.auth.id != \"\""
    },
    {
      "id": "app_settings001",
      "name": "app_settings",
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
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text_key_field",
          "max": 0,
          "min": 0,
          "name": "key",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": true,
          "system": false,
          "type": "text"
        },
        {
          "hidden": false,
          "id": "json_value_field",
          "maxSize": 0,
          "name": "value",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "json"
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
      "indexes": [
        "CREATE UNIQUE INDEX `idx_app_settings_key` ON `app_settings` (`key`)"
      ],
      "listRule": "",
      "viewRule": "",
      "createRule": "@request.auth.id != ''",
      "updateRule": "@request.auth.id != ''",
      "deleteRule": "@request.auth.id != ''"
    },
    {
      "id": "pbc_calculated_fields",
      "name": "calculated_fields",
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
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text_cf_name",
          "max": 0,
          "min": 0,
          "name": "name",
          "pattern": "",
          "presentable": true,
          "primaryKey": false,
          "required": true,
          "system": false,
          "type": "text"
        },
        {
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text_cf_formula",
          "max": 0,
          "min": 0,
          "name": "formula",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": true,
          "system": false,
          "type": "text"
        },
        {
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text_cf_target",
          "max": 0,
          "min": 0,
          "name": "targetColumn",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
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
      "deleteRule": ""
    },
    {
      "id": "pbc_maintenance_reports",
      "name": "maintenance_reports",
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
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text_mr_name",
          "max": 0,
          "min": 0,
          "name": "name",
          "pattern": "",
          "presentable": true,
          "primaryKey": false,
          "required": true,
          "system": false,
          "type": "text"
        },
        {
          "cascadeDelete": false,
          "collectionId": "persen000000001",
          "hidden": false,
          "id": "relation_mr_press",
          "maxSelect": 0,
          "minSelect": 0,
          "name": "press_ids",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "relation"
        },
        {
          "hidden": false,
          "id": "select_mr_period",
          "maxSelect": 1,
          "name": "period",
          "presentable": false,
          "required": true,
          "system": false,
          "type": "select",
          "values": ["day", "week", "month", "year"]
        },
        {
          "hidden": false,
          "id": "bool_mr_autogen",
          "name": "auto_generate",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "bool"
        },
        {
          "hidden": false,
          "id": "number_mr_schedday",
          "max": 31,
          "min": 1,
          "name": "schedule_day",
          "onlyInt": false,
          "presentable": false,
          "required": false,
          "system": false,
          "type": "number"
        },
        {
          "hidden": false,
          "id": "date_mr_lastrun",
          "max": "",
          "min": "",
          "name": "last_run",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "date"
        },
        {
          "hidden": false,
          "id": "bool_mr_email",
          "name": "email_enabled",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "bool"
        },
        {
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text_mr_recipients",
          "max": 0,
          "min": 0,
          "name": "email_recipients",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        },
        {
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text_mr_subject",
          "max": 0,
          "min": 0,
          "name": "email_subject",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        },
        {
          "hidden": false,
          "id": "bool_mr_rolling",
          "name": "is_rolling",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "bool"
        },
        {
          "hidden": false,
          "id": "number_mr_offset",
          "max": null,
          "min": null,
          "name": "period_offset",
          "onlyInt": false,
          "presentable": false,
          "required": false,
          "system": false,
          "type": "number"
        },
        {
          "hidden": false,
          "id": "number_mr_schedhour",
          "max": 23,
          "min": 0,
          "name": "schedule_hour",
          "onlyInt": false,
          "presentable": false,
          "required": false,
          "system": false,
          "type": "number"
        },
        {
          "hidden": false,
          "id": "json_mr_weekdays",
          "maxSize": 0,
          "name": "schedule_weekdays",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "json"
        },
        {
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text_mr_monthtype",
          "max": 0,
          "min": 0,
          "name": "schedule_month_type",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        },
        {
          "hidden": false,
          "id": "date_mr_custom",
          "max": "",
          "min": "",
          "name": "custom_date",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "date"
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
      "listRule": "@request.auth.id != ''",
      "viewRule": "@request.auth.id != ''",
      "createRule": "@request.auth.id != ''",
      "updateRule": "@request.auth.id != ''",
      "deleteRule": "@request.auth.id != ''"
    },
    {
      "id": "pbc_report_files",
      "name": "report_files",
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
          "hidden": false,
          "id": "file_rf_file",
          "maxSelect": 1,
          "maxSize": 5242880,
          "mimeTypes": ["application/pdf"],
          "name": "file",
          "presentable": false,
          "protected": false,
          "required": true,
          "system": false,
          "thumbs": null,
          "type": "file"
        },
        {
          "cascadeDelete": true,
          "collectionId": "pbc_maintenance_reports",
          "hidden": false,
          "id": "relation_rf_report",
          "maxSelect": 1,
          "minSelect": 0,
          "name": "maintenance_report",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "relation"
        },
        {
          "hidden": false,
          "id": "date_rf_generated",
          "max": "",
          "min": "",
          "name": "generated_at",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "date"
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
      "listRule": "@request.auth.id != ''",
      "viewRule": "@request.auth.id != ''",
      "createRule": "@request.auth.id != ''",
      "updateRule": "@request.auth.id != ''",
      "deleteRule": "@request.auth.id != ''"
    }
  ];

  app.importCollections(collections, false);

  // ── Seed default data ──────────────────────────────────────────────
  const seed = (colName, filter, data) => {
    try {
      app.findFirstRecordByFilter(colName, filter);
    } catch (_) {
      const collection = app.findCollectionByNameOrId(colName);
      const record = new Record(collection);
      for (let key in data) record.set(key, data[key]);
      app.save(record);
    }
  };

  // Default app settings
  seed("app_settings", "key = 'testing_mode'", { "key": "testing_mode", "value": false });

  // Default "Extern" tag
  seed("tags", "naam = 'Extern'", { "naam": "Extern", "kleur": "#ef4444", "active": true, "system_managed": true });

  // Default calculated field formulas
  const cfCollection = app.findCollectionByNameOrId("calculated_fields");
  [
    {
      "name": "Max Bruto",
      "formula": "IF(startup, Opstart * exOmw, 0) + netRun + (netRun * Marge) + (c4_4 * exOmw * param_4_4) + (c4_0 * exOmw * param_4_0) + (c1_0 * exOmw * param_1_0) + (c1_1 * exOmw * param_1_1) + (c4_1 * exOmw * param_4_1)",
      "targetColumn": "maxGross"
    },
    { "name": "Delta Number", "formula": "green + red - maxGross", "targetColumn": "delta_number" },
    { "name": "Delta Percentage", "formula": "(green + red) / maxGross", "targetColumn": "delta_percentage" }
  ].forEach(item => {
    try {
      app.findFirstRecordByFilter("calculated_fields", `name = "${item.name}"`);
    } catch (_) {
      const r = new Record(cfCollection);
      r.set("name", item.name);
      r.set("formula", item.formula);
      r.set("targetColumn", item.targetColumn);
      app.save(r);
    }
  });

  // Service Account Sync
  try {
    let record;
    try {
      record = app.findFirstRecordByFilter("users", 'email = "geldofa@gmail.com" || username = "admin"');
    } catch (_) {
      record = null;
    }
    if (!record) {
      const usersCol = app.findCollectionByNameOrId("users");
      record = new Record(usersCol);
      record.set("email", "geldofa@gmail.com");
      record.set("username", "admin");
      record.set("password", "admin_password");
      record.set("passwordConfirm", "admin_password");
      record.set("verified", true);
    }
    record.set("role", "Admin");
    app.save(record);
  } catch (e) { console.error("Service account sync error:", e); }

}, (app) => {
  return null;
});
