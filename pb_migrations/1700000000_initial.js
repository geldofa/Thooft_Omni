/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  // 1. DELETE EXISTING COLLECTIONS (to avoid conflicts with auto-created defaults)
  // We delete in reverse-dependency order.
  const collectionsToDelete = [
    "report_files",
    "maintenance_reports",
    "calculated_fields",
    "app_settings",
    "press_parameters",
    "activity_logs",
    "feedback",
    "drukwerken",
    "onderhoud",
    "categorieen",
    "ploegen",
    "operatoren",
    "users",
    "tags",
    "persen"
  ];

  for (const name of collectionsToDelete) {
    try {
      const collection = app.findCollectionByNameOrId(name);
      app.delete(collection);
    } catch (_) { }
  }

  // 2. CREATE COLLECTIONS (Forward dependency order)
  const configs = [
    {
      id: "persen000000001",
      name: "persen",
      type: "base",
      fields: [
        { type: "text", name: "naam", required: true },
        { type: "select", name: "status", values: ["actief", "niet actief"] },
        { type: "json", name: "category_order" }
      ]
    },
    {
      id: "tags00000000001",
      name: "tags",
      type: "base",
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { type: "text", name: "naam", required: true, presentable: true },
        { type: "text", name: "kleur" },
        { type: "bool", name: "active" },
        { type: "bool", name: "system_managed" },
        { type: "json", name: "highlights" }
      ]
    },
    {
      id: "users000000000001",
      name: "users",
      type: "auth",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { type: "text", name: "name" },
        {
          type: "file",
          name: "avatar",
          maxSelect: 1,
          mimeTypes: ["image/jpeg", "image/png", "image/svg+xml", "image/gif", "image/webp"]
        },
        {
          type: "select",
          name: "role",
          maxSelect: 1,
          values: ["Admin", "Meestergast", "Operator"]
        },
        { type: "text", name: "press" },
        {
          type: "relation",
          name: "pers",
          collectionId: "persen000000001",
          maxSelect: 1
        },
        { type: "text", name: "plain_password" },
        { type: "text", name: "operator_id" }
      ],
      passwordAuth: { enabled: true, identityFields: ["username", "email"] }
    },
    {
      id: "operat000000001",
      name: "operatoren",
      type: "base",
      fields: [
        { type: "text", name: "naam", required: true },
        { type: "number", name: "interne_id", min: 1, max: 99 },
        { type: "select", name: "dienstverband", values: ["Intern", "Extern"] },
        { type: "bool", name: "active" },
        { type: "json", name: "presses" },
        { type: "bool", name: "can_edit_tasks" },
        { type: "bool", name: "can_access_management" },
        {
          type: "relation",
          name: "linked_user",
          collectionId: "users000000000001",
          maxSelect: 1
        }
      ]
    },
    {
      id: "ploegen00000001",
      name: "ploegen",
      type: "base",
      fields: [
        { type: "text", name: "naam", required: true },
        { type: "relation", name: "pers", collectionId: "persen000000001", required: true },
        { type: "relation", name: "leden", collectionId: "operat000000001", maxSelect: 3 }
      ]
    },
    {
      id: "catego000000001",
      name: "categorieen",
      type: "base",
      fields: [
        { type: "text", name: "naam", required: true },
        { type: "relation", name: "pers_ids", collectionId: "persen000000001", maxSelect: 10 },
        { type: "json", name: "subtexts" }
      ]
    },
    {
      id: "onderh000000001",
      name: "onderhoud",
      type: "base",
      fields: [
        { type: "text", name: "task", required: true },
        { type: "text", name: "task_subtext" },
        { type: "text", name: "subtask" },
        { type: "text", name: "subtask_subtext" },
        { type: "text", name: "comment" },
        { type: "date", name: "last_date" },
        { type: "date", name: "next_date" },
        { type: "number", name: "interval" },
        { type: "select", name: "interval_unit", values: ["Dagen", "Weken", "Maanden", "Jaren"] },
        { type: "relation", name: "pers", collectionId: "persen000000001" },
        { type: "relation", name: "category", collectionId: "catego000000001" },
        { type: "relation", name: "assigned_operator", collectionId: "operat000000001", maxSelect: 999 },
        { type: "relation", name: "assigned_team", collectionId: "ploegen00000001" },
        { type: "text", name: "opmerkingen" },
        { type: "date", name: "commentDate" },
        { type: "number", name: "sort_order", min: 0, max: 1000 },
        { type: "bool", name: "is_external" },
        { type: "relation", name: "tags", collectionId: "tags00000000001" }
      ]
    },
    {
      id: "drukw0000000001",
      name: "drukwerken",
      type: "base",
      listRule: '@request.auth.id != "" && (@request.auth.role = "Admin" || @request.auth.role = "Meestergast" || (@request.auth.role = "Operator" && pers = @request.auth.pers))',
      viewRule: '@request.auth.id != "" && (@request.auth.role = "Admin" || @request.auth.role = "Meestergast" || (@request.auth.role = "Operator" && pers = @request.auth.pers))',
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { type: "number", name: "order_nummer", required: true },
        { type: "text", name: "klant_order_beschrijving" },
        { type: "text", name: "versie" },
        { type: "number", name: "blz" },
        { type: "number", name: "ex_omw" },
        { type: "number", name: "netto_oplage" },
        { type: "bool", name: "opstart" },
        { type: "number", name: "k_4_4" },
        { type: "number", name: "k_4_0" },
        { type: "number", name: "k_1_0" },
        { type: "number", name: "k_1_1" },
        { type: "number", name: "k_4_1" },
        { type: "number", name: "max_bruto" },
        { type: "number", name: "groen" },
        { type: "number", name: "rood" },
        { type: "number", name: "delta" },
        { type: "number", name: "delta_percent" },
        { type: "text", name: "opmerking" },
        { type: "relation", name: "pers", collectionId: "persen000000001", maxSelect: 1 },
        { type: "text", name: "date" },
        { type: "text", name: "datum" }
      ]
    },
    {
      id: "pbc_2456230977",
      name: "feedback",
      type: "base",
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.role = 'Admin'",
      deleteRule: "@request.auth.role = 'Admin'",
      fields: [
        { type: "text", name: "type" },
        { type: "text", name: "message" },
        { type: "text", name: "user" },
        { type: "text", name: "status" },
        { type: "json", name: "context" },
        { type: "text", name: "admin_comment" },
        { type: "bool", name: "archived" }
      ]
    },
    {
      id: "pbc_444539071",
      name: "activity_logs",
      type: "base",
      fields: [
        { type: "text", name: "user" }, { type: "text", name: "action" },
        { type: "text", name: "entity" }, { type: "text", name: "details" },
        { type: "text", name: "entityId" }, { type: "text", name: "entityName" },
        { type: "text", name: "press" }, { type: "text", name: "oldValue" },
        { type: "text", name: "newValue" }
      ]
    },
    {
      id: "pressparam00001",
      name: "press_parameters",
      type: "base",
      fields: [
        { type: "relation", name: "press", collectionId: "persen000000001", maxSelect: 1 },
        { type: "text", name: "marge" }, { type: "number", name: "opstart" },
        { type: "number", name: "k_4_4" }, { type: "number", name: "k_4_0" },
        { type: "number", name: "k_1_0" }, { type: "number", name: "k_1_1" },
        { type: "number", name: "k_4_1" }
      ]
    },
    {
      id: "app_settings001",
      name: "app_settings",
      type: "base",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      indexes: ["CREATE UNIQUE INDEX `idx_app_settings_key` ON `app_settings` (`key`)"],
      fields: [
        { type: "text", name: "key", required: true },
        { type: "json", name: "value" }
      ]
    },
    {
      id: "pbc_calculated_fields",
      name: "calculated_fields",
      type: "base",
      fields: [
        { type: "text", name: "name", required: true, presentable: true },
        { type: "text", name: "formula", required: true },
        { type: "text", name: "targetColumn" }
      ]
    },
    {
      id: "pbc_maintenance_reports",
      name: "maintenance_reports",
      type: "base",
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { type: "text", name: "name", required: true, presentable: true },
        { type: "relation", name: "press_ids", collectionId: "persen000000001" },
        {
          type: "select",
          name: "period",
          required: true,
          maxSelect: 1,
          values: ["day", "week", "month", "year"]
        },
        { type: "bool", name: "auto_generate" },
        { type: "number", name: "schedule_day", min: 1, max: 31 },
        { type: "date", name: "last_run" },
        { type: "bool", name: "email_enabled" },
        { type: "text", name: "email_recipients" },
        { type: "text", name: "email_subject" },
        { type: "bool", name: "is_rolling" },
        { type: "number", name: "period_offset" },
        { type: "number", name: "schedule_hour", min: 0, max: 23 },
        { type: "json", name: "schedule_weekdays" },
        { type: "text", name: "schedule_month_type" },
        { type: "date", name: "custom_date" }
      ]
    },
    {
      id: "pbc_report_files",
      name: "report_files",
      type: "base",
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          type: "file",
          name: "file",
          required: true,
          maxSelect: 1,
          maxSize: 5242880,
          mimeTypes: ["application/pdf"]
        },
        {
          type: "relation",
          name: "maintenance_report",
          collectionId: "pbc_maintenance_reports",
          maxSelect: 1,
          cascadeDelete: true
        },
        { type: "date", name: "generated_at" }
      ]
    }
  ];

  for (const config of configs) {
    try {
      const col = new Collection(config);
      app.save(col);
    } catch (e) {
      console.log("Error creating collection " + config.name + ": " + e);
      throw e; // Fail migration immediately if a collection cannot be created
    }
  }

  // 3. SEED DEFAULT DATA
  function seed(colName, filter, data) {
    try {
      app.findFirstRecordByFilter(colName, filter);
    } catch (_) {
      const collection = app.findCollectionByNameOrId(colName);
      const record = new Record(collection);
      for (let key in data) record.set(key, data[key]);
      app.save(record);
    }
  }

  seed("app_settings", "key = 'testing_mode'", { key: "testing_mode", value: false });
  seed("tags", "naam = 'Extern'", { naam: "Extern", kleur: "#ef4444", active: true, system_managed: true });

  const defaultFormulas = [
    {
      name: "Max Bruto",
      formula: "IF(startup, Opstart * exOmw, 0) + netRun + (netRun * Marge) + (c4_4 * exOmw * param_4_4) + (c4_0 * exOmw * param_4_0) + (c1_0 * exOmw * param_1_0) + (c1_1 * exOmw * param_1_1) + (c4_1 * exOmw * param_4_1)",
      targetColumn: "maxGross"
    },
    { name: "Delta Number", formula: "green + red - maxGross", targetColumn: "delta_number" },
    { name: "Delta Percentage", formula: "(green + red) / maxGross", targetColumn: "delta_percentage" }
  ];
  defaultFormulas.forEach(item => {
    seed("calculated_fields", 'name = "' + item.name + '"', item);
  });

  try {
    let users = app.findRecordsByFilter("users", 'email = "geldofa@gmail.com" || username = "admin"', "-created", 1);
    const record = users.length > 0 ? users[0] : new Record(app.findCollectionByNameOrId("users"));
    if (!record.exists()) {
      record.set("email", "geldofa@gmail.com");
      record.set("username", "admin");
      record.set("password", "admin_password");
      record.set("passwordConfirm", "admin_password");
      record.set("verified", true);
    }
    record.set("role", "Admin");
    app.save(record);
  } catch (e) {
    console.log("Service account sync error: " + e);
  }

}, (app) => {
  return null;
});
