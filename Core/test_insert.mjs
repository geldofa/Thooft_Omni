const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjb2xsZWN0aW9uSWQiOiJwYmNfMzE0MjYzNTgyMyIsImV4cCI6MTc3NTEyNTM1MSwiaWQiOiI0Zmt4OTk4M2llNTBsYWMiLCJyZWZyZXNoYWJsZSI6dHJ1ZSwidHlwZSI6ImF1dGgifQ.B1OjdSCFXoOQ6cKgn-CqVDQy3d2b3kaoaxrUEQDOaPU";
const BASE = "http://127.0.0.1:8090";

async function testInsert() {
  const body = {
    original_id: "test1234567890w",
    order_nummer: 12345,
    klant_order_beschrijving: "Test Order",
    versie: "Version 1",
    deleted_by: "System",
    press: "Lithoman",
    metadata: { test: true }
  };

  const res = await fetch(`${BASE}/api/collections/trashed_drukwerken/records`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  console.log("Status:", res.status);
  console.log("Response:", await res.text());
}

testInsert().catch(console.error);
