import { PDFDownloadLink } from "@react-pdf/renderer";
import { Download, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { MaintenanceReportPDF, type MaintenanceTask, type ColumnDef } from "./MaintenanceReportPDF";

/* ------------------------------------------------------------------ */
/*  Dummy data (15 taken → forceert page-break)                        */
/* ------------------------------------------------------------------ */
export const dummyTasks: MaintenanceTask[] = [
    { id: "1", category: "Afroller", taskName: "Smeerpunten controleren", interval: "Dagelijks", completedOn: "2026-02-20 08:15", executedBy: "Jan Pieters", note: "Alle punten in orde" },
    { id: "2", category: "Afroller", taskName: "Olie bijvullen", interval: "Wekelijks", completedOn: "2026-02-19 09:30", executedBy: "Piet Jansen", note: "0.5L bijgevuld" },
    { id: "3", category: "Drukgroepen", taskName: "Luchfilters vervangen", interval: "Maandelijks", completedOn: "2026-02-15 14:00", executedBy: "Karel de Groot", note: "Filter type A3 gebruikt" },
    { id: "4", category: "Drukgroepen", taskName: "Riemen controleren", interval: "Wekelijks", completedOn: "2026-02-18 10:45", executedBy: "Jan Pieters", note: "Spanning OK" },
    { id: "5", category: "Drukgroepen", taskName: "Walsen reinigen", interval: "Dagelijks", completedOn: "2026-02-20 07:00", executedBy: "Henk Vermeer", note: "Residuen verwijderd" },
    { id: "6", category: "Sensoren", taskName: "Temperatuur sensoren kalibreren", interval: "Maandelijks", completedOn: "2026-02-10 11:00", executedBy: "Piet Jansen", note: "Afwijking < 0.5°C" },
    { id: "7", category: "Veiligheid", taskName: "Noodstop testen", interval: "Wekelijks", completedOn: "2026-02-17 16:00", executedBy: "Karel de Groot", note: "Alle 4 stops getest, werken correct" },
    { id: "8", category: "Hydrauliek", taskName: "Hydrauliek vloeistof controleren", interval: "Maandelijks", completedOn: "2026-02-12 09:00", executedBy: "Henk Vermeer", note: "Niveau goed, geen lekkage" },
    { id: "9", category: "Elektra", taskName: "Elektrische aansluitingen inspecteren", interval: "Kwartaal", completedOn: "2026-01-25 13:30", executedBy: "Jan Pieters", note: "Kabel 7 vervangen" },
    { id: "10", category: "Veiligheid", taskName: "Veiligheidsbeugels controleren", interval: "Wekelijks", completedOn: "2026-02-18 08:00", executedBy: "Piet Jansen", note: "Alles in orde" },
    { id: "11", category: "Software", taskName: "Software-update draaien", interval: "Kwartaal", completedOn: "2026-01-30 15:00", executedBy: "Karel de Groot", note: "Versie 4.2.1 geïnstalleerd" },
    { id: "12", category: "Afvoer", taskName: "Afvoerkanalen reinigen", interval: "Maandelijks", completedOn: "2026-02-14 10:30", executedBy: "Henk Vermeer", note: "Lichte verstopping verholpen" },
    { id: "13", category: "Drukgroepen", taskName: "Lagers smeren", interval: "Wekelijks", completedOn: "2026-02-19 11:15", executedBy: "Jan Pieters", note: "Lager 3 maakt geluid – monitoring" },
    { id: "14", category: "Drukgroepen", taskName: "Persdruk controleren", interval: "Dagelijks", completedOn: "2026-02-20 06:45", executedBy: "Piet Jansen", note: "Druk stabiel op 4.2 bar" },
    { id: "15", category: "Transport", taskName: "Transportband inspectie", interval: "Maandelijks", completedOn: "2026-02-08 14:00", executedBy: "Karel de Groot", note: "Slijtage aan rand, vervangen gepland" },
];

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */
export interface PdfDownloadButtonProps {
    tasks?: MaintenanceTask[];
    reportTitle?: string;
    fileName?: string;
    selectedPress?: string;
    selectedPeriod?: string;
    selectedStatus?: string;
    columns?: ColumnDef[];
    fontSize?: number;
    marginH?: number;
    marginV?: number;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
const PdfDownloadButton = ({
    tasks = dummyTasks,
    reportTitle = "Onderhoud Nu Nodig",
    fileName = "onderhoud-rapport.pdf",
    selectedPress = "Alle persen",
    selectedPeriod = "Laatste 7 dagen",
    selectedStatus = "Nu Nodig",
    columns,
    fontSize,
    marginH,
    marginV,
}: PdfDownloadButtonProps) => (
    <PDFDownloadLink
        document={
            <MaintenanceReportPDF
                tasks={tasks}
                reportTitle={reportTitle}
                selectedPress={selectedPress}
                selectedPeriod={selectedPeriod}
                selectedStatus={selectedStatus}
                columns={columns}
                fontSize={fontSize}
                marginH={marginH}
                marginV={marginV}
            />
        }
        fileName={fileName}
    >
        {({ loading }) => (
            <Button disabled={loading}>
                {loading ? (
                    <>
                        <Loader2 className="animate-spin" />
                        Document genereren...
                    </>
                ) : (
                    <>
                        <Download />
                        Download Rapport (.pdf)
                    </>
                )}
            </Button>
        )}
    </PDFDownloadLink>
);

export default PdfDownloadButton;
