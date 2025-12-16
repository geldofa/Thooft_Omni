import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function importLithomanTasks() {
    try {
        // Authenticate as admin
        await pb.admins.authWithPassword('admin@example.com', 'admin123456');
        console.log("Authenticated as Admin.");

        const csvFilePath = path.resolve('./Import/Lithoman - Taken.csv');
        const csvFileContent = fs.readFileSync(csvFilePath, 'utf8');

        // Parse CSV
        const { data } = Papa.parse(csvFileContent, {
            header: false, // Don't use first row as header, we'll manually skip
            skipEmptyLines: true,
            comments: '#', // Assuming no comments, but good to have
        });

        // console.log("--- Raw PapaParse Data (first 10 rows) ---");
        // data.slice(0, 10).forEach((row, index) => console.log(`Row ${index}:`, row));
        // console.log("------------------------------------------");

        // Skip initial header rows
        const taskData = data.slice(3); // Skip first 3 rows

        // console.log("--- Task Data after slice(3) (first 10 rows) ---");
        // taskData.slice(0, 10).forEach((row, index) => console.log(`Task Data Row ${index}:`, row));
        // console.log("--------------------------------------------------");

        let currentPress = "Lithoman"; // As per the file name
        let currentCategory = "";
        let tasksImportedCount = 0;

        // Map for categories - keys are uppercase for case-insensitive matching
        const categoryMap = {
            "AFROLLER": "Afroller",
            "DRUKGROEPEN": "Drukgroepen",
            "MEGTEC DROGER LITHOMAN": "Droger",
            "BOVENBOUW": "Bovenbouw",
            "LIJMINSTALLATIE": "Lijminstallatie",
            "VOUWER": "Vouwer",
            "SNIJSTRAAT - STACKER - BINDSTRAAT - ROBOT": "Snijstraat",
            "VARIA": "Varia",
            // Special case found during inspection
            "BINNENKANTEN DRUKGROEPKASTEN VETVRIJ MAKEN": "Drukgroepen"
        };

        // Helper to format date to YYYY-MM-DD
        const formatDate = (dateString) => {
            if (!dateString) return null;
            dateString = dateString.trim();
            if (dateString.length === 0) return null;
            const parts = dateString.split('/');
            if (parts.length === 3) {
                // Ensure month and day have leading zeros if needed
                const day = parts[0].padStart(2, '0');
                const month = parts[1].padStart(2, '0');
                const year = parts[2];
                return `${year}-${month}-${day}`;
            }
            return null;
        };

        for (const row of taskData) {
            const colB = (row[1] || '').trim(); // Task title or category header
            const colD = (row[3] || '').trim(); // Original column D in CSV, now row[3]

            // Corrected: Check if it's a category row (column B is a known category and column D (row[3]) is 'T')
            if (Object.keys(categoryMap).some(key => colB.toUpperCase() === key) && colD.toUpperCase() === 'T') {
                currentCategory = categoryMap[colB.toUpperCase()];
                console.log(`--- Identified Category: ${currentCategory} ---`);
                continue; // Move to the next row
            }

            // Process as a task if column B is not empty and a category is set
            if (colB && currentCategory) {
                const task = {
                    title: colB,
                    press: currentPress,
                    category: currentCategory,
                };

                let intervalOffset = 0; // Offset for columns if group_title is present
                const colC = (row[2] || '').trim(); // Interval number or group_title from original Col C

                // Check if colC is group_title or interval
                if (colC && isNaN(parseInt(colC))) { // colC is text, so it's group_title
                    task.group_title = colC;
                    intervalOffset = 1; // Shift subsequent columns by one
                } else if (colC && !isNaN(parseInt(colC))) { // colC is a number, so it's interval
                    task.interval = parseInt(colC);
                }

                // Interval Unit (colD if no group_title, colE if group_title)
                // Use original column D (row[3]) if no group_title offset, else original col E (row[4])
                const intervalUnitCol = (row[3 + intervalOffset] || '').trim().toUpperCase();
                if (task.interval) { // Only set unit if interval is present
                    switch (intervalUnitCol) {
                        case 'D':
                            task.interval_unit = 'days';
                            break;
                        case 'W': // Weeks, convert to days as schema doesn't have weeks
                            task.interval_unit = 'days';
                            task.interval = task.interval * 7;
                            break;
                        case 'M':
                            task.interval_unit = 'months';
                            break;
                        case 'J': // Jaar = Year, convert to months
                            task.interval_unit = 'months';
                            task.interval = task.interval * 12;
                            break;
                        default:
                            console.warn(`Unknown interval unit: ${intervalUnitCol} for task: "${task.title}". Defaulting to "days".`);
                            task.interval_unit = 'days'; // Default to days if unknown
                            break;
                    }
                }

                // Last Maintenance (colE if no group_title, colF if group_title)
                task.last_maintenance = formatDate(row[4 + intervalOffset]);

                // Next Maintenance (colF if no group_title, colG if group_title)
                task.next_maintenance = formatDate(row[5 + intervalOffset]);
                
                // Assigned To (colH if no group_title, colI if group_title)
                task.assigned_to = (row[7 + intervalOffset] || '').trim();

                // Notes (colI if no group_title, colJ if group_title)
                task.notes = (row[8 + intervalOffset] || '').trim();
                
                // Remove empty fields to avoid sending null/empty strings for non-required fields
                Object.keys(task).forEach(key => {
                    if (task[key] === null || task[key] === '' || (Array.isArray(task[key]) && task[key].length === 0)) {
                        delete task[key];
                    }
                });
                
                // console.log("Attempting to import task:", task); // Log the task object before import

                try {
                    await pb.collection('maintenance_tasks').create(task);
                    tasksImportedCount++;
                    // console.log(`Imported task: "${task.title}" (Category: ${task.category}, Press: ${task.press})`);
                } catch (error) {
                    console.error(`Failed to import task "${task.title}" (Category: ${task.category}, Press: ${task.press}):`, error.response?.data || error.message);
                }
            } else if (colB && !currentCategory) {
                console.warn(`Skipping task "${colB}" because no category has been identified yet.`);
            }
        }
        console.log(`Successfully imported ${tasksImportedCount} tasks.`);

    } catch (error) {
        console.error("Error during import process:", error.response?.data || error.message);
    } finally {
        // Log out the admin if session is still active
        if (pb.authStore.isValid) {
            pb.authStore.clear();
            console.log("Admin logged out.");
        }
    }
}

importLithomanTasks();