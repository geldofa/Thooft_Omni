migrate((app) => {
  try {
    const collection = app.findCollectionByNameOrId("drukwerken");
    
    // Updated rule: Allow all roles to see all records, EXCEPT Operators who remain restricted to their own press.
    // This ensures that new roles like 'Overzicht' or 'Waarnemer' can see everything without needing explicit mention.
    const newRule = "@request.auth.id != '' && (@request.auth.role != 'Operator' || pers = @request.auth.pers)";
    
    collection.listRule = newRule;
    collection.viewRule = newRule;
    
    app.save(collection);
    console.log("✅ Successfully updated drukwerken API rules to be more inclusive for non-Operator roles.");
  } catch (e) {
    console.error("❌ Failed to update drukwerken API rules:", e);
  }

  return null;
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("drukwerken");
    
    // Revert to the rule with explicit roles (including Waarnemer from previous migration)
    const oldRule = "@request.auth.id != '' && (@request.auth.role = 'Admin' || @request.auth.role = 'Waarnemer' || @request.auth.role = 'waarnemer' || @request.auth.role = 'Meestergast' || (@request.auth.role = 'Operator' && pers = @request.auth.pers))";
    
    collection.listRule = oldRule;
    collection.viewRule = oldRule;
    
    app.save(collection);
  } catch (e) {
    console.error("❌ Failed to revert drukwerken API rules:", e);
  }
  return null;
});
