import pb from 'pocketbase';
const p = new pb('http://127.0.0.1:8090');
const records = await p.collection('role_permissions').getFullList();
console.log(JSON.stringify(records, null, 2));
