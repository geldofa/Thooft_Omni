migrate((app) => {
  const usersCollection = app.findCollectionByNameOrId("users");

  // 1. Add "Waarnemer" to the allowed role values
  const roleField = usersCollection.fields.getByName("role");
  if (roleField) {
    const currentValues = roleField.values || [];
    if (!currentValues.includes("Waarnemer")) {
      currentValues.push("Waarnemer");
      roleField.values = currentValues;
    }
  }

  // 2. Update API Rules to allow App Admins to manage users
  usersCollection.createRule = "@request.auth.role = 'Admin'";
  usersCollection.updateRule = "id = @request.auth.id || @request.auth.role = 'Admin'";
  usersCollection.deleteRule = "id = @request.auth.id || @request.auth.role = 'Admin'";

  app.save(usersCollection);

  // 3. Seed default permissions for Waarnemer in role_permissions collection
  const rolePermissionsCollection = app.findCollectionByNameOrId("role_permissions");
  const waarnemerPerms = [
    'tasks_view', 'drukwerken_view', 'drukwerken_view_all', 'reports_view', 'checklist_view',
    'extern_view', 'logs_view', 'feedback_view', 'production_analytics_view',
    'maintenance_analytics_view', 'activity_ticker_view'
  ];

  try {
    const record = app.findFirstRecordByFilter("role_permissions", "role = 'Waarnemer'");
    // If it exists but has few/no permissions, reset to defaults for initialization
    const currentPerms = record.get("permissions") || [];
    if (currentPerms.length < 5) { 
      record.set("permissions", waarnemerPerms);
      app.save(record);
    }
  } catch (e) {
    // Record not found, create new one
    const record = new Record(rolePermissionsCollection);
    record.set("role", "Waarnemer");
    record.set("permissions", waarnemerPerms);
    app.save(record);
  }

  return null;
}, (app) => {
  return null;
});
