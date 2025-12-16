/// <reference path="../pb_data/types.d.ts" />

migrate((db) => {
  // 1. Create 'maintenance_tasks' collection
  const tasks = new Collection({
    name: "maintenance_tasks",
    type: "base",
    schema: [
      { name: "title", type: "text", required: true },
      { name: "group_title", type: "text", required: false },
      { name: "subtext", type: "text", required: false },
      { name: "category", type: "text", required: true },
      { name: "press", type: "text", required: true },
      { name: "last_maintenance", type: "date", required: false },
      { name: "next_maintenance", type: "date", required: false },
      { name: "interval", type: "number", required: false },
      { name: "interval_unit", type: "select", options: { values: ["days", "weeks", "months"] } },
      { name: "assigned_to", type: "text", required: false }, // Store user name or ID
      { name: "notes", type: "text", required: false },
    ],
    listRule: "", // Public read (for now, or auth only)
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: "",
  });

  // 2. Create 'feedback' collection
  const feedback = new Collection({
    name: "feedback",
    type: "base",
    schema: [
      { name: "type", type: "select", required: true, options: { values: ["bug", "feature", "general"] } },
      { name: "message", type: "text", required: true },
      { name: "context", type: "json", required: false },
      { name: "user", type: "text", required: false },
      { name: "status", type: "select", options: { values: ["new", "in_progress", "closed"] } },
    ],
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.role = 'admin'",
  });

  // 3. Create 'activity_logs' collection
  const logs = new Collection({
    name: "activity_logs",
    type: "base",
    schema: [
      { name: "action", type: "text", required: true },
      { name: "entity", type: "text", required: false },
      { name: "entity_id", type: "text", required: false },
      { name: "details", type: "text", required: false },
      { name: "user", type: "text", required: false },
      { name: "press", type: "text", required: false },
    ],
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: null, // Logs should be immutable
    deleteRule: null,
  });

  // 4. Create 'presses' collection (for configuration)
  const presses = new Collection({
    name: "presses",
    type: "base",
    schema: [
      { name: "name", type: "text", required: true, unique: true },
      { name: "active", type: "bool", required: false },
    ],
    listRule: "",
    viewRule: "",
    createRule: "@request.auth.role = 'admin'",
    updateRule: "@request.auth.role = 'admin'",
    deleteRule: "@request.auth.role = 'admin'",
  });

  // 5. Create 'categories' collection
  const categories = new Collection({
    name: "categories",
    type: "base",
    schema: [
      { name: "name", type: "text", required: true, unique: true },
      { name: "active", type: "bool", required: false },
    ],
    listRule: "",
    viewRule: "",
    createRule: "@request.auth.role = 'admin'",
    updateRule: "@request.auth.role = 'admin'",
    deleteRule: "@request.auth.role = 'admin'",
  });

  try {
    dao.saveCollection(tasks);
    dao.saveCollection(feedback);
    dao.saveCollection(logs);
    dao.saveCollection(presses);
    dao.saveCollection(categories);
  } catch (e) {
    // Ignore if already exists
    console.log("Setup: Collections might already exist, skipping creation.");
  }

}, (db) => {
  // Revert logic (optional for this context)
});
