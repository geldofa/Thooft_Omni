/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  console.log("🚀 Running migration: maintenance_checklists collection creation");

  const COLLECTION_NAME = "maintenance_checklists";
  const COLLECTION_ID = "pbc_mchecklists";

  // Check if collection already exists
  try {
    const existing = app.findCollectionByNameOrId(COLLECTION_NAME);
    if (existing) {
      console.log(`   - Collection '${COLLECTION_NAME}' already exists. Skipping.`);
      return;
    }
  } catch (e) {
    // Not found, proceed
  }

  const col = new Collection({
    id: COLLECTION_ID,
    name: COLLECTION_NAME,
    type: "base",
    system: false,
  });

  // press_id
  col.fields.add(new TextField({
    name: "press_id",
    required: true,
  }));

  // press_name
  col.fields.add(new TextField({
    name: "press_name",
    required: true,
  }));

  // task_ids (JSON array of onderhoud record IDs)
  col.fields.add(new JSONField({
    name: "task_ids",
    required: true,
  }));

  // completed_task_ids (JSON array of completed task IDs)
  col.fields.add(new JSONField({
    name: "completed_task_ids",
    required: false,
  }));

  // start_date
  col.fields.add(new TextField({
    name: "start_date",
    required: true,
  }));

  // end_date
  col.fields.add(new TextField({
    name: "end_date",
    required: true,
  }));

  // created_by
  col.fields.add(new TextField({
    name: "created_by",
    required: false,
  }));

  // active
  col.fields.add(new BoolField({
    name: "active",
    required: false,
  }));

  // total_tasks (for analysis summary)
  col.fields.add(new NumberField({
    name: "total_tasks",
    required: false,
    noDecimal: true,
  }));

  // completed_count (for analysis summary)
  col.fields.add(new NumberField({
    name: "completed_count",
    required: false,
    noDecimal: true,
  }));

  // incomplete_task_ids (filled on archiving)
  col.fields.add(new JSONField({
    name: "incomplete_task_ids",
    required: false,
  }));

  // summary (metadata for Analyses view, phase 2)
  col.fields.add(new JSONField({
    name: "summary",
    required: false,
  }));

  // Rules: all logged-in users can read, create/update requires login
  const AUTH_RULE = "@request.auth.id != ''";
  const ADMIN_RULE = "@request.auth.id != '' && @request.auth.role = 'Admin'";
  col.listRule = AUTH_RULE;
  col.viewRule = AUTH_RULE;
  col.createRule = AUTH_RULE;
  col.updateRule = AUTH_RULE;
  col.deleteRule = ADMIN_RULE;

  app.save(col);
  console.log(`   ✅ Collection '${COLLECTION_NAME}' created successfully.`);

  return null;
}, (app) => {
  try {
    const col = app.findCollectionByNameOrId("maintenance_checklists");
    app.delete(col);
  } catch (e) {}
  return null;
});
