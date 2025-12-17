/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  // --- STAP 1: Superuser Aanmaken (Voor toegang tot het dashboard) ---
  const adminEmail = "geldofa@gmail.com";
  const adminPass = "cQGNFBWI$zVV%3UV!hBqi*8Le&K3nLS!V!z&#8*zJk9z6wIaoh7OdmebJuhWuq4$";

  try {
    app.findAuthRecordByEmail("_superusers", adminEmail);
  } catch (e) {
    const superusers = app.findCollectionByNameOrId("_superusers");
    const admin = new Record(superusers);
    admin.set("email", adminEmail);
    admin.setPassword(adminPass);
    app.save(admin);
    console.log("Superuser (Dashboard) aangemaakt!");
  }

  // --- STAP 2: Collecties Definiëren ---
  const collections = [
    {
      // De standaard USERS collectie (Auth)
      "id": "users000000000001",
      "name": "users",
      "type": "auth",
      "fields": [
        { "name": "name", "type": "text" },
        { "name": "avatar", "type": "file" },
        // Hier bepalen we de rechten:
        { "name": "role", "type": "select", "values": ["Admin", "Meestergast", "Operator"] }
      ]
    },
    {
      "id": "persen000000001",
      "name": "persen",
      "type": "base",
      "fields": [
        { "name": "naam", "type": "text", "required": true },
        { "name": "status", "type": "select", "values": ["actief", "niet actief"] }
      ]
    },
    // 'operatoren' houden we voorlopig als lijst voor de machines, 
    // maar login verloopt via 'users'
    {
      "id": "operat000000001",
      "name": "operatoren",
      "type": "base",
      "fields": [
        { "name": "naam", "type": "text", "required": true },
        { "name": "interne_id", "type": "number", "required": true, "min": 1, "max": 99 },
        { "name": "dienstverband", "type": "select", "values": ["Intern", "Extern"] },
        // Optioneel: Link naar een user account als ze ook kunnen inloggen
        { "name": "linked_user", "type": "relation", "collectionId": "users000000000001", "maxSelect": 1 }
      ]
    },
    {
      "id": "ploegen00000001",
      "name": "ploegen",
      "type": "base",
      "fields": [
        { "name": "naam", "type": "text", "required": true },
        { "name": "pers", "type": "relation", "required": true, "collectionId": "persen000000001", "cascadeDelete": false },
        { "name": "leden", "type": "relation", "required": false, "collectionId": "operat000000001", "maxSelect": 3, "cascadeDelete": false }
      ]
    },
    {
      "id": "catego000000001",
      "name": "categorieen",
      "type": "base",
      "fields": [
        { "name": "naam", "type": "text", "required": true },
        { "name": "pers", "type": "relation", "collectionId": "persen000000001", "cascadeDelete": false }
      ]
    },
    {
      "id": "onderh000000001",
      "name": "onderhoud",
      "type": "base",
      "fields": [
        { "name": "task", "type": "text", "required": true },
        { "name": "task_subtext", "type": "text" },
        { "name": "subtask", "type": "text" },
        { "name": "subtask_subtext", "type": "text" },
        { "name": "comment", "type": "text" },
        { "name": "last_date", "type": "date" },
        { "name": "next_date", "type": "date" },
        { "name": "interval", "type": "number" },
        { "name": "interval_unit", "type": "select", "values": ["Dagen", "Weken", "Maanden", "Jaren"] },
        { "name": "pers", "type": "relation", "collectionId": "persen000000001" },
        { "name": "category", "type": "relation", "collectionId": "catego000000001" },
        { "name": "assigned_operator", "type": "relation", "collectionId": "operat000000001", "maxSelect": 1 },
        { "name": "assigned_team", "type": "relation", "collectionId": "ploegen00000001", "maxSelect": 1 }
      ]
    },
    {
      "id": "drukw0000000001",
      "name": "drukwerken",
      "type": "base",
      "fields": [
        { "name": "order_nummer", "type": "number", "required": true },
        { "name": "klant_order_beschrijving", "type": "text" },
        { "name": "versie", "type": "text" },
        { "name": "blz", "type": "number" },
        { "name": "ex_omw", "type": "number" },
        { "name": "netto_oplage", "type": "number" },
        { "name": "opstart", "type": "bool" },
        { "name": "k_4_4", "type": "number" },
        { "name": "k_4_0", "type": "number" },
        { "name": "k_1_0", "type": "number" },
        { "name": "k_1_1", "type": "number" },
        { "name": "k_4_1", "type": "number" },
        { "name": "max_bruto", "type": "number" },
        { "name": "groen", "type": "number" },
        { "name": "rood", "type": "number" },
        { "name": "delta", "type": "number" },
        { "name": "delta_percent", "type": "number" },
        { "name": "opmerking", "type": "text" }
      ]
    }
  ];

  collections.forEach((data) => {
    try {
      // Verwijder bestaande om conflicten te voorkomen
      const existing = app.findCollectionByNameOrId(data.name);
      if (existing) {
        app.delete(existing);
      }
    } catch (e) { }

    const collection = new Collection(data);
    app.save(collection);
  });

  // --- STAP 3: Demo Meestergast Aanmaken ---
  try {
    const usersCol = app.findCollectionByNameOrId("users");
    // Check of hij al bestaat
    try {
      app.findAuthRecordByEmail("users", "geldofa@gmail.com");
    } catch (e) {
      const user = new Record(usersCol);
      user.set("email", "geldofa@gmail.com");
      user.setPassword("cQGNFBWI$zVV%3UV!hBqi*8Le&K3nLS!V!z&#8*zJk9z6wIaoh7OdmebJuhWuq4$"); // Wachtwoord
      user.set("name", "Antony Geldof");
      user.set("role", "Admin");
      user.setVerified(true);
      app.save(user);
      console.log("Demo Admin aangemaakt!");
    }
  } catch (e) {
    console.log("Kon demo user niet aanmaken: " + e);
  }

}, (app) => {
  // Undo logic
});