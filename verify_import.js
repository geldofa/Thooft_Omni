import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

const verifyImport = async () => {
  try {
    await pb.admins.authWithPassword('admin@example.com', 'admin123456');

    try {
      const collection = await pb.collections.getOne('maintenance_tasks');
      console.log('Schema for maintenance_tasks:', JSON.stringify(collection.schema, null, 2));

      const records = await pb.collection('maintenance_tasks').getFullList();
      console.log(`Found ${records.length} records in the 'maintenance_tasks' collection.`);
      if (records.length > 0) {
        console.log('Here is the first record:');
        console.log(JSON.stringify(records[0], null, 2));
      }
    } catch (error) {
      console.error("Could not fetch records from 'maintenance_tasks'.", error.response?.data || error.message);
    }
  } catch (error) {
    console.error('An error occurred during authentication:', error);
  }
};

verifyImport();
