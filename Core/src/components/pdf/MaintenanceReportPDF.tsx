import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// ─── Interfaces ─────────────────────────────────────────────────────────────
export interface MaintenanceTask {
    id: string;
    category: string;
    press?: string;
    taskName: string;
    interval: string;
    completedOn: string;
    executedBy: string;
    note: string;
    statusKey?: string;
    parentTask?: string;
    daysDiff?: number;
}

export interface ColumnDef {
    id: string;
    label: string;
    field: keyof MaintenanceTask;
}

export interface MaintenanceReportPDFProps {
    reportTitle: string;
    selectedPress: string;
    selectedPeriod: string;
    selectedStatus: string;
    generatedAt?: string;
    tasks: MaintenanceTask[];
    columns?: ColumnDef[];
    fontSize?: number;
    marginH?: number;
    marginV?: number;
    columnWidths?: Record<string, string>;
}

// ─── Default columns (fallback when prop is not provided) ───────────────────
const DEFAULT_COLUMNS: ColumnDef[] = [
    { id: 'taskName', label: 'Taak/Subtaak', field: 'taskName' },
    { id: 'interval', label: 'Interval', field: 'interval' },
    { id: 'completedOn', label: 'Voltooid Op', field: 'completedOn' },
    { id: 'executedBy', label: 'Uitgevoerd Door', field: 'executedBy' },
    { id: 'note', label: 'Opmerking', field: 'note' },
];

/** Distribute width: respect custom widths, then flexible for others */
const computeColumnWidths = (columns: ColumnDef[], customWidths?: Record<string, string>): string[] => {
    const totalWidth = 100;
    const count = columns.length;
    if (count === 0) return [];

    const widths: string[] = Array(count).fill('auto');
    let remainingWidth = totalWidth;
    let flexColumnCount = 0;

    // 1. Apply custom widths first
    columns.forEach((col, i) => {
        if (customWidths && customWidths[col.id]) {
            const val = customWidths[col.id];
            // Support both "15%" and "15"
            const numericVal = parseFloat(val);
            if (!isNaN(numericVal)) {
                widths[i] = `${numericVal}%`;
                remainingWidth -= numericVal;
            } else {
                flexColumnCount++;
            }
        } else {
            // 2. Default logic for specific columns if no custom width
            if (col.id === 'interval') {
                widths[i] = '12%';
                remainingWidth -= 12;
            } else if (col.id === 'completedOn') {
                widths[i] = '12%';
                remainingWidth -= 12;
            } else if (col.id === 'daysDiff') {
                widths[i] = '18%';
                remainingWidth -= 18;
            } else {
                flexColumnCount++;
            }
        }
    });

    // 3. Flex remaining width
    if (flexColumnCount > 0) {
        const flexWidth = Math.max(5, remainingWidth / flexColumnCount); // Ensure min-width
        columns.forEach((col, i) => {
            if (widths[i] === 'auto') {
                // Taak gets more if it's there
                if (col.id === 'taskName') {
                    const extra = Math.min(10, remainingWidth * 0.1);
                    widths[i] = `${flexWidth + extra}%`;
                } else {
                    widths[i] = `${flexWidth}%`;
                }
            }
        });
    }

    return widths;
};

// ─── Styles ─────────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
    'Te laat': { color: '#ef4444', bg: '#fef2f2' }, // Red-500 text, Red-50 bg
    'Deze Week': { color: '#f97316', bg: '#fff7ed' }, // Orange-500 text, Orange-50 bg
    'Deze Maand': { color: '#eab308', bg: '#fefce8' }, // Yellow-500 text, Yellow-50 bg
    'Gepland': { color: '#374151', bg: 'transparent' }, // Neutraal
};

