const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjb2xsZWN0aW9uSWQiOiJwYmNfMzE0MjYzNTgyMyIsImV4cCI6MTc3NTEyNTM1MSwiaWQiOiI0Zmt4OTk4M2llNTBsYWMiLCJyZWZyZXNoYWJsZSI6dHJ1ZSwidHlwZSI6ImF1dGgifQ.B1OjdSCFXoOQ6cKgn-CqVDQy3d2b3kaoaxrUEQDOaPU";

const BASE = "http://127.0.0.1:8090";

async function createCollection() {
  const body = {
    name: "trashed_drukwerken",
    type: "base",
    fields: [
      { name: "original_id", type: "text" },
      { name: "order_nummer", type: "number" },
      { name: "klant_order_beschrijving", type: "text" },
      { name: "versie", type: "text" },
      { name: "deleted_by", type: "text" },
      { name: "press", type: "text" },
      { name: "metadata", type: "json" }
    ],
    listRule: "@request.auth.id != '' && @request.auth.role = 'Admin'",
    viewRule: "@request.auth.id != '' && @request.auth.role = 'Admin'",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != '' && @request.auth.role = 'Admin'",
    deleteRule: "@request.auth.id != '' && @request.auth.role = 'Admin'"
  };

  const res = await fetch(`${BASE}/api/collections`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const data = await res.text();
  console.log("Status:", res.status);
  console.log("Response:", data);
}

createCollection().catch(console.error);
