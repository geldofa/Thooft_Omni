const fs = require('fs');

async function test() {
  const schemaStr = fs.readFileSync('pb_migrations/full_schema.json', 'utf8');
  console.log("Read schema ok");
}

test();
