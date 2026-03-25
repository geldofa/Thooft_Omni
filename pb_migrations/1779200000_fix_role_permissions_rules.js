migrate((app) => {
  try {
    const collection = app.findCollectionByNameOrId("role_permissions");
    
    // Ensure all authenticated users can read the permissions list
    collection.listRule = "@request.auth.id != ''";
    collection.viewRule = "@request.auth.id != ''";
    
    app.save(collection);
    console.log("✅ Successfully updated role_permissions API rules to allow all authenticated users.");
  } catch (e) {
    console.error("❌ Failed to update role_permissions API rules:", e);
  }

  return null;
}, (app) => {
  return null;
});
