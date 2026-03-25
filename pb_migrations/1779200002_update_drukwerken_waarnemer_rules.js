migrate((app) => {
  try {
    const collection = app.findCollectionByNameOrId("drukwerken");
    
    // Add Waarnemer to the allowed roles for listing and viewing drukwerken
    const newRule = "@request.auth.id != '' && (@request.auth.role = 'Admin' || @request.auth.role = 'Waarnemer' || @request.auth.role = 'waarnemer' || @request.auth.role = 'Meestergast' || (@request.auth.role = 'Operator' && pers = @request.auth.pers))";
    
    collection.listRule = newRule;
    collection.viewRule = newRule;
    
    app.save(collection);
    console.log("✅ Successfully updated drukwerken API rules to allow Waarnemer access.");
  } catch (e) {
    console.error("❌ Failed to update drukwerken API rules:", e);
  }

  return null;
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("drukwerken");
    
    // Revert to original rules
    const oldRule = "@request.auth.id != '' && (@request.auth.role = 'Admin' || @request.auth.role = 'Meestergast' || (@request.auth.role = 'Operator' && pers = @request.auth.pers))";
    
    collection.listRule = oldRule;
    collection.viewRule = oldRule;
    
    app.save(collection);
  } catch (e) {
    console.error("❌ Failed to revert drukwerken API rules:", e);
  }
  return null;
});
