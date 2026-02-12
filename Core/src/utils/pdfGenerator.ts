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
}

export const generateMaintenanceReport = async ({
    period,
    tasks,
    reportId
}: ReportOptions): Promise<any> => {
    // 1. Initialize Document
    const doc = new jsPDF();
    const margin = 7;
    const pageWidth = doc.internal.pageSize.width;

    // 2. Header
    doc.setFontSize(20);
    doc.text('Onderhoudsrapportage', margin, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Omni.Thooft', pageWidth - margin, 20, { align: 'right' });
    doc.text(`Gegenereerd op: ${format(new Date(), 'dd MMMM yyyy HH:mm', { locale: nl })}`, pageWidth - margin, 25, { align: 'right' });

    // 3. Metadata
    autoTable(doc, {
        startY: 35,
        margin: { left: margin, right: margin },
        body: [
            ['Periode', period],
            ['Aantal Uitgevoerde Taken', tasks.length.toString()]
        ],
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 2 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } }
    });

    // 4. Group Tasks by Press
    const tasksByPress = tasks.reduce((acc, task) => {
        const press = task.press || 'Onbekend';
        if (!acc[press]) acc[press] = [];
        acc[press].push(task);
        return acc;
    }, {} as Record<string, MaintenanceTask[]>);

    const pressNames = Object.keys(tasksByPress);
    let currentY = (doc as any).lastAutoTable.finalY + 15;

    // 5. Render Tables for Each Press
    let hasOverflowed = false;

    pressNames.forEach((pressName, index) => {
        const pressTasks = tasksByPress[pressName];

        // If the report has already exceeded one page, or this is not the first press
        // and we are short on space, start a new page.
        if (index > 0 && (hasOverflowed || currentY > 180)) {
            doc.addPage();
            currentY = 15;
        }

        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.setFont("helvetica", "bold");
        doc.text(pressName, margin, currentY);
        currentY += 5;

        const tableColumn = ["Taak / Subtaak", "Interval", "Voltooid Op", "Uitgevoerd Door", "Opmerking"];
        const tableRows = pressTasks.map(task => {
            // Deduplicate task name and subtask name if identical
            const taskName = (task.subtaskName && task.subtaskName !== task.task)
                ? `${task.task}\n- ${task.subtaskName}`
                : task.task;

            const interval = `${task.maintenanceInterval} ${task.maintenanceIntervalUnit}`;
            const completedDate = task.lastMaintenance
                ? format(new Date(task.lastMaintenance), 'dd-MM-yyyy', { locale: nl })
                : '-';

            return [
                taskName,
                interval,
                completedDate,
                task.assignedTo || '-',
                task.opmerkingen || '-'
            ];
        });

        // @ts-ignore - autoTable types can be tricky
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
            }
        });

        currentY = (doc as any).lastAutoTable.finalY + 15;

        // Track if we have moved beyond the first page
        if (doc.getNumberOfPages() > 1) {
            hasOverflowed = true;
        }
    });

    // 6. Generate Blob and Upload
    const pdfBlob = doc.output('blob');
    const fileName = `report_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`;

    const formData = new FormData();
    formData.append('file', pdfBlob, fileName);
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
