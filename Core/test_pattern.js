const fs = require('fs');
fetch('http://127.0.0.1:8090/api/collections/rotation_patterns/records?perPage=100')
  .then(res => res.json())
  .then(data => console.log(JSON.stringify(data.items.map(i => ({ name: i.naam, patroon: i.patroon })), null, 2)))
  .catch(console.error);
