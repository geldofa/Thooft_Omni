import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MaintenanceTask, pb, Press } from '../components/AuthContext';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

interface ReportOptions {
    reportName: string;
    period: string; // Changed from union to string
    selectedPresses: Press[];
    tasks: MaintenanceTask[];
    reportId?: string; // Optional: linkage to configuration
    fileName?: string; // Optional: custom filename
    exportTypes?: string[]; // New: types of tasks exported
    startDate?: Date; // New: Start of report range
    endDate?: Date; // New: End of report range
}

export const generateMaintenanceReport = async ({
    reportName,
    period,
    selectedPresses,
    tasks,
    reportId,
    fileName,
    exportTypes = [],
    startDate,
    endDate
}: ReportOptions): Promise<any> => {
    // 1. Initialize Document
    const doc = new jsPDF();
    const margin = 7;
    const pageWidth = doc.internal.pageSize.width;

    // 2. Header
    const pressLabel = selectedPresses.length > 0
        ? selectedPresses.map(p => p.name).join(', ')
        : 'Alle persen';
    const dynamicTitle = `${reportName} | ${pressLabel} | ${period}`;

    doc.setFontSize(14);
    doc.text(dynamicTitle, margin, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('OMNI', pageWidth - margin, 20, { align: 'right' });
    doc.text(`Gegenereerd op: ${format(new Date(), 'dd MMMM yyyy HH:mm', { locale: nl })}`, pageWidth - margin, 25, { align: 'right' });

    // 3. Metadata & Counts
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekEnd = new Date(today);
    const dayOfWeek = today.getDay(); // 0 (Sun) to 6 (Sat)
    const diffToSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    weekEnd.setDate(today.getDate() + diffToSunday);
    weekEnd.setHours(23, 59, 59, 999);

    const soonLimit = new Date(today);
    soonLimit.setDate(today.getDate() + 30);

    const STATUS_COLORS: Record<string, number[]> = {
        overdue: [239, 68, 68],  // Red
        thisWeek: [255, 123, 0], // Orange
        soon: [255, 191, 0],     // Yellow
        executed: [34, 197, 94], // Green
    };

    const counts = {
        overdue: exportTypes.includes('overdue') ? tasks.filter(t => new Date(t.nextMaintenance) < today).length : null,
        thisWeek: exportTypes.includes('this_week') ? tasks.filter(t => { const n = new Date(t.nextMaintenance); return n >= today && n <= weekEnd; }).length : null,
        soon: exportTypes.includes('soon') ? tasks.filter(t => { const n = new Date(t.nextMaintenance); return n >= today && n <= soonLimit; }).length : null,
        executed: exportTypes.includes('executed') ? tasks.filter(t => {
            const last = t.lastMaintenance ? new Date(t.lastMaintenance) : null;
            return startDate && endDate && last && last >= startDate && last <= endDate;
        }).length : null,
    };

    const statusRow: any[] = [];
    const statusColIndices: number[] = [];

    if (counts.overdue !== null) {
        statusColIndices.push(statusRow.length);
        statusRow.push('Nu Nodig:', counts.overdue.toString());
    }
    if (counts.thisWeek !== null) {
        statusColIndices.push(statusRow.length);
        statusRow.push('Deze Week:', counts.thisWeek.toString());
    }
    if (counts.soon !== null) {
        statusColIndices.push(statusRow.length);
        statusRow.push('Binnenkort:', counts.soon.toString());
    }
    if (counts.executed !== null) {
        statusColIndices.push(statusRow.length);
        statusRow.push('Uitgevoerd:', counts.executed.toString());
    }

    const metadataBody: any[] = [];

    if (statusRow.length > 0) {
        metadataBody.push(statusRow);
    }

    autoTable(doc, {
        startY: 30,
        margin: { left: margin, right: margin },
        body: metadataBody,
        theme: 'plain',
        styles: { fontSize: 8.5, cellPadding: 3 },
        columnStyles: {
            0: { fontStyle: 'bold' as const, cellWidth: 28 },
            1: { cellWidth: 15 },
            2: { fontStyle: 'bold' as const, cellWidth: 'auto' },
            3: { cellWidth: 'auto' },
            4: { fontStyle: 'bold' as const, cellWidth: 'auto' },
            5: { cellWidth: 'auto' },
            6: { fontStyle: 'bold' as const, cellWidth: 'auto' },
            7: { cellWidth: 'auto' },
        },
        didDrawCell: (data) => {
            if (data.row.index === 0 && statusColIndices.includes(data.column.index)) {
                // Determine which status this is
                let colorKey = '';
                const label = data.cell.text[0];
                if (label.includes('Nu Nodig')) colorKey = 'overdue';
                else if (label.includes('Deze Week')) colorKey = 'thisWeek';
                else if (label.includes('Binnenkort')) colorKey = 'soon';
                else if (label.includes('Uitgevoerd')) colorKey = 'executed';

                if (colorKey && STATUS_COLORS[colorKey]) {
                    const color = STATUS_COLORS[colorKey];
                    doc.setDrawColor(color[0], color[1], color[2]);
                    doc.setLineWidth(1.2);
                    doc.line(
                        data.cell.x,
                        data.cell.y + 1,
                        data.cell.x,
                        data.cell.y + data.cell.height - 1
                    );
                }
            }
        }
    });

    // 4. Group Tasks by Press and Category
    const tasksByPressAndCategory = tasks.reduce((acc, task) => {
        const press = task.press || 'Onbekend';
        const category = task.category || 'Algemeen';

        if (!acc[press]) acc[press] = {};
        if (!acc[press][category]) acc[press][category] = [];

        acc[press][category].push(task);
        return acc;
    }, {} as Record<string, Record<string, MaintenanceTask[]>>);

    const pressNames = Object.keys(tasksByPressAndCategory);
    let currentY = (doc as any).lastAutoTable.finalY + 5;

    // 6. Render Tables for Each Press
    let hasOverflowed = false;

    pressNames.forEach((pressName, index) => {
        const categories = tasksByPressAndCategory[pressName];
        const categoryNames = Object.keys(categories);
        const totalTasksInPress = Object.values(categories).flat().length;

        // Start new page if needed
        if (index > 0 && (hasOverflowed || currentY > 180)) {
            doc.addPage();
            currentY = 15;
        }

        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.setFont("helvetica", "bold");
        doc.text(pressName, margin, currentY);

        // Add Press Subtotal on the right
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.setFont("helvetica", "normal");
        doc.text(`${totalTasksInPress} taken`, pageWidth - margin, currentY, { align: 'right' });

        currentY += 5;

        const tableColumn = ["Taak / Subtaak", "Interval", "Voltooid Op", "Uitgevoerd Door", "Opmerking"];
        const tableRows: any[] = [];
        const statusColors: Record<number, number[]> = {};

        categoryNames.forEach(catName => {
            const tasksInCategory = categories[catName];

            // Add Category Header Row
            tableRows.push([
                {
                    content: catName.toUpperCase(),
                    colSpan: 5,
                    categoryCount: tasksInCategory.length, // Custom property for didDrawCell
                    isCategoryHeader: true,                // Custom property for didDrawCell
                    styles: {
                        fillColor: [245, 247, 250],
                        textColor: [71, 85, 105],
                        fontStyle: 'bold',
                        fontSize: 9,
                        cellPadding: 2,
                        halign: 'left'
                    }
                }
            ]);

            // Add Tasks for this category
            tasksInCategory.forEach(task => {
                const rowIndex = tableRows.length;

                // Determine Status Color
                let statusColor = [226, 232, 240]; // Default Gray
                const next = new Date(task.nextMaintenance);
                const last = task.lastMaintenance ? new Date(task.lastMaintenance) : null;

                if (next < today) {
                    statusColor = STATUS_COLORS.overdue;
                } else if (next <= weekEnd) {
                    statusColor = STATUS_COLORS.thisWeek;
                } else if (next <= soonLimit) {
                    statusColor = STATUS_COLORS.soon;
                } else if (startDate && endDate && last && last >= startDate && last <= endDate) {
                    statusColor = STATUS_COLORS.executed;
                }

                statusColors[rowIndex] = statusColor;

                const taskDisplayName = (task.subtaskName && task.subtaskName !== task.task)
                    ? `${task.task}\n- ${task.subtaskName}`
                    : task.task;

                const interval = `${task.maintenanceInterval} ${task.maintenanceIntervalUnit}`;
                const completedDate = task.lastMaintenance
                    ? format(new Date(task.lastMaintenance), 'dd-MM-yyyy', { locale: nl })
                    : '-';

                tableRows.push([
                    taskDisplayName,
                    interval,
                    completedDate,
                    task.assignedTo || '-',
                    task.opmerkingen || '-'
                ]);
            });
        });

        // @ts-ignore
        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: currentY,
            margin: { left: margin, right: margin },
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185], textColor: 255 },
            styles: { fontSize: 8, cellPadding: 3 },
            columnStyles: {
                0: { cellWidth: 70 }, // Taak
                1: { cellWidth: 20 }, // Interval
                2: { cellWidth: 25 }, // Voltooid
                3: { cellWidth: 25 }, // Door
                4: { cellWidth: 'auto' } // Opmerking
            },
            didDrawCell: (data) => {
                // 1. Draw status line for task rows in the first column
                if (data.section === 'body' && data.column.index === 0 && !(data.cell.raw as any)?.isCategoryHeader) {
                    const color = statusColors[data.row.index];
                    if (color) {
                        doc.setDrawColor(color[0], color[1], color[2]);
                        doc.setLineWidth(1.5);
                        // Draw line on the left side of the cell
                        doc.line(
                            data.cell.x + 0.5,
                            data.cell.y,
                            data.cell.x + 0.5,
                            data.cell.y + data.cell.height
                        );
                    }
                }

                // 2. Draw Category Subtotal on the right for header rows
                const cellRaw = data.cell.raw as any;
                if (cellRaw && cellRaw.isCategoryHeader && cellRaw.categoryCount !== undefined) {
                    doc.setFontSize(8);
                    doc.setTextColor(148, 163, 184); // Slate 400
                    doc.setFont("helvetica", "normal");
                    const countText = `${cellRaw.categoryCount} taken`;
                    const textWidth = doc.getTextWidth(countText);
                    doc.text(
                        countText,
                        data.cell.x + data.cell.width - textWidth - 2,
                        data.cell.y + (data.cell.height / 2) + 1,
                        { align: 'left' }
                    );
                }
            }
        });

        currentY = (doc as any).lastAutoTable.finalY + 15;

        if (doc.getNumberOfPages() > 1) {
            hasOverflowed = true;
        }
    });

    // 6. Generate Blob and Upload
    const pdfBlob = doc.output('blob');

    let finalFileName = fileName || `maintenance_report_${format(new Date(), 'yyyyMMdd')}`;
    if (!finalFileName.toLowerCase().endsWith('.pdf')) {
        finalFileName += '.pdf';
    }

    const formData = new FormData();
    formData.append('file', pdfBlob, finalFileName);
    formData.append('generated_at', new Date().toISOString());

    if (reportId) {
        formData.append('maintenance_report', reportId);
    }

    try {
        const record = await pb.collection('report_files').create(formData);
        return record;
    } catch (error) {
        console.error("Failed to upload report:", error);
        throw error;
    }
};
