import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { formatDisplayDate, formatDisplayDateTime } from '../../utils/dateUtils';

export interface DrukwerkTask {
    id: string;
    date: string;
    order_nummer: number;
    klant_order_beschrijving: string;
    versie: string;
    blz: number;
    ex_omw: number;
    netto_oplage: number;
    opstart: boolean;
    k_4_4: number;
    k_4_0: number;
    k_1_0: number;
    k_1_1: number;
    k_4_1: number;
    max_bruto: number;
    groen: number;
    rood: number;
    delta: number;
    delta_percent: number;
    pers_name?: string;
}

export interface DrukwerkenPDFProps {
    reportTitle: string;
    selectedPeriod: string;
    generatedAt?: string;
    tasks: DrukwerkTask[];
    fontSize?: number;
    marginH?: number;
    marginV?: number;
}

const styles = StyleSheet.create({
    page: {
        padding: 0,
        fontFamily: 'Helvetica',
        color: '#1f2937',
    },
    headerWrapper: {
        backgroundColor: '#0284c7', // Sky-600
        color: '#ffffff',
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.2)',
        paddingBottom: 10,
        marginBottom: 10,
    },
    omniLogo: {
        fontSize: 22,
        fontWeight: 'bold',
        fontFamily: 'Helvetica-Bold',
        color: '#ffffff',
    },
    headerTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    headerTitleRow: {
        marginBottom: 15,
    },
    mainTitle: {
        fontSize: 24,
        fontFamily: 'Helvetica-Bold',
        color: '#ffffff',
    },
    headerDetailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 5,
    },
    detailText: {
        fontSize: 16,
        fontFamily: 'Helvetica-Bold',
        color: '#ffffff',
    },
    detailTextSmall: {
        fontSize: 12,
        fontFamily: 'Helvetica-Bold',
        color: '#ffffff',
    },
    headerSpacer: {
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.4)',
        marginTop: 5,
        marginBottom: 10,
    },
    dateText: {
        fontSize: 8,
        color: 'rgba(255, 255, 255, 0.8)',
    },
    pageContent: {
        paddingTop: 10,
    },
    // Top-level grouping headers
    groupHeaderRow: {
        flexDirection: 'row',
        minHeight: 18,
        alignItems: 'center',
    },
    groupHeaderCell: {
        fontSize: 7,
        fontFamily: 'Helvetica-Bold',
        textTransform: 'uppercase',
        textAlign: 'center',
        paddingVertical: 2,
        borderRightWidth: 1,
        borderRightColor: '#94a3b8',
    },
    // Main column headers
    tableHeaderRow: {
        flexDirection: 'row',
        backgroundColor: '#f8fafc',
        borderTopWidth: 1,
        borderTopColor: '#000000',
        minHeight: 20,
        alignItems: 'center',
    },
    tableHeaderCell: {
        fontFamily: 'Helvetica-Bold',
        color: '#475569',
        fontSize: 7,
        paddingHorizontal: 2,
    },
    tableRow: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0', // default light
        minHeight: 22,
        alignItems: 'center',
    },
    tableRowDateChange: {
        borderTopWidth: 1,
        borderTopColor: '#848484', // Standard 6-digit hex
    },
    tableCell: {
        color: '#1e293b',
        fontSize: 8,
        paddingHorizontal: 2,
    },
    // Colors from Drukwerken overview
    bgData: { backgroundColor: '#dbeafe' },      // blue-100
    bgWissels: { backgroundColor: '#dcfce7' },   // green-100
    bgBerekening: { backgroundColor: '#fef9c3' }, // yellow-100
    bgPrestatie: { backgroundColor: '#f3e8ff' },  // purple-100
    bgWhite: { backgroundColor: '#ffffff' },

    borderR: { borderRightWidth: 1, borderRightColor: '#cbd5e1' }, // slate-300
    borderRBlack: { borderRightWidth: 1, borderRightColor: '#000000' },

    // Columns - Landscape (Total 100%)
    // Combine Klant-desc with Version. Remove version column.
    // Adjusted widths to redistribute the 9% from Version
    colId: { width: '4%', textAlign: 'center' },
    colDate: { width: '7%', textAlign: 'center' },
    colOrderNr: { width: '6%', textAlign: 'center' },
    colOrderName: { width: '25%' }, // 16% + 9%
    // Data Group (15%) - blz(4), exomw(4), netrun(7)
    colPages: { width: '4%', textAlign: 'center' },
    colExOmw: { width: '4%', textAlign: 'center' },
    colNetRun: { width: '7%', textAlign: 'right' },
    // Wissels Group (24%)
    colStartup: { width: '4%', textAlign: 'center' },
    col4_4: { width: '4%', textAlign: 'center' },
    col4_0: { width: '4%', textAlign: 'center' },
    col1_0: { width: '4%', textAlign: 'center' },
    col1_1: { width: '4%', textAlign: 'center' },
    col4_1: { width: '4%', textAlign: 'center' },
    // Berekening Group (18%)
    colMaxGross: { width: '6%', textAlign: 'right' },
    colGreen: { width: '6%', textAlign: 'right' },
    colRed: { width: '6%', textAlign: 'right' },
    // Prestatie Group (11%)
    colDelta: { width: '6%', textAlign: 'right' },
    colDeltaPercent: { width: '5%', textAlign: 'right' },

    textCenter: { textAlign: 'center' },
    textRight: { textAlign: 'right' },
    bold: { fontFamily: 'Helvetica-Bold' },
    subtext: { fontSize: 6, color: '#64748b', marginTop: 1 },

    pageNumber: {
        position: 'absolute',
        fontSize: 8,
        bottom: 10,
        left: 0,
        right: 0,
        textAlign: 'center',
        color: '#94a3b8',
    },
});

