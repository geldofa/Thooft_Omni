const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjb2xsZWN0aW9uSWQiOiJwYmNfMzE0MjYzNTgyMyIsImV4cCI6MTc3NTEyNTM1MSwiaWQiOiI0Zmt4OTk4M2llNTBsYWMiLCJyZWZyZXNoYWJsZSI6dHJ1ZSwidHlwZSI6ImF1dGgifQ.B1OjdSCFXoOQ6cKgn-CqVDQy3d2b3kaoaxrUEQDOaPU";
const BASE = "http://127.0.0.1:8090";

fetch(`${BASE}/api/collections/trashed_drukwerken`, { headers: { Authorization: `Bearer ${TOKEN}` } })
  .then(res => res.text())
  .then(console.log)
  .catch(console.error);
