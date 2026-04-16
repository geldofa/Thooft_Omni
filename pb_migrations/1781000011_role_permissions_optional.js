/// <reference path="../pb_data/types.d.ts" />

// Migration: make role_permissions.permissions not required
// PocketBase treats [] as "empty" for required JSON fields, which breaks
// createRole() when a new role is created with zero permissions initially.

migrate((app) => {
  const collection = app.findCollectionByNameOrId("role_permissions");

  const field = collection.fields.getByName("permissions");
  if (field) {
    field.required = false;
  }

  app.save(collection);
  console.log("✅ role_permissions.permissions is now optional");
}, (app) => {
  const collection = app.findCollectionByNameOrId("role_permissions");

  const field = collection.fields.getByName("permissions");
  if (field) {
    field.required = true;
  }

  app.save(collection);
  console.log("↩️  role_permissions.permissions restored to required");
});
