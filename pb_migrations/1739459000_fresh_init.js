/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  console.log("🚀 Starting robust migration 1739459000_fresh_init.js");

  // ==============================================================================
  // 1. HELPER: FIELD FACTORY
  // ==============================================================================
  function createField(def) {
    // Common mappings
    const opts = Object.assign({}, def);
    delete opts.type; // Constructor doesn't want 'type' property usually, but we'll see. 
    // Safest is to clean up, but PB JSVM is permissive.

    switch (def.type) {
      case "text": return new TextField(opts);
      case "number": return new NumberField(opts);
      case "bool": return new BoolField(opts);
      case "email": return new EmailField(opts);
      case "url": return new UrlField(opts);
      case "editor": return new EditorField(opts);
      case "date": return new DateField(opts);
      case "select": return new SelectField(opts);
      case "json": return new JsonField(opts);
      case "file": return new FileField(opts);
      case "relation": return new RelationField(opts);
      default: throw new Error("Unknown field type: " + def.type);
    }
  }

  // ==============================================================================
  // 2. PREPARE USERS COLLECTION (Fix dependencies)
  // ==============================================================================
  console.log("🔄 Preparing 'users' collection...");
  let users;
  try {
    users = app.findCollectionByNameOrId("users");
    // Detach 'pers' relation if it exists, so we can safely delete 'persen' collection later
    // without violating foreign key constraints (if any strict checks exist)
    const existingPers = users.fields.getByName("pers");
    if (existingPers) {
      console.log("   - Removing existing 'pers' relation from users to allow rebuild");
      users.fields.removeByName("pers");
      app.save(users);
    }
  } catch (e) {
    console.log("   - 'users' collection not found (will create)");
    users = new Collection({ name: "users", type: "auth" });
    app.save(users);
  }
  const USERS_ID = users.id;
  console.log(`   - Target Users ID: ${USERS_ID}`);

  // ==============================================================================
  // 3. DELETE EXISTING APPLICATION COLLECTIONS
  // ==============================================================================
  const deleteList = [
    "report_files", "maintenance_reports", "calculated_fields", "app_settings",
    "press_parameters", "activity_logs", "feedback", "drukwerken", "onderhoud",
    "categorieen", "ploegen", "operatoren", "tags", "persen"
  ];

  console.log("🗑️  Cleaning up old collections...");
  deleteList.forEach(name => {
    try {
      const col = app.findCollectionByNameOrId(name);
      app.delete(col);
      console.log(`   - Deleted ${name}`);
    } catch (_) { /* ignore */ }
  });

  // ==============================================================================
  // 4. DEFINE ALL COLLECTIONS
  // ==============================================================================
  // We define them here. Order matters for creation!
  // Topological sort: persen -> tags -> ... -> drukwerken, etc.

  const definitions = [
    {
      name: "persen", id: "persen000000001", type: "base",
      fields: [
        { type: "text", name: "naam", required: true },
        { type: "select", name: "status", values: ["actief", "niet actief"] },
        { type: "json", name: "category_order" }
      ]
    },
    {
      name: "tags", id: "tags00000000001", type: "base",
      listRule: "@request.auth.id != ''", viewRule: "@request.auth.id != ''", createRule: "@request.auth.id != ''", updateRule: "@request.auth.id != ''", deleteRule: "@request.auth.id != ''",
      fields: [
        { type: "text", name: "naam", required: true, presentable: true },
        { type: "text", name: "kleur" },
        { type: "bool", name: "active" },
        { type: "bool", name: "system_managed" },
        { type: "json", name: "highlights" }
      ]
    },
    {
      name: "operatoren", id: "operat000000001", type: "base",
      fields: [
        { type: "text", name: "naam", required: true },
        { type: "number", name: "interne_id", min: 1, max: 99 },
        { type: "select", name: "dienstverband", values: ["Intern", "Extern"] },
        { type: "bool", name: "active" },
        { type: "json", name: "presses" },
        { type: "bool", name: "can_edit_tasks" },
        { type: "bool", name: "can_access_management" },
        { type: "relation", name: "linked_user", collectionId: USERS_ID, maxSelect: 1 }
      ]
    },
    {
      name: "ploegen", id: "ploegen00000001", type: "base",
      fields: [
        { type: "text", name: "naam", required: true },
        { type: "relation", name: "pers", collectionId: "persen000000001", required: true },
        { type: "relation", name: "leden", collectionId: "operat000000001", maxSelect: 3 }
      ]
    },
    {
      name: "categorieen", id: "catego000000001", type: "base",
      fields: [
        { type: "text", name: "naam", required: true },
        { type: "relation", name: "pers_ids", collectionId: "persen000000001", maxSelect: 10 },
        { type: "json", name: "subtexts" }
      ]
    },
    {
      name: "onderhoud", id: "onderh000000001", type: "base",
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
      name: "drukwerken", id: "drukw0000000001", type: "base",
      listRule: '@request.auth.id != "" && (@request.auth.role = "Admin" || @request.auth.role = "Meestergast" || (@request.auth.role = "Operator" && pers = @request.auth.pers))',
      viewRule: '@request.auth.id != "" && (@request.auth.role = "Admin" || @request.auth.role = "Meestergast" || (@request.auth.role = "Operator" && pers = @request.auth.pers))',
      createRule: "@request.auth.id != ''", updateRule: "@request.auth.id != ''", deleteRule: "@request.auth.id != ''",
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
      name: "feedback", id: "pbc_2456230977", type: "base",
      listRule: "@request.auth.id != ''", viewRule: "@request.auth.id != ''", createRule: "@request.auth.id != ''", updateRule: "@request.auth.role = 'Admin'", deleteRule: "@request.auth.role = 'Admin'",
      fields: [
        { type: "text", name: "type" }, { type: "text", name: "message" },
        { type: "text", name: "user" }, { type: "text", name: "status" },
        { type: "json", name: "context" }, { type: "text", name: "admin_comment" },
        { type: "bool", name: "archived" }
      ]
    },
    {
      name: "activity_logs", id: "pbc_444539071", type: "base",
      fields: [
        { type: "text", name: "user" }, { type: "text", name: "action" },
        { type: "text", name: "entity" }, { type: "text", name: "details" },
        { type: "text", name: "entityId" }, { type: "text", name: "entityName" },
        { type: "text", name: "press" }, { type: "text", name: "oldValue" },
        { type: "text", name: "newValue" }
      ]
    },
    {
      name: "press_parameters", id: "pressparam00001", type: "base",
      fields: [
        { type: "relation", name: "press", collectionId: "persen000000001", maxSelect: 1 },
        { type: "text", name: "marge" }, { type: "number", name: "opstart" },
        { type: "number", name: "k_4_4" }, { type: "number", name: "k_4_0" },
        { type: "number", name: "k_1_0" }, { type: "number", name: "k_1_1" },
        { type: "number", name: "k_4_1" }
      ]
    },
    {
      name: "app_settings", id: "app_settings001", type: "base",
      createRule: "@request.auth.id != ''", updateRule: "@request.auth.id != ''", deleteRule: "@request.auth.id != ''",
      indexes: ["CREATE UNIQUE INDEX `idx_app_settings_key` ON `app_settings` (`key`)"],
      fields: [
        { type: "text", name: "key", required: true },
        { type: "json", name: "value" }
      ]
    },
    {
      name: "calculated_fields", id: "pbc_calculated_fields", type: "base",
      fields: [
        { type: "text", name: "name", required: true, presentable: true },
        { type: "text", name: "formula", required: true },
        { type: "text", name: "targetColumn" }
      ]
    },
    {
      name: "maintenance_reports", id: "pbc_maintenance_reports", type: "base",
      listRule: "@request.auth.id != ''", viewRule: "@request.auth.id != ''", createRule: "@request.auth.id != ''", updateRule: "@request.auth.id != ''", deleteRule: "@request.auth.id != ''",
      fields: [
        { type: "text", name: "name", required: true, presentable: true },
        { type: "relation", name: "press_ids", collectionId: "persen000000001" },
        { type: "select", name: "period", required: true, maxSelect: 1, values: ["day", "week", "month", "year"] },
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
      name: "report_files", id: "pbc_report_files", type: "base",
      listRule: "@request.auth.id != ''", viewRule: "@request.auth.id != ''", createRule: "@request.auth.id != ''", updateRule: "@request.auth.id != ''", deleteRule: "@request.auth.id != ''",
      fields: [
        { type: "file", name: "file", required: true, maxSelect: 1, maxSize: 5242880, mimeTypes: ["application/pdf"] },
        { type: "relation", name: "maintenance_report", collectionId: "pbc_maintenance_reports", maxSelect: 1, cascadeDelete: true },
        { type: "date", name: "generated_at" }
      ]
    }
  ];

  // ==============================================================================
  // 5. CREATE COLLECTIONS
  // ==============================================================================
  console.log("🔨 Creating application collections...");
  definitions.forEach(def => {
    try {
      const col = new Collection({
        id: def.id,
        name: def.name,
        type: def.type,
        listRule: def.listRule,
        viewRule: def.viewRule,
        createRule: def.createRule,
        updateRule: def.updateRule,
        deleteRule: def.deleteRule,
        indexes: def.indexes
      });

      def.fields.forEach(fDef => col.fields.add(createField(fDef)));

      app.save(col);
      console.log(`   ✅ Created ${def.name}`);
    } catch (e) {
      console.error(`   ❌ Failed to create ${def.name}: ${e}`);
      throw e;
    }
  });

  // ==============================================================================
  // 6. UPDATE USERS WITH CUSTOM FIELDS (Post-creation of relations)
  // ==============================================================================
  console.log("🔄 Adding custom fields to 'users'...");
  users = app.findCollectionByNameOrId(USERS_ID);

  const userFields = [
    { type: "text", name: "name" },
    { type: "file", name: "avatar", maxSelect: 1, mimeTypes: ["image/jpeg", "image/png", "image/svg+xml", "image/gif", "image/webp"] },
    { type: "select", name: "role", maxSelect: 1, values: ["Admin", "Meestergast", "Operator"] },
    { type: "text", name: "press" },
    { type: "relation", name: "pers", collectionId: "persen000000001", maxSelect: 1 },
    { type: "text", name: "plain_password" },
    { type: "text", name: "operator_id" }
  ];

  userFields.forEach(def => {
    const existing = users.fields.getByName(def.name);
    if (!existing) {
      console.log(`   + Adding field: ${def.name}`);
      users.fields.add(createField(def));
    }
  });

  // Set auth rules for users
  users.updateRule = "@request.auth.id != ''";
  users.deleteRule = "@request.auth.id != ''";

  app.save(users);
  console.log("   ✅ Users updated successfully.");

  // ==============================================================================
  // 7. SEED DATA
  // ==============================================================================
  console.log("🌱 Seeding default data...");
  const seed = (colName, filter, data) => {
    try {
      app.findFirstRecordByFilter(colName, filter);
    } catch (_) {
      const collection = app.findCollectionByNameOrId(colName);
      const record = new Record(collection);
      for (let key in data) record.set(key, data[key]);
      app.save(record);
      console.log(`   + Seeded ${colName}: ${filter}`);
    }
  };

  seed("app_settings", "key = 'testing_mode'", { key: "testing_mode", value: false });
  seed("tags", "naam = 'Extern'", { naam: "Extern", kleur: "#ef4444", active: true, system_managed: true });

  const customFormulas = [
    { name: "Max Bruto", formula: "IF(startup, Opstart * exOmw, 0) + netRun + (netRun * Marge) + (c4_4 * exOmw * param_4_4) + (c4_0 * exOmw * param_4_0) + (c1_0 * exOmw * param_1_0) + (c1_1 * exOmw * param_1_1) + (c4_1 * exOmw * param_4_1)", targetColumn: "maxGross" },
    { name: "Delta Number", formula: "green + red - maxGross", targetColumn: "delta_number" },
    { name: "Delta Percentage", formula: "(green + red) / maxGross", targetColumn: "delta_percentage" }
  ];
  customFormulas.forEach(item => seed("calculated_fields", `name = "${item.name}"`, item));

  // Sync Admin User
  try {
    let admin;
    try {
      admin = app.findFirstRecordByFilter("users", 'email = "geldofa@gmail.com" || username = "admin"');
    } catch (_) { admin = null; }

    if (!admin) {
      console.log("   + Creating Admin user...");
      const usersCol = app.findCollectionByNameOrId("users");
      admin = new Record(usersCol);
      admin.set("email", "geldofa@gmail.com");
      admin.set("username", "admin");
      admin.set("password", "admin_password");
      admin.set("passwordConfirm", "admin_password");
      admin.set("verified", true);
    }
    admin.set("role", "Admin");
    app.save(admin);
    console.log("   ✅ Admin user synced.");
  } catch (e) {
    console.error("   ❌ Service account sync error:", e);
  }

  console.log("🏁 Migration 1739459000_fresh_init.js DONE.");

}, (app) => {
  return null;
});
