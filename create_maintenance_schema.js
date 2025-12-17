import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

const createMaintenanceSchema = async () => {
  try {
    await pb.admins.authWithPassword('admin@example.com', 'admin123456');

    try {
      await pb.collections.delete('maintenance_tasks');
      console.log("Successfully deleted 'maintenance_tasks' collection.");
    } catch (error) {
      console.log("Collection 'maintenance_tasks' did not exist, which is fine.");
    }

    const collection = {
      name: 'maintenance_tasks',
      type: 'base',
      schema: [
        { name: 'title', type: 'text', required: true },
        { name: 'category', type: 'text' },
        { name: 'press', type: 'text' },
        { name: 'interval', type: 'number' },
        { name: 'interval_unit', type: 'text' },
        { name: 'last_maintenance', type: 'date' },
        { name: 'next_maintenance', type: 'date' },
        { name: 'assigned_to', type: 'text' },
        { name: 'notes', type: 'text' },
      ],
    };

    try {
      await pb.collections.create(collection);
      console.log("Successfully created 'maintenance_tasks' collection.");
    } catch (error) {
      console.error('Failed to create collection:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('An error occurred:', error);
  }
};

createMaintenanceSchema();
