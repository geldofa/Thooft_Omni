/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const col = app.findCollectionByNameOrId("jdf_orders");

  for (const f of col.fields) {
    if (f.name === "target_print_date") {
      console.log("   - target_print_date already exists. Skipping.");
      return;
    }
  }

  col.fields.add(new DateField({ name: "target_print_date" }));
  app.save(col);
  console.log("   ✅ Added target_print_date to jdf_orders");

}, (app) => {
  const col = app.findCollectionByNameOrId("jdf_orders");
  col.fields = col.fields.filter(f => f.name !== "target_print_date");
  app.save(col);
});
