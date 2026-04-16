/// <reference path="../pb_data/types.d.ts" />

// Migration: change users.role from SelectField to TextField
// We have to removeById the SelectField first, then add a TextField.

migrate((app) => {
  const collection = app.findCollectionByNameOrId("users");

  const oldField = collection.fields.getByName("role");
  if (oldField) {
    collection.fields.removeById(oldField.id);
  }

  const newField = new Field({
    "name":     "role",
    "type":     "text",
    "required": false,
  });
  collection.fields.add(newField);

  app.save(collection);
  console.log("✅ users.role changed to TextField — dynamic roles enabled");
}, (app) => {
  const collection = app.findCollectionByNameOrId("users");

  const existingField = collection.fields.getByName("role");
  if (existingField) {
    collection.fields.removeById(existingField.id);
  }

  const selectField = new Field({
    "name":      "role",
    "type":      "select",
    "required":  false,
    "maxSelect": 1,
    "values":    ["Admin", "Meestergast", "Operator", "Waarnemer"],
  });
  collection.fields.add(selectField);

  app.save(collection);
  console.log("↩️  users.role restored to SelectField");
});
