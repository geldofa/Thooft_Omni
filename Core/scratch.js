const pb = require('pocketbase/cjs');
const client = new pb('http://127.0.0.1:8090');

async function test() {
  await client.admins.authWithPassword('ctpthooft@gmail.com', '... wait I dont know the password');
}
