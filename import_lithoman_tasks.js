import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import PocketBase from 'pocketbase';

const PB_URL = 'http://127.0.0.1:8090';
const pb = new PocketBase(PB_URL);

async function importLithomanTasks() {
    try {
        const adminEmail = "geldofa@gmail.com";
        const adminPass = "cQGNFBWI$zVV%3UV!hBqi*8Le&K3nLS!V!z&#8*zJk9z6wIaoh7OdmebJuhWuq4$";

        await pb.admins.authWithPassword(adminEmail, adminPass);
        console.log("Authenticated as Superuser.");

        const pressId = '0i13j2r636t1ghr'; // Lithoman

        // --- PREPARE LOOKUPS ---
        const operators = await pb.collection('operatoren').getFullList();
        const ploegen = await pb.collection('ploegen').getFullList();

        const opNameToId = {};
        operators.forEach(o => { opNameToId[o.naam.trim().toLowerCase()] = o.id; });

        const teamNameToId = {};
        ploegen.forEach(p => { teamNameToId[p.naam.trim().toLowerCase()] = p.id; });

        // --- CLEANUP ---
        console.log("Cleaning up previous Lithoman tasks...");
        const existingTasks = await pb.collection('onderhoud').getFullList({
            filter: `pers = "${pressId}"`
        });
        for (const t of existingTasks) {
            await pb.collection('onderhoud').delete(t.id);
        }
        console.log("Cleanup complete.");

        // --- IMPORT ---
        const existingCategories = await pb.collection('categorieen').getFullList();
        const categoryNameToId = {};
        existingCategories.forEach(c => {
            categoryNameToId[c.naam.toUpperCase()] = c.id;
        });

        const getCategoryId = async (name) => {
            const upperName = name.toUpperCase();
            if (categoryNameToId[upperName]) return categoryNameToId[upperName];
            const newCat = await pb.collection('categorieen').create({ naam: name, pers: pressId });
            categoryNameToId[upperName] = newCat.id;
            return newCat.id;
        };

        const csvFilePath = path.resolve('./Import/Lithoman - Taken');
        const csvFileContent = fs.readFileSync(csvFilePath, 'utf8');

        const { data } = Papa.parse(csvFileContent, { header: false, skipEmptyLines: true });
        const taskData = data.slice(3);

        const categoryMap = {
            "AFROLLER": "Afroller",
            "DRUKGROEPEN": "Drukgroepen",
            "MEGTEC DROGER LITHOMAN": "Droger",
            "BOVENBOUW": "Bovenbouw",
            "LIJMINSTALLATIE": "Lijminstallatie",
            "VOUWER": "Vouwer",
            "SNIJSTRAAT - STACKER - BINDSTRAAT - ROBOT": "Snijstraat",
            "VARIA": "Varia",
            "BINNENKANTEN DRUKGROEPKASTEN VETVRIJ MAKEN": "Drukgroepen"
        };

        let currentCategoryName = "";
        let currentCategoryId = "";
        let currentTaskGroup = "";
        let tasksImportedCount = 0;

        const formatDate = (dateString) => {
            if (!dateString) return null;
            dateString = dateString.trim();
            if (!dateString || dateString.toLowerCase().includes('week')) return null;
            const parts = dateString.split('/');
            if (parts.length === 3) {
                const day = parts[0].padStart(2, '0');
                const month = parts[1].padStart(2, '0');
                const year = parts[2].trim();
                return `${year}-${month}-${day} 00:00:00`;
            }
            return null;
        };

        const parseCommentDate = (dateString) => {
            if (!dateString) return null;
            // Example: "09.05.2025 | 10:25"
            const match = dateString.match(/(\d{2})[./](\d{2})[./](\d{4})/);
            if (match) {
                return `${match[3]}-${match[2]}-${match[1]} 12:00:00`;
            }
            return null;
        };

        for (const row of taskData) {
            const colB = (row[1] || '').trim();
            const colC = (row[2] || '').trim();
            const colD = (row[3] || '').trim();
            const colE = (row[4] || '').trim();
            const colF = (row[5] || '').trim();
            const colG = (row[6] || '').trim();
            const colI = (row[8] || '').trim(); // Uitgevoerd door
            const colJ = (row[9] || '').trim(); // Opmerkingen
            const colK = (row[10] || '').trim(); // Laatste opmerking (often contains date)

            // Category Detection
            const matchedCatKey = Object.keys(categoryMap).find(key => colB.toUpperCase().includes(key));
            if (matchedCatKey && (colD.toUpperCase() === 'T' || !colD)) {
                currentCategoryName = categoryMap[matchedCatKey];
                currentCategoryId = await getCategoryId(currentCategoryName);
                currentTaskGroup = "";
                continue;
            }

            // Group Header Detection
            if (colB && !colD && !colF && !colG) {
                currentTaskGroup = colB;
                continue;
            }

            // Task Processing
            if (colB && currentCategoryId) {
                if (!colC) currentTaskGroup = "";

                const task = {
                    task: currentTaskGroup || colB,
                    subtask: colC ? `${colB} (${colC})` : colB,
                    pers: pressId,
                    category: currentCategoryId,
                    assigned_operator: [],
                    assigned_team: [],
                    opmerkingen: colJ,
                    commentDate: parseCommentDate(colK)
                };

                // Interval
                const intervalVal = parseInt(colD);
                if (!isNaN(intervalVal)) {
                    task.interval = intervalVal;
                    const unit = colE.toUpperCase();
                    if (unit === 'D') task.interval_unit = 'Dagen';
                    else if (unit === 'W') task.interval_unit = 'Weken';
                    else if (unit === 'M') task.interval_unit = 'Maanden';
                    else if (unit === 'J') task.interval_unit = 'Jaren';
                }

                task.last_date = formatDate(colF);
                task.next_date = formatDate(colG);

                // Assignment resolution
                if (colI) {
                    // Split names by common separators
                    const names = colI.split(/[,&\/]| en /i).map(n => n.trim().toLowerCase()).filter(Boolean);
                    for (const name of names) {
                        if (opNameToId[name]) {
                            task.assigned_operator.push(opNameToId[name]);
                        } else if (teamNameToId[name]) {
                            task.assigned_team.push(teamNameToId[name]);
                        } else {
                            // Try partial match for "Ploeg Koen" -> "Ploeg Koen V."
                            const foundTeam = ploegen.find(p => p.naam.toLowerCase().includes(name));
                            if (foundTeam) {
                                task.assigned_team.push(foundTeam.id);
                            } else {
                                const foundOp = operators.find(o => o.naam.toLowerCase().includes(name));
                                if (foundOp) {
                                    task.assigned_operator.push(foundOp.id);
                                } else {
                                    // Fallback: put in opmerkingen if not matched
                                    if (!task.opmerkingen.includes(name)) {
                                        task.opmerkingen = (task.opmerkingen ? task.opmerkingen + " | " : "") + `Assigned: ${name}`;
                                    }
                                }
                            }
                        }
                    }
                }

                // If colK has text other than date, append to opmerkingen
                if (colK && !parseCommentDate(colK)) {
                    task.opmerkingen = (task.opmerkingen ? task.opmerkingen + " | " : "") + colK;
                }

                try {
                    await pb.collection('onderhoud').create(task);
                    tasksImportedCount++;
                } catch (error) {
                    console.error(`Failed: ${task.subtask} ->`, error.response?.data || error.message);
                }
            }
        }

        console.log(`Successfully imported ${tasksImportedCount} tasks with resolved assignments and dates.`);

    } catch (error) {
        console.error("Fatal error:", error.message);
    }
}

importLithomanTasks();