const styles = StyleSheet.create({
    page: {
        padding: 0,
        fontFamily: 'Helvetica',
        color: '#1f2937',
    },
    pageContent: {
        padding: 30,
        paddingTop: 10,
    },
    // Header
    headerWrapper: {
        backgroundColor: '#4f46e5', // Indigo-600
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
    filterText: {
        fontSize: 10,
        color: 'rgba(255, 255, 255, 0.8)',
        marginTop: 4,
    },
    dateText: {
        fontSize: 8,
        color: 'rgba(255, 255, 255, 0.6)',
    },
    subHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 5,
    },
    machineName: {
        fontSize: 14,
        fontFamily: 'Helvetica-Bold',
        color: '#ffffff',
    },
    totalCount: {
        fontSize: 10,
        fontFamily: 'Helvetica-Bold',
        color: '#ffffff',
    },
    table: {
        width: '100%',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        minHeight: 28,
        alignItems: 'center',
    },
    tableHeaderRow: {
        flexDirection: 'row',
        backgroundColor: '#f9fafb',
        borderBottomWidth: 2,
        borderBottomColor: '#d1d5db',
        minHeight: 24,
        alignItems: 'center',
    },
    tableHeaderCell: {
        fontFamily: 'Helvetica-Bold',
        color: '#4b5563',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    tableCell: {
        color: '#374151',
    },
    tableCellNoWrap: {
        color: '#374151',
        whiteSpace: 'nowrap',
    },
    parentTaskText: {
        fontSize: 7,
        color: '#6b7280',
        marginBottom: 1,
    },
    childTaskWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    childArrow: {
        fontSize: 9,
        marginRight: 3,
        color: '#9ca3af',
    },
    col: {
        paddingRight: 5,
        paddingVertical: 4,
    },
    colTask: {
        paddingLeft: 8, // Room for status border
    },
    statusBorder: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 3,
    },
    categoryRow: {
        flexDirection: 'row',
        backgroundColor: '#f3f4f6',
        borderBottomWidth: 1,
        borderBottomColor: '#d1d5db',
        borderTopWidth: 1,
        borderTopColor: '#d1d5db',
        paddingVertical: 6,
        marginTop: 4,
    },
    categoryTitle: {
        fontSize: 10,
        color: '#111827',
        width: '80%',
        paddingLeft: 4,
    },
    categoryCount: {
        fontSize: 9,
        color: '#6b7280',
        width: '20%',
        textAlign: 'right',
        paddingRight: 4,
    },
    pageNumber: {
        position: 'absolute',
        fontSize: 8,
        bottom: 10,
        left: 0,
        right: 0,
        textAlign: 'center',
        color: '#9ca3af',
    },
});

const formatDaysDiff = (days: number | undefined): string => {
    if (days === undefined) return '-';
    if (days === 0) return 'Vandaag!';
    if (days > 0) return `In ${days} ${days === 1 ? 'dag' : 'dagen'}`;
    return `${Math.abs(days)}`;
};

