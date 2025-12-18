/// <reference path="../../types.d.ts" />

migrate((app) => {
  // Gegevens voor zowel Superuser (Dashboard) als App User (Frontend)
  const adminEmail = "geldofa@gmail.com";
  const adminPass = "cQGNFBWI$zVV%3UV!hBqi*8Le&K3nLS!V!z&#8*zJk9z6wIaoh7OdmebJuhWuq4$";

  // --- DEEL 1: Superuser Aanmaken (Dashboard Toegang) ---
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

  // --- DEEL 2: Collecties (Database Structuur) ---
  const collections = [
    {
      // USERS (Frontend Login)
      "id": "users000000000001",
      "name": "users",
      "type": "auth",
      "fields": [
        { "name": "name", "type": "text" },
        { "name": "avatar", "type": "file" },
        { "name": "role", "type": "select", "values": ["Admin", "Meestergast", "Operator"] }
      ]
    },
    {
      // PERSEN
      "id": "persen000000001",
      "name": "persen",
      "type": "base",
      "fields": [
        { "name": "naam", "type": "text", "required": true },
        { "name": "status", "type": "select", "values": ["actief", "niet actief"] }
      ]
    },
    {
      // OPERATOREN (Lijst voor koppeling machines)
      "id": "operat000000001",
      "name": "operatoren",
      "type": "base",
      "fields": [
        { "name": "naam", "type": "text", "required": true },
        { "name": "interne_id", "type": "number", "required": true, "min": 1, "max": 99 },
        { "name": "dienstverband", "type": "select", "values": ["Intern", "Extern"] },
        { "name": "linked_user", "type": "relation", "collectionId": "users000000000001", "maxSelect": 1 }
      ]
    },
    {
      // PLOEGEN
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
      // CATEGORIEEN
      "id": "catego000000001",
      "name": "categorieen",
      "type": "base",
      "fields": [
        { "name": "naam", "type": "text", "required": true },
        { "name": "pers", "type": "relation", "collectionId": "persen000000001", "cascadeDelete": false }
      ]
    },
    {
      // ONDERHOUD
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
      // DRUKWERKEN
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
      // Hard reset van collecties als ze al bestaan
      try {
        const existingById = app.findCollectionByNameOrId(data.id);
        if (existingById) app.delete(existingById);
      } catch (e) { }

      try {
        const existingByName = app.findCollectionByNameOrId(data.name);
        if (existingByName) app.delete(existingByName);
      } catch (e) { }

    } catch (e) { }

    const collection = new Collection(data);
    app.save(collection);
  });

  // --- DEEL 3: App Admin User (Frontend Toegang) ---
  try {
    const usersCol = app.findCollectionByNameOrId("users");

    try {
      // Check of user al bestaat
      app.findAuthRecordByEmail("users", adminEmail);
    } catch (e) {
      // Maak user aan met DEZELFDE credentials als de superuser
      const user = new Record(usersCol);
      user.set("email", adminEmail);
      user.setPassword(adminPass);
      user.set("name", "Antony Geldof");
      user.set("role", "Admin"); // Rol = Admin
      user.setVerified(true);
      app.save(user);
      console.log("Frontend Admin user aangemaakt (hetzelfde als dashboard login)!");
    }
  } catch (e) {
    console.log("Fout bij aanmaken app admin: " + e);
  }

}, (app) => {
  // Undo logic
});