export const DrukwerkenPDF: React.FC<DrukwerkenPDFProps> = ({
    reportTitle,
    selectedPeriod,
    generatedAt = formatDisplayDateTime(new Date()),
    tasks,
    fontSize = 8,
    marginH = 15,
    marginV = 10,
}) => {
    const dynamicStyles = {
        headerWrapper: {
            paddingHorizontal: marginH,
            paddingTop: marginV + 15,
            paddingBottom: 8,
        },
        pageContent: {
            paddingHorizontal: marginH,
            paddingBottom: marginV + 30,
        },
        pageNumber: {
            bottom: marginV,
        }
    };

    // Group tasks by press name
    const pressGroups = tasks.reduce((acc: Record<string, DrukwerkTask[]>, task) => {
        const press = task.pers_name || 'Onbekend';
        if (!acc[press]) acc[press] = [];
        acc[press].push(task);
        return acc;
    }, {});

    const sortedPresses = Object.keys(pressGroups).sort();

    return (
        <Document>
            {sortedPresses.map((pressName) => (
                <Page key={pressName} size="A4" orientation="landscape" style={styles.page}>
                    {/* ── Fixed Header ── */}
                    <View style={[styles.headerWrapper, dynamicStyles.headerWrapper]} fixed>
                        {/* Top Row: Title (Left) & Logo/Date (Right) */}
                        <View style={styles.headerTopRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.mainTitle}>{reportTitle}</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={styles.omniLogo}>OMNI</Text>
                                <Text style={styles.dateText}>Gegenereerd op: {generatedAt}</Text>
                            </View>
                        </View>

                        {/* Spacer (Horizontal Line) */}
                        <View style={styles.headerSpacer} />

                        {/* Detail Row */}
                        <View style={styles.headerDetailRow}>
                            <View style={{ width: '50%' }}>
                                <Text style={styles.detailText}>{pressName}</Text>
                            </View>
                            <View style={{ width: '50%', alignItems: 'flex-end' }}>
                                <Text style={styles.detailTextSmall}>
                                    {selectedPeriod}: {pressGroups[pressName].length} jobs
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={[styles.pageContent, dynamicStyles.pageContent]}>
                        {/* Top Group Labels */}
                        <View style={styles.groupHeaderRow} fixed>
                            <View style={[styles.colDate, styles.bgWhite]} />
                            <View style={[styles.colOrderNr, styles.bgWhite]} />
                            <View style={[styles.colOrderName, styles.bgWhite, styles.borderRBlack]} />
                            <View style={[
                                { width: String(4 + 4 + 7) + '%' },
                                styles.bgData,
                                styles.groupHeaderCell,
                                styles.borderRBlack
                            ]}><Text>Data</Text></View>
                            <View style={[
                                { width: String(4 * 6) + '%' },
                                styles.bgWissels,
                                styles.groupHeaderCell,
                                styles.borderRBlack
                            ]}><Text>Wissels</Text></View>
                            <View style={[
                                { width: String(6 * 3) + '%' },
                                styles.bgBerekening,
                                styles.groupHeaderCell,
                                styles.borderRBlack
                            ]}><Text>Berekening</Text></View>
                            <View style={[
                                { width: String(6 + 5) + '%' },
                                styles.bgPrestatie,
                                styles.groupHeaderCell,
                                styles.borderRBlack
                            ]}><Text>Prestatie</Text></View>
                        </View>

                        {/* Table Headers */}
                        <View style={styles.tableHeaderRow} fixed>
                            <View style={[styles.colDate, styles.borderR]}><Text style={styles.tableHeaderCell}>Datum</Text></View>
                            <View style={[styles.colOrderNr, styles.borderR]}><Text style={styles.tableHeaderCell}>Order</Text></View>
                            <View style={[styles.colOrderName, styles.borderRBlack]}><Text style={styles.tableHeaderCell}>Klant / Beschrijving</Text></View>

                            {/* Data */}
                            <View style={[styles.colPages, styles.borderR]}><Text style={[styles.tableHeaderCell, styles.textCenter]}>Pgs</Text></View>
                            <View style={[styles.colExOmw, styles.borderR]}><Text style={[styles.tableHeaderCell, styles.textCenter]}>Omw</Text></View>
                            <View style={[styles.colNetRun, styles.borderRBlack]}><Text style={[styles.tableHeaderCell, styles.textRight]}>Oplage</Text></View>

                            {/* Wissels */}
                            <View style={[styles.colStartup, styles.borderR]}><Text style={[styles.tableHeaderCell, styles.textCenter]}>Start</Text></View>
                            <View style={[styles.col4_4, styles.borderR]}><Text style={[styles.tableHeaderCell, styles.textCenter]}>4/4</Text></View>
                            <View style={[styles.col4_0, styles.borderR]}><Text style={[styles.tableHeaderCell, styles.textCenter]}>4/0</Text></View>
                            <View style={[styles.col1_0, styles.borderR]}><Text style={[styles.tableHeaderCell, styles.textCenter]}>1/0</Text></View>
                            <View style={[styles.col1_1, styles.borderR]}><Text style={[styles.tableHeaderCell, styles.textCenter]}>1/1</Text></View>
                            <View style={[styles.col4_1, styles.borderRBlack]}><Text style={[styles.tableHeaderCell, styles.textCenter]}>4/1</Text></View>

                            {/* Berekening */}
                            <View style={[styles.colMaxGross, styles.borderR]}><Text style={[styles.tableHeaderCell, styles.textCenter]}>Max Bruto</Text></View>
                            <View style={[styles.colGreen, styles.borderR]}><Text style={[styles.tableHeaderCell, styles.textCenter]}>Groen</Text></View>
                            <View style={[styles.colRed, styles.borderRBlack]}><Text style={[styles.tableHeaderCell, styles.textCenter]}>Rood</Text></View>

                            {/* Prestatie */}
                            <View style={[styles.colDelta, styles.borderR]}><Text style={[styles.tableHeaderCell, styles.textCenter]}>Delta</Text></View>
                            <View style={[styles.colDeltaPercent, styles.borderRBlack]}><Text style={[styles.tableHeaderCell, styles.textCenter]}>%</Text></View>
                        </View>

                        {pressGroups[pressName].map((task, index) => {
                            const prevTask = index > 0 ? pressGroups[pressName][index - 1] : null;
                            const isDateChange = prevTask && task.date !== prevTask.date;

                            return (
                                <View
                                    style={[
                                        styles.tableRow,
                                        isDateChange ? styles.tableRowDateChange : {}
                                    ]}
                                    key={task.id}
                                    wrap={false}
                                >
                                    <View style={[styles.colDate, styles.borderR]}><Text style={[styles.tableCell, { fontSize }]}>{formatDisplayDate(task.date)}</Text></View>
                                    <View style={[styles.colOrderNr, styles.borderR]}><Text style={[styles.tableCell, { fontSize }, styles.bold]}>{task.order_nummer}</Text></View>
                                    <View style={[styles.colOrderName, styles.borderRBlack]}>
                                        <Text style={[styles.tableCell, { fontSize }]}>{task.klant_order_beschrijving}</Text>
                                        {task.versie && (
                                            <Text style={[styles.tableCell, styles.subtext]}>{task.versie}</Text>
                                        )}
                                    </View>

                                    {/* Data */}
                                    <View style={[styles.colPages, styles.borderR]}><Text style={[styles.tableCell, { fontSize }, styles.textCenter]}>{task.blz || '-'}</Text></View>
                                    <View style={[styles.colExOmw, styles.borderR]}><Text style={[styles.tableCell, { fontSize }, styles.textCenter]}>{task.ex_omw || '-'}</Text></View>
                                    <View style={[styles.colNetRun, styles.borderRBlack]}><Text style={[styles.tableCell, { fontSize }, styles.textRight, styles.bold]}>{task.netto_oplage.toLocaleString('nl-BE')}</Text></View>

                                    {/* Wissels */}
                                    <View style={[styles.colStartup, styles.borderR]}><Text style={[styles.tableCell, { fontSize }, styles.textCenter]}>{task.opstart ? 'Ja' : 'Nee'}</Text></View>
                                    <View style={[styles.col4_4, styles.borderR]}><Text style={[styles.tableCell, { fontSize }, styles.textCenter]}>{task.k_4_4 || '-'}</Text></View>
                                    <View style={[styles.col4_0, styles.borderR]}><Text style={[styles.tableCell, { fontSize }, styles.textCenter]}>{task.k_4_0 || '-'}</Text></View>
                                    <View style={[styles.col1_0, styles.borderR]}><Text style={[styles.tableCell, { fontSize }, styles.textCenter]}>{task.k_1_0 || '-'}</Text></View>
                                    <View style={[styles.col1_1, styles.borderR]}><Text style={[styles.tableCell, { fontSize }, styles.textCenter]}>{task.k_1_1 || '-'}</Text></View>
                                    <View style={[styles.col4_1, styles.borderRBlack]}><Text style={[styles.tableCell, { fontSize }, styles.textCenter]}>{task.k_4_1 || '-'}</Text></View>

                                    {/* Berekening */}
                                    <View style={[styles.colMaxGross, styles.borderR]}><Text style={[styles.tableCell, { fontSize }, styles.textRight]}>{Math.round(task.max_bruto).toLocaleString('nl-BE')}</Text></View>
                                    <View style={[styles.colGreen, styles.borderR]}><Text style={[styles.tableCell, { fontSize }, styles.textRight]}>{Math.round(task.groen).toLocaleString('nl-BE')}</Text></View>
                                    <View style={[styles.colRed, styles.borderRBlack]}><Text style={[styles.tableCell, { fontSize }, styles.textRight]}>{Math.round(task.rood).toLocaleString('nl-BE')}</Text></View>

                                    {/* Prestatie */}
                                    <View style={[styles.colDelta, styles.borderR]}>
                                        <Text style={[
                                            styles.tableCell,
                                            { fontSize },
                                            styles.textRight,
                                            task.delta > 0 ? styles.bold : {}
                                        ]}>
                                            {Math.round(task.delta).toLocaleString('nl-BE')}
                                        </Text>
                                    </View>
                                    <View style={[styles.colDeltaPercent, styles.borderRBlack]}>
                                        <Text style={[
                                            styles.tableCell,
                                            { fontSize },
                                            styles.textRight,
                                            (() => {
                                                const dp = task.delta_percent;
                                                if (dp > 1.05) return { color: '#dc2626', fontFamily: 'Helvetica-Bold' }; // Red & Bold
                                                if (dp > 1.02) return { color: '#ea580c', fontFamily: 'Helvetica-Bold' }; // Darker Orange & Bold
                                                if (dp > 1.00) return { color: '#fb923c' }; // Orange
                                                if (dp < 0.95) return { color: '#166534' }; // Dark green
                                                if (dp < 0.98) return { color: '#15803d' }; // Green
                                                if (dp < 1.00) return { color: '#22c55e' }; // Lighter green
                                                return {};
                                            })()
                                        ]}>
                                            {(task.delta_percent * 100).toFixed(1)}%
                                        </Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>

                    <Text
                        style={[styles.pageNumber, dynamicStyles.pageNumber]}
                        render={({ pageNumber, totalPages }) => `Pagina ${pageNumber} van ${totalPages}`}
                        fixed
                    />
                </Page>
            ))}
        </Document>
    );
};
