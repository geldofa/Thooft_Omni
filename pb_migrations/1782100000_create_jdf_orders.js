/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  console.log("🚀 Running migration: jdf_orders collection creation");

  const COLLECTION_NAME = "jdf_orders";

  // Check if collection already exists
  try {
    app.findCollectionByNameOrId(COLLECTION_NAME);
    console.log("   - Collection '" + COLLECTION_NAME + "' already exists. Skipping.");
    return;
  } catch (_) { /* Not found, proceed */ }

  const col = new Collection({
    name: COLLECTION_NAME,
    type: "base",
  });

  // Order identification
  col.fields.add(new TextField({ name: "order_nummer", required: true }));
  col.fields.add(new TextField({ name: "order_naam" }));
  col.fields.add(new TextField({ name: "klant" }));

  // Press
  col.fields.add(new TextField({ name: "pers_device_id" }));
  col.fields.add(new RelationField({ name: "pers", collectionId: "persen000000001", maxSelect: 1 }));

  // Job details
  col.fields.add(new TextField({ name: "ex_omw" }));
  col.fields.add(new NumberField({ name: "paginas" }));
  col.fields.add(new JSONField({ name: "versies" }));
  col.fields.add(new NumberField({ name: "aantal_versies" }));
  col.fields.add(new DateField({ name: "deadline" }));
  col.fields.add(new TextField({ name: "csr" }));
  col.fields.add(new TextField({ name: "papier" }));
  col.fields.add(new NumberField({ name: "totaal_oplage" }));
  col.fields.add(new TextField({ name: "kleuren_voor" }));
  col.fields.add(new TextField({ name: "kleuren_achter" }));

  // Custom fields from GeneralID
  col.fields.add(new TextField({ name: "vouwwijze" }));
  col.fields.add(new TextField({ name: "bruto_breedte" }));
  col.fields.add(new TextField({ name: "bruto_hoogte" }));

  // File tracking
  col.fields.add(new TextField({ name: "jdf_bestandsnaam", required: true }));
  col.fields.add(new NumberField({ name: "jdf_grootte" }));

  app.save(col);

  // Set API rules: readable by all authenticated users
  const saved = app.findCollectionByNameOrId(COLLECTION_NAME);
  saved.listRule = "@request.auth.id != ''";
  saved.viewRule = "@request.auth.id != ''";
  saved.createRule = ""; // Only via hooks (server-side)
  saved.updateRule = ""; // Only via hooks
  saved.deleteRule = ""; // Only via hooks
  app.save(saved);

  // Seed the JDF folder path in app_settings
  try {
    app.findFirstRecordByFilter("app_settings", 'key = "jdf_folder_path"');
  } catch (_) {
    const settingsCol = app.findCollectionByNameOrId("app_settings");
    const record = new Record(settingsCol);
    record.set("key", "jdf_folder_path");
    record.set("value", "./jdf/");
    app.save(record);
    console.log("   + Seeded jdf_folder_path setting");
  }

  console.log("   ✅ Created " + COLLECTION_NAME);

}, (app) => {
  try {
    const col = app.findCollectionByNameOrId("jdf_orders");
    app.delete(col);
  } catch (_) {}
});
