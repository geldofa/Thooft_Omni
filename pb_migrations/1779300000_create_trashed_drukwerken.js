/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  console.log("🚀 Running migration: trashed_drukwerken collection creation");

  const COLLECTION_NAME = "trashed_drukwerken";
  const COLLECTION_ID = "pbc_trashed1";

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

  // original_id
  col.fields.add(new TextField({
    name: "original_id",
    required: false,
  }));

  // order_nummer
  col.fields.add(new NumberField({
    name: "order_nummer",
    required: false,
    noDecimal: true,
  }));

  // klant_order_beschrijving
  col.fields.add(new TextField({
    name: "klant_order_beschrijving",
    required: false,
  }));

  // versie
  col.fields.add(new TextField({
    name: "versie",
    required: false,
  }));

  // deleted_by
  col.fields.add(new TextField({
    name: "deleted_by",
    required: false,
  }));

  // press
  col.fields.add(new TextField({
    name: "press",
    required: false,
  }));

  // metadata
  col.fields.add(new JSONField({
    name: "metadata",
    required: false,
  }));

  // Rules
  const ADMIN_RULE = "@request.auth.id != '' && @request.auth.role = 'Admin'";
  col.listRule = ADMIN_RULE;
  col.viewRule = ADMIN_RULE;
  col.createRule = "@request.auth.id != ''"; // Allow archiving
  col.updateRule = ADMIN_RULE;
  col.deleteRule = ADMIN_RULE;

  app.save(col);
  console.log(`   ✅ Collection '${COLLECTION_NAME}' created successfully.`);

  // Update permissions
  try {
    const adminPerms = app.findFirstRecordByFilter("role_permissions", "role = 'Admin' || role = 'admin'");
    if (adminPerms) {
      const perms = adminPerms.get("permissions") || [];
      if (!perms.includes("drukwerken_trash_view")) {
        perms.push("drukwerken_trash_view");
        adminPerms.set("permissions", perms);
        app.save(adminPerms);
        console.log("   ✅ Added 'drukwerken_trash_view' to Admin permissions.");
      }
    }
  } catch (e) {
    console.warn("   ⚠️ Could not update Admin permissions:", e.message);
  }

  return null;
}, (app) => {
  try {
    const col = app.findCollectionByNameOrId("trashed_drukwerken");
    app.delete(col);
  } catch (e) {}
  return null;
});