// ─── Component ──────────────────────────────────────────────────────────────
export const MaintenanceReportPDF: React.FC<MaintenanceReportPDFProps> = ({
    reportTitle,
    selectedPress,
    selectedPeriod,
    selectedStatus,
    generatedAt = new Date().toLocaleString('nl-BE'),
    tasks,
    columns,
    fontSize = 9,
    marginH = 30,
    marginV = 10,
    columnWidths,
}) => {
    const activeColumns = (columns && columns.length > 0) ? columns : DEFAULT_COLUMNS;
    const widths = computeColumnWidths(activeColumns, columnWidths);

    // Dynamic style overrides
    const dynamicStyles = {
        text: { fontSize },
        headerText: { fontSize: fontSize + 1 },
        smallText: { fontSize: fontSize - 2 },
        headerWrapper: {
            paddingHorizontal: marginH,
            paddingTop: marginV + 15, // Increase base padding for header
            paddingBottom: 20,
        },
        pageContent: {
            paddingHorizontal: marginH,
            paddingTop: 10, // Maintain small gap between header and content
            paddingBottom: marginV + 30, // Extra space for fixed footer
        },
        pageNumber: {
            bottom: marginV,
        }
    };

    // Group tasks by press, then by category within each press
    const pressGroups: Record<string, Record<string, MaintenanceTask[]>> = {};
    tasks.forEach(task => {
        const press = task.press || 'Onbekend';
        if (!pressGroups[press]) pressGroups[press] = {};
        if (!pressGroups[press][task.category]) pressGroups[press][task.category] = [];
        pressGroups[press][task.category].push(task);
    });

    const pressEntries = Object.entries(pressGroups);
    const hasMultiplePresses = pressEntries.length > 1;

    const renderPressPage = (pressName: string, categories: Record<string, MaintenanceTask[]>, displayPressName: string) => {
        const pressTaskCount = Object.values(categories).reduce((sum, arr) => sum + arr.length, 0);

        return (
            <Page size="A4" style={styles.page} key={pressName}>
                {/* Header with press name */}
                <View style={[styles.headerWrapper, dynamicStyles.headerWrapper]} fixed>
                    <View style={styles.headerContainer}>
                        <View>
                            <Text style={styles.omniLogo}>OMNI</Text>
                            <Text style={styles.filterText}>
                                {reportTitle} | {displayPressName} | {selectedPeriod}
                            </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.dateText}>Gegenereerd op:</Text>
                            <Text style={styles.dateText}>{generatedAt}</Text>
                        </View>
                    </View>

                    <View style={styles.subHeader}>
                        <Text style={styles.machineName}>{displayPressName}</Text>
                        <Text style={styles.totalCount}>
                            Status {selectedStatus}: {pressTaskCount} taken
                        </Text>
                    </View>
                </View>

                <View style={[styles.pageContent, dynamicStyles.pageContent]}>
                    {/* Table Header */}
                    <View style={styles.tableHeaderRow} fixed>
                        {activeColumns.map((col, i) => (
                            <View key={col.id} style={[styles.col, { width: widths[i], paddingLeft: i === 0 ? 8 : 4 }]}>
                                <Text style={[
                                    styles.tableHeaderCell,
                                    dynamicStyles.smallText,
                                    (col.id === 'daysDiff' || col.id === 'interval' || col.id === 'completedOn') ? { textAlign: 'right' } : {}
                                ]}>
                                    {col.label}
                                </Text>
                            </View>
                        ))}
                    </View>

                    <View style={styles.table}>
                        {Object.entries(categories).map(([category, categoryTasks]) => (
                            <React.Fragment key={category}>
                                {categoryTasks.length > 0 && (
                                    <View wrap={false}>
                                        <View style={styles.categoryRow}>
                                            <Text style={[styles.categoryTitle, dynamicStyles.text]}>{category.toUpperCase()}</Text>
                                            <Text style={[styles.categoryCount, dynamicStyles.smallText]}>{categoryTasks.length} taken</Text>
                                        </View>
                                        {/* Render the first task inside the same wrap={false} container as the header */}
                                        {(() => {
                                            const task = categoryTasks[0];
                                            const statusColor = task.statusKey ? STATUS_COLORS[task.statusKey] : STATUS_COLORS['Gepland'];
                                            const showIndicator = task.statusKey && task.statusKey !== 'Gepland';
                                            const isChild = task.parentTask && task.taskName !== task.parentTask;

                                            return (
                                                <View style={styles.tableRow} key={task.id}>
                                                    {showIndicator && (
                                                        <View style={[styles.statusBorder, { backgroundColor: statusColor.color }]} />
                                                    )}
                                                    {activeColumns.map((col, i) => (
                                                        <View key={col.id} style={[styles.col, i === 0 ? styles.colTask : {}, { width: widths[i] }]}>
                                                            {col.id === 'taskName' ? (
                                                                <View style={{ flexDirection: 'column' }}>
                                                                    {isChild && <Text style={[styles.parentTaskText, { fontSize: fontSize - 2 }]}>{task.parentTask}</Text>}
                                                                    <View style={styles.childTaskWrapper}>
                                                                        {isChild && <Text style={[styles.childArrow, dynamicStyles.text]}>↳</Text>}
                                                                        <Text style={[styles.tableCell, dynamicStyles.text, showIndicator ? { color: statusColor.color } : {}]}>
                                                                            {task.taskName}
                                                                        </Text>
                                                                    </View>
                                                                </View>
                                                            ) : (col.id === 'interval' || col.id === 'completedOn' || col.id === 'daysDiff') ? (
                                                                <Text style={[
                                                                    styles.tableCellNoWrap,
                                                                    dynamicStyles.text,
                                                                    showIndicator ? { color: statusColor.color } : {},
                                                                    (col.id === 'daysDiff' || col.id === 'interval' || col.id === 'completedOn') ? { textAlign: 'right' } : {},
                                                                    (col.id === 'daysDiff' && task.daysDiff !== undefined && task.daysDiff < 0) ? { fontFamily: 'Helvetica-Bold' } : {}
                                                                ]}>
                                                                    {col.id === 'daysDiff' ? formatDaysDiff(task.daysDiff) : (task[col.field] ?? '')}
                                                                </Text>
                                                            ) : (
                                                                <Text style={[styles.tableCell, dynamicStyles.text]}>
                                                                    {task[col.field] ?? ''}
                                                                </Text>
                                                            )}
                                                        </View>
                                                    ))}
                                                </View>
                                            );
                                        })()}
                                    </View>
                                )}

                                {categoryTasks.slice(1).map((task) => {
                                    const statusColor = task.statusKey ? STATUS_COLORS[task.statusKey] : STATUS_COLORS['Gepland'];
                                    const showIndicator = task.statusKey && task.statusKey !== 'Gepland';
                                    const isChild = task.parentTask && task.taskName !== task.parentTask;

                                    return (
                                        <View
                                            style={styles.tableRow}
                                            key={task.id}
                                            wrap={false}
                                        >
                                            {showIndicator && (
                                                <View style={[styles.statusBorder, { backgroundColor: statusColor.color }]} />
                                            )}

                                            {activeColumns.map((col, i) => (
                                                <View key={col.id} style={[styles.col, i === 0 ? styles.colTask : {}, { width: widths[i] }]}>
                                                    {col.id === 'taskName' ? (
                                                        <View style={{ flexDirection: 'column' }}>
                                                            {isChild && <Text style={[styles.parentTaskText, { fontSize: fontSize - 2 }]}>{task.parentTask}</Text>}
                                                            <View style={styles.childTaskWrapper}>
                                                                {isChild && <Text style={[styles.childArrow, dynamicStyles.text]}>↳</Text>}
                                                                <Text style={[
                                                                    styles.tableCell,
                                                                    dynamicStyles.text,
                                                                    showIndicator ? { color: statusColor.color } : {}
                                                                ]}>
                                                                    {task.taskName}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                    ) : (col.id === 'interval' || col.id === 'completedOn' || col.id === 'daysDiff') ? (
                                                        <Text style={[
                                                            styles.tableCellNoWrap,
                                                            dynamicStyles.text,
                                                            showIndicator ? { color: statusColor.color } : {},
                                                            (col.id === 'daysDiff' || col.id === 'interval' || col.id === 'completedOn') ? { textAlign: 'right' } : {},
                                                            (col.id === 'daysDiff' && task.daysDiff !== undefined && task.daysDiff < 0) ? { fontFamily: 'Helvetica-Bold' } : {}
                                                        ]}>
                                                            {col.id === 'daysDiff' ? formatDaysDiff(task.daysDiff) : (task[col.field] ?? '')}
                                                        </Text>
                                                    ) : (
                                                        <Text style={[styles.tableCell, dynamicStyles.text]}>
                                                            {task[col.field] ?? ''}
                                                        </Text>
                                                    )}
                                                </View>
                                            ))}
                                        </View>
                                    );
                                })}
                            </React.Fragment>
                        ))}
                    </View>
                </View>

                {/* Footer */}
                <Text
                    style={[styles.pageNumber, dynamicStyles.smallText, dynamicStyles.pageNumber]}
                    render={({ pageNumber, totalPages }) => `Pagina ${pageNumber} van ${totalPages}`}
                    fixed
                />
            </Page>
        );
    };

    return (
        <Document>
            {hasMultiplePresses
                ? pressEntries.map(([pressName, categories]) =>
                    renderPressPage(pressName, categories, pressName)
                )
                : renderPressPage(
                    pressEntries[0]?.[0] || selectedPress,
                    pressEntries[0]?.[1] || {},
                    selectedPress
                )
            }
        </Document>
    );
};