/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  // Note: System collections (_mfas, _otps, _externalAuths, _authOrigins, _superusers)
  // are auto-created by PocketBase on first boot. Do NOT include them here.
  const collections = [
    {
      "id": "users000000000001",
      "name": "users",
      "type": "auth",
      "system": false,
      "fields": [
        { "id": "text3208210256", "name": "id", "type": "text", "system": true, "primaryKey": true, "autogeneratePattern": "[a-z0-9]{15}" },
        { "name": "name", "type": "text" },
        { "name": "avatar", "type": "file" },
        { "name": "role", "type": "select", "values": ["Admin", "Meestergast", "Operator"] },
        { "name": "press", "type": "text" },
        { "name": "pers", "type": "relation", "collectionId": "persen000000001", "maxSelect": 1 },
        { "name": "plain_password", "type": "text" },
        { "name": "operator_id", "type": "text" }
      ],
      "listRule": "", "viewRule": "", "createRule": "", "updateRule": "@request.auth.id != ''", "deleteRule": "@request.auth.id != ''"
    },
    {
      "id": "persen000000001",
      "name": "persen",
      "type": "base",
      "fields": [
        { "id": "text3208210256", "name": "id", "type": "text", "system": true, "primaryKey": true, "autogeneratePattern": "[a-z0-9]{15}" },
        { "name": "naam", "type": "text", "required": true },
        { "name": "status", "type": "select", "values": ["actief", "niet actief"] },
        { "name": "category_order", "type": "json" }
      ],
      "listRule": "", "viewRule": "", "createRule": "", "updateRule": "", "deleteRule": ""
    },
    {
      "id": "operat000000001",
      "name": "operatoren",
      "type": "base",
      "fields": [
        { "id": "text3208210256", "name": "id", "type": "text", "system": true, "primaryKey": true, "autogeneratePattern": "[a-z0-9]{15}" },
        { "name": "naam", "type": "text", "required": true },
        { "name": "interne_id", "type": "number", "min": 1, "max": 99 },
        { "name": "dienstverband", "type": "select", "values": ["Intern", "Extern"] },
        { "name": "active", "type": "bool" },
        { "name": "presses", "type": "json" },
        { "name": "can_edit_tasks", "type": "bool" },
        { "name": "can_access_management", "type": "bool" },
        { "name": "linked_user", "type": "relation", "collectionId": "users000000000001", "maxSelect": 1 }
      ],
      "listRule": "", "viewRule": "", "createRule": "", "updateRule": "", "deleteRule": ""
    },
    {
      "id": "ploegen00000001",
      "name": "ploegen",
      "type": "base",
      "fields": [
        { "id": "text3208210256", "name": "id", "type": "text", "system": true, "primaryKey": true, "autogeneratePattern": "[a-z0-9]{15}" },
        { "name": "naam", "type": "text", "required": true },
        { "name": "pers", "type": "relation", "collectionId": "persen000000001", "required": true },
        { "name": "leden", "type": "relation", "collectionId": "operat000000001", "maxSelect": 3 }
      ],
      "listRule": "", "viewRule": "", "createRule": "", "updateRule": "", "deleteRule": ""
    },
    {
      "id": "catego000000001",
      "name": "categorieen",
      "type": "base",
      "fields": [
        { "id": "text3208210256", "name": "id", "type": "text", "system": true, "primaryKey": true, "autogeneratePattern": "[a-z0-9]{15}" },
        { "name": "naam", "type": "text", "required": true },
        { "id": "relation3496103353", "name": "pers_ids", "type": "relation", "collectionId": "persen000000001", "maxSelect": 10 },
        { "name": "subtexts", "type": "json" }
      ],
      "listRule": "", "viewRule": "", "createRule": "", "updateRule": "", "deleteRule": ""
    },
    {
      "id": "onderh000000001",
      "name": "onderhoud",
      "type": "base",
      "fields": [
        { "id": "text3208210256", "name": "id", "type": "text", "system": true, "primaryKey": true, "autogeneratePattern": "[a-z0-9]{15}" },
        { "name": "task", "type": "text", "required": true },
        { "name": "task_subtext", "type": "text" },
        { "name": "subtask", "type": "text" },
        { "name": "subtask_subtext", "type": "text" },
        { "name": "comment", "type": "text" },
        { "name": "last_date", "type": "date" },
        { "name": "next_date", "type": "date" },
        { "name": "interval", "type": "number" },
        { "name": "interval_unit", "type": "select", "values": ["Dagen", "Weken", "Maanden", "Jaren"] },
        { "name": "pers", "type": "relation", "collectionId": "persen000000001" },
        { "name": "category", "type": "relation", "collectionId": "catego000000001" },
        { "name": "assigned_operator", "type": "relation", "collectionId": "operat000000001", "maxSelect": 999 },
        { "name": "assigned_team", "type": "relation", "collectionId": "ploegen00000001" },
        { "name": "opmerkingen", "type": "text" },
        { "name": "commentDate", "type": "date" },
        { "name": "sort_order", "type": "number", "max": 1000 },
        { "name": "is_external", "type": "bool" },
        { "id": "relation_tags", "name": "tags", "type": "relation", "collectionId": "tags00000000001" }
      ],
      "listRule": "", "viewRule": "", "createRule": "", "updateRule": "", "deleteRule": ""
    },
    {
      "id": "drukw0000000001",
      "name": "drukwerken",
      "type": "base",
      "fields": [
        { "id": "text3208210256", "name": "id", "type": "text", "system": true, "primaryKey": true, "autogeneratePattern": "[a-z0-9]{15}" },
        { "name": "order_nummer", "type": "number", "required": true },
        { "name": "klant_order_beschrijving", "type": "text" },
        { "name": "versie", "type": "text" },
        { "name": "blz", "type": "number" },
        { "name": "ex_omw", "type": "number" },
        { "name": "netto_oplage", "type": "number" },
        { "name": "opstart", "type": "bool" },
        { "name": "k_4_4", "type": "number" },
        { "name": "k_4_0", "type": "number" },
        { "name": "k_1_0", "type": "number" },
        { "name": "k_1_1", "type": "number" },
        { "name": "k_4_1", "type": "number" },
        { "name": "max_bruto", "type": "number" },
        { "name": "groen", "type": "number" },
        { "name": "rood", "type": "number" },
        { "name": "delta", "type": "number" },
        { "name": "delta_percent", "type": "number" },
        { "name": "opmerking", "type": "text" },
        { "name": "pers", "type": "relation", "collectionId": "persen000000001", "maxSelect": 1 },
        { "name": "date", "type": "text" },
        { "name": "datum", "type": "text" }
      ],
      "listRule": "@request.auth.id != \"\" && (@request.auth.role = \"Admin\" || @request.auth.role = \"Meestergast\" || (@request.auth.role = \"Operator\" && pers = @request.auth.pers))",
      "viewRule": "@request.auth.id != \"\" && (@request.auth.role = \"Admin\" || @request.auth.role = \"Meestergast\" || (@request.auth.role = \"Operator\" && pers = @request.auth.pers))",
      "createRule": "@request.auth.id != ''", "updateRule": "@request.auth.id != ''", "deleteRule": "@request.auth.id != ''"
    },
    {
      "id": "pbc_2456230977",
      "name": "feedback",
      "type": "base",
      "fields": [
        { "id": "text3208210256", "name": "id", "type": "text", "system": true, "primaryKey": true, "autogeneratePattern": "[a-z0-9]{15}" },
        { "name": "type", "type": "text" },
        { "name": "message", "type": "text" },
        { "name": "user", "type": "text" },
        { "name": "status", "type": "text" },
        { "name": "context", "type": "json" },
        { "name": "admin_comment", "type": "text" },
        { "name": "archived", "type": "bool" }
      ],
      "listRule": "@request.auth.id != ''", "viewRule": "@request.auth.id != ''", "createRule": "@request.auth.id != ''", "updateRule": "@request.auth.role = 'Admin'", "deleteRule": "@request.auth.role = 'Admin'"
    },
    {
      "id": "pbc_444539071",
      "name": "activity_logs",
      "type": "base",
      "fields": [
        { "id": "text3208210256", "name": "id", "type": "text", "system": true, "primaryKey": true, "autogeneratePattern": "[a-z0-9]{15}" },
        { "name": "user", "type": "text" },
        { "name": "action", "type": "text" },
        { "name": "entity", "type": "text" },
        { "name": "details", "type": "text" },
        { "name": "entityId", "type": "text" },
        { "name": "entityName", "type": "text" },
        { "name": "press", "type": "text" },
        { "name": "oldValue", "type": "text" },
        { "name": "newValue", "type": "text" }
      ],
      "listRule": "", "viewRule": "", "createRule": "", "updateRule": "", "deleteRule": ""
    },
    {
      "id": "pressparam00001",
      "name": "press_parameters",
      "type": "base",
      "fields": [
        { "id": "text3208210256", "name": "id", "type": "text", "system": true, "primaryKey": true, "autogeneratePattern": "[a-z0-9]{15}" },
        { "id": "relation_press", "name": "press", "type": "relation", "collectionId": "persen000000001", "maxSelect": 1 },
        { "id": "field_marge", "name": "marge", "type": "text" },
        { "id": "field_opstart", "name": "opstart", "type": "number" },
        { "id": "field_k_4_4", "name": "k_4_4", "type": "number" },
        { "id": "field_k_4_0", "name": "k_4_0", "type": "number" },
        { "id": "field_k_1_0", "name": "k_1_0", "type": "number" },
        { "id": "field_k_1_1", "name": "k_1_1", "type": "number" },
        { "id": "field_k_4_1", "name": "k_4_1", "type": "number" }
      ],
      "listRule": "", "viewRule": "", "createRule": "", "updateRule": "", "deleteRule": ""
    },
    {
      "id": "tags00000000001",
      "name": "tags",
      "type": "base",
      "fields": [
        { "id": "text3208210256", "name": "id", "type": "text", "system": true, "primaryKey": true, "autogeneratePattern": "[a-z0-9]{15}" },
        { "id": "text4232952120", "name": "naam", "type": "text", "required": true, "presentable": true },
        { "name": "kleur", "type": "text" },
        { "name": "active", "type": "bool" },
        { "name": "system_managed", "type": "bool" },
        { "name": "highlights", "type": "json" }
      ],
      "listRule": "@request.auth.id != \"\"", "viewRule": "@request.auth.id != \"\"", "createRule": "@request.auth.id != \"\"", "updateRule": "@request.auth.id != \"\"", "deleteRule": "@request.auth.id != \"\""
    },
    {
      "id": "app_settings001",
      "name": "app_settings",
      "type": "base",
      "fields": [
        { "id": "text3208210256", "name": "id", "type": "text", "system": true, "primaryKey": true, "autogeneratePattern": "[a-z0-9]{15}" },
        { "name": "key", "type": "text", "required": true },
        { "name": "value", "type": "json" }
      ],
      "indexes": [
        "CREATE UNIQUE INDEX `idx_app_settings_key` ON `app_settings` (`key`)"
      ],
      "listRule": "", "viewRule": "", "createRule": "@request.auth.id != ''", "updateRule": "@request.auth.id != ''", "deleteRule": "@request.auth.id != ''"
    },
    {
      "id": "pbc_calculated_fields",
      "name": "calculated_fields",
      "type": "base",
      "fields": [
        { "id": "text3208210256", "name": "id", "type": "text", "system": true, "primaryKey": true, "autogeneratePattern": "[a-z0-9]{15}" },
        { "name": "name", "type": "text", "required": true, "presentable": true },
        { "name": "formula", "type": "text", "required": true },
        { "name": "targetColumn", "type": "text" }
      ],
      "listRule": "", "viewRule": "", "createRule": "", "updateRule": "", "deleteRule": ""
    },
    {
      "id": "pbc_maintenance_reports",
      "name": "maintenance_reports",
      "type": "base",
      "fields": [
        { "id": "text3208210256", "name": "id", "type": "text", "system": true, "primaryKey": true, "autogeneratePattern": "[a-z0-9]{15}" },
        { "name": "name", "type": "text", "required": true, "presentable": true },
        { "name": "press_ids", "type": "relation", "collectionId": "persen000000001" },
        { "name": "period", "type": "select", "required": true, "values": ["day", "week", "month", "year"] },
        { "name": "auto_generate", "type": "bool" },
        { "name": "schedule_day", "type": "number", "min": 1, "max": 31 },
        { "name": "last_run", "type": "date" },
        { "name": "email_enabled", "type": "bool" },
        { "name": "email_recipients", "type": "text" },
        { "name": "email_subject", "type": "text" },
        { "name": "is_rolling", "type": "bool", "defaultValue": true },
        { "name": "period_offset", "type": "number" },
        { "name": "schedule_hour", "type": "number", "min": 0, "max": 23 },
        { "name": "schedule_weekdays", "type": "json" },
        { "name": "schedule_month_type", "type": "text" },
        { "name": "custom_date", "type": "date" }
      ],
      "listRule": "@request.auth.id != ''", "viewRule": "@request.auth.id != ''", "createRule": "@request.auth.id != ''", "updateRule": "@request.auth.id != ''", "deleteRule": "@request.auth.id != ''"
    },
    {
      "id": "pbc_report_files",
      "name": "report_files",
      "type": "base",
      "fields": [
        { "id": "text3208210256", "name": "id", "type": "text", "system": true, "primaryKey": true, "autogeneratePattern": "[a-z0-9]{15}" },
        { "name": "file", "type": "file", "required": true, "maxSelect": 1, "maxSize": 5242880, "mimeTypes": ["application/pdf"] },
        { "name": "maintenance_report", "type": "relation", "collectionId": "pbc_maintenance_reports", "cascadeDelete": true, "maxSelect": 1 },
        { "name": "generated_at", "type": "date" }
      ],
      "listRule": "@request.auth.id != ''", "viewRule": "@request.auth.id != ''", "createRule": "@request.auth.id != ''", "updateRule": "@request.auth.id != ''", "deleteRule": "@request.auth.id != ''"
    }
  ];

  app.importCollections(collections, false);

  // Seeding default data
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

  seed("app_settings", "key = 'testing_mode'", { "key": "testing_mode", "value": false });
  seed("tags", "naam = 'Extern'", { "naam": "Extern", "kleur": "#ef4444", "active": true, "system_managed": true });

  // Seed Calculated Fields
  const cfCollection = app.findCollectionByNameOrId("calculated_fields");
  [
    { "name": "Max Bruto", "formula": "IF(startup, Opstart * exOmw, 0) + netRun + (netRun * Marge) + (c4_4 * exOmw * param_4_4) + (c4_0 * exOmw * param_4_0) + (c1_0 * exOmw * param_1_0) + (c1_1 * exOmw * param_1_1) + (c4_1 * exOmw * param_4_1)", "targetColumn": "maxGross" },
    { "name": "Delta Number", "formula": "green + red - maxGross", "targetColumn": "delta_number" },
    { "name": "Delta Percentage", "formula": "(green + red) / maxGross", "targetColumn": "delta_percentage" }
  ].forEach(item => {
    try { app.findFirstRecordByFilter("calculated_fields", `name = "${item.name}"`); }
    catch (_) {
      const r = new Record(cfCollection);
      r.set("name", item.name); r.set("formula", item.formula); r.set("targetColumn", item.targetColumn);
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
