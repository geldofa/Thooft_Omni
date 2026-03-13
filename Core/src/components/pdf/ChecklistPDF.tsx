import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// ─── Interfaces ─────────────────────────────────────────────────────────────

export interface ChecklistTask {
    id: string;
    task: string;
    subtaskName?: string;
    taskSubtext?: string;
    subtaskSubtext?: string;
    category: string;
    nextMaintenance: Date | null;
    lastMaintenance: Date | null;
    opmerkingen?: string;
    isOverdue?: boolean;
}

export interface ChecklistPDFProps {
    pressName: string;
    tasks: ChecklistTask[];
    supervisorGuidance?: string;
    categorySubtexts?: Record<string, string | null>;
    fontSize?: number;
    marginH?: number;
    marginV?: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const formatDate = (date: Date | null): string => {
    if (!date) return 'N.v.t.';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${day}/${month}/${year}`;
};

// ─── Column widths ──────────────────────────────────────────────────────────

const COL = {
    check: '6%',
    task: '34%',
    planned: '12%',
    last: '12%',
    remarks: '16%',
    notes: '20%',
};

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    page: {
        padding: 0,
        fontFamily: 'Helvetica',
        color: '#1f2937',
    },
    // Header (indigo banner)
    headerWrapper: {
        backgroundColor: '#4f46e5',
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
    // Page content
    pageContent: {
        padding: 10,
        paddingTop: 10,
    },
    // Supervisor guidance block
    guidanceBox: {
        marginBottom: 12,
        padding: 8,
        borderWidth: 1,
        borderColor: '#93c5fd',
        backgroundColor: '#eff6ff',
        borderRadius: 3,
    },
    guidanceLabel: {
        fontSize: 8,
        fontFamily: 'Helvetica-Bold',
        color: '#1e40af',
        marginBottom: 3,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    guidanceText: {
        fontSize: 9,
        color: '#1e3a8a',
        lineHeight: 1.4,
    },
    // Category header
    categoryRow: {
        flexDirection: 'row',
        backgroundColor: '#f3f4f6',
        borderBottomWidth: 1,
        borderBottomColor: '#d1d5db',
        borderTopWidth: 1,
        borderTopColor: '#d1d5db',
        paddingVertical: 5,
        marginTop: 6,
    },
    categoryTitle: {
        fontSize: 10,
        fontFamily: 'Helvetica-Bold',
        color: '#111827',
        width: '70%',
        paddingLeft: 4,
    },
    categorySubtext: {
        fontSize: 8,
        color: '#6b7280',
        fontStyle: 'italic',
        width: '30%',
        textAlign: 'right',
        paddingRight: 4,
    },
    // Table
    table: {
        width: '100%',
    },
    tableHeaderRow: {
        flexDirection: 'row',
        backgroundColor: '#f9fafb',
        borderBottomWidth: 2,
        borderBottomColor: '#d1d5db',
        minHeight: 22,
        alignItems: 'center',
    },
    tableHeaderCell: {
        fontFamily: 'Helvetica-Bold',
        color: '#4b5563',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        minHeight: 26,
        alignItems: 'center',
    },
    tableCell: {
        color: '#374151',
    },
    col: {
        paddingRight: 4,
        paddingVertical: 4,
        paddingLeft: 4,
    },
    // Checkbox
    checkboxOuter: {
        width: 10,
        height: 10,
        borderWidth: 1.5,
        borderColor: '#374151',
        borderRadius: 1,
    },
    // Task text
    taskMain: {
        fontFamily: 'Helvetica-Bold',
    },
    taskSubtext: {
        color: '#6b7280',
        marginTop: 1,
    },
    // Notes column – line for writing
    notesLine: {
        borderBottomWidth: 1,
        borderBottomColor: '#d1d5db',
        height: 14,
        width: '100%',
    },
    // Overdue indicator
    overdueBadge: {
        fontSize: 6,
        fontFamily: 'Helvetica-Bold',
        color: '#ef4444',
        backgroundColor: '#fef2f2',
        paddingHorizontal: 3,
        paddingVertical: 1,
        borderRadius: 2,
        marginBottom: 1,
    },
    // Signature section
    signatureSection: {
        marginTop: 30,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#d1d5db',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    signatureBlock: {
        width: '45%',
    },
    signatureLabel: {
        fontSize: 9,
        fontFamily: 'Helvetica-Bold',
        color: '#374151',
        marginBottom: 6,
    },
    signatureLine: {
        borderBottomWidth: 2,
        borderBottomColor: '#9ca3af',
        height: 20,
    },
    // Page number
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

// ─── Component ──────────────────────────────────────────────────────────────

export const ChecklistPDF: React.FC<ChecklistPDFProps> = ({
    pressName,
    tasks,
    supervisorGuidance,
    categorySubtexts = {},
    fontSize = 9,
    marginH = 10,
    marginV = 10,
}) => {
    const dynamicStyles = {
        text: { fontSize },
        smallText: { fontSize: fontSize - 2 },
        headerWrapper: {
            paddingHorizontal: marginH,
            paddingTop: marginV + 15,
            paddingBottom: 20,
        },
        pageContent: {
            paddingHorizontal: marginH,
            paddingTop: 10,
            paddingBottom: marginV + 40,
        },
        pageNumber: {
            bottom: marginV,
        },
    };

    // Group tasks by category
    const grouped: Record<string, ChecklistTask[]> = {};
    tasks.forEach(task => {
        if (!grouped[task.category]) grouped[task.category] = [];
        grouped[task.category].push(task);
    });
    const categories = Object.keys(grouped).sort();
    const totalCount = tasks.length;
    const generatedAt = new Date().toLocaleDateString('nl-NL');

    const getDisplayName = (task: ChecklistTask): string => {
        if (task.subtaskName && task.subtaskName !== task.task) {
            return `${task.task} → ${task.subtaskName}`;
        }
        return task.task;
    };

    const getSubtext = (task: ChecklistTask): string | null => {
        if (task.subtaskName && task.subtaskName !== task.task) {
            return task.subtaskSubtext || task.taskSubtext || null;
        }
        return task.taskSubtext || null;
    };

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* ── Fixed Header ── */}
                <View style={[styles.headerWrapper, dynamicStyles.headerWrapper]} fixed>
                    <View style={styles.headerContainer}>
                        <View>
                            <Text style={styles.omniLogo}>OMNI</Text>
                            <Text style={styles.filterText}>Checklist | {pressName}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.dateText}>Gegenereerd op:</Text>
                            <Text style={styles.dateText}>{generatedAt}</Text>
                        </View>
                    </View>
                    <View style={styles.subHeader}>
                        <Text style={styles.machineName}>{pressName}</Text>
                        <Text style={styles.totalCount}>{totalCount} taken</Text>
                    </View>
                </View>

                {/* ── Content ── */}
                <View style={[styles.pageContent, dynamicStyles.pageContent]}>

                    {/* Supervisor guidance */}
                    {supervisorGuidance ? (
                        <View style={styles.guidanceBox} wrap={false}>
                            <Text style={styles.guidanceLabel}>Begeleiding / Opmerkingen</Text>
                            <Text style={styles.guidanceText}>{supervisorGuidance}</Text>
                        </View>
                    ) : null}

                    {/* Table header (fixed) */}
                    <View style={styles.tableHeaderRow} fixed>
                        <View style={[styles.col, { width: COL.check }]}>
                            <Text style={[styles.tableHeaderCell, dynamicStyles.smallText]}>☐</Text>
                        </View>
                        <View style={[styles.col, { width: COL.task }]}>
                            <Text style={[styles.tableHeaderCell, dynamicStyles.smallText]}>Taak</Text>
                        </View>
                        <View style={[styles.col, { width: COL.planned }]}>
                            <Text style={[styles.tableHeaderCell, dynamicStyles.smallText, { textAlign: 'center' }]}>Gepland</Text>
                        </View>
                        <View style={[styles.col, { width: COL.last }]}>
                            <Text style={[styles.tableHeaderCell, dynamicStyles.smallText, { textAlign: 'center' }]}>Laatst</Text>
                        </View>
                        <View style={[styles.col, { width: COL.remarks }]}>
                            <Text style={[styles.tableHeaderCell, dynamicStyles.smallText]}>Opmerkingen</Text>
                        </View>
                        <View style={[styles.col, { width: COL.notes }]}>
                            <Text style={[styles.tableHeaderCell, dynamicStyles.smallText]}>Notities</Text>
                        </View>
                    </View>

                    {/* Categories + tasks */}
                    <View style={styles.table}>
                        {categories.map(category => {
                            const categoryTasks = grouped[category];
                            const subtext = categorySubtexts[category] || null;

                            return (
                                <React.Fragment key={category}>
                                    {/* Category header + first task in one wrap={false} */}
                                    {categoryTasks.length > 0 && (
                                        <View wrap={false}>
                                            <View style={styles.categoryRow}>
                                                <Text style={[styles.categoryTitle, dynamicStyles.text]}>
                                                    {category.toUpperCase()}
                                                </Text>
                                                {subtext && (
                                                    <Text style={[styles.categorySubtext, dynamicStyles.smallText]}>
                                                        {subtext}
                                                    </Text>
                                                )}
                                            </View>

                                            {/* First task */}
                                            {(() => {
                                                const task = categoryTasks[0];
                                                const displayName = getDisplayName(task);
                                                const subtextStr = getSubtext(task);
                                                return (
                                                    <View style={styles.tableRow} key={task.id}>
                                                        <View style={[styles.col, { width: COL.check, alignItems: 'center' }]}>
                                                            <View style={styles.checkboxOuter} />
                                                        </View>
                                                        <View style={[styles.col, { width: COL.task }]}>
                                                            <Text style={[styles.tableCell, styles.taskMain, dynamicStyles.text]}>
                                                                {displayName}
                                                            </Text>
                                                            {subtextStr && (
                                                                <Text style={[styles.taskSubtext, dynamicStyles.smallText]}>
                                                                    {subtextStr}
                                                                </Text>
                                                            )}
                                                        </View>
                                                        <View style={[styles.col, { width: COL.planned, alignItems: 'center' }]}>
                                                            {task.isOverdue && <Text style={styles.overdueBadge}>TE LAAT</Text>}
                                                            <Text style={[styles.tableCell, dynamicStyles.smallText, { textAlign: 'center' }]}>
                                                                {formatDate(task.nextMaintenance)}
                                                            </Text>
                                                        </View>
                                                        <View style={[styles.col, { width: COL.last, alignItems: 'center' }]}>
                                                            <Text style={[styles.tableCell, dynamicStyles.smallText, { textAlign: 'center' }]}>
                                                                {formatDate(task.lastMaintenance)}
                                                            </Text>
                                                        </View>
                                                        <View style={[styles.col, { width: COL.remarks }]}>
                                                            <Text style={[styles.tableCell, dynamicStyles.smallText, { fontStyle: 'italic' }]}>
                                                                {task.opmerkingen || '-'}
                                                            </Text>
                                                        </View>
                                                        <View style={[styles.col, { width: COL.notes }]}>
                                                            <View style={styles.notesLine} />
                                                        </View>
                                                    </View>
                                                );
                                            })()}
                                        </View>
                                    )}

                                    {/* Remaining tasks */}
                                    {categoryTasks.slice(1).map(task => {
                                        const displayName = getDisplayName(task);
                                        const subtextStr = getSubtext(task);
                                        return (
                                            <View style={styles.tableRow} key={task.id} wrap={false}>
                                                <View style={[styles.col, { width: COL.check, alignItems: 'center' }]}>
                                                    <View style={styles.checkboxOuter} />
                                                </View>
                                                <View style={[styles.col, { width: COL.task }]}>
                                                    <Text style={[styles.tableCell, styles.taskMain, dynamicStyles.text]}>
                                                        {displayName}
                                                    </Text>
                                                    {subtextStr && (
                                                        <Text style={[styles.taskSubtext, dynamicStyles.smallText]}>
                                                            {subtextStr}
                                                        </Text>
                                                    )}
                                                </View>
                                                <View style={[styles.col, { width: COL.planned, alignItems: 'center' }]}>
                                                    {task.isOverdue && <Text style={styles.overdueBadge}>TE LAAT</Text>}
                                                    <Text style={[styles.tableCell, dynamicStyles.smallText, { textAlign: 'center' }]}>
                                                        {formatDate(task.nextMaintenance)}
                                                    </Text>
                                                </View>
                                                <View style={[styles.col, { width: COL.last, alignItems: 'center' }]}>
                                                    <Text style={[styles.tableCell, dynamicStyles.smallText, { textAlign: 'center' }]}>
                                                        {formatDate(task.lastMaintenance)}
                                                    </Text>
                                                </View>
                                                <View style={[styles.col, { width: COL.remarks }]}>
                                                    <Text style={[styles.tableCell, dynamicStyles.smallText, { fontStyle: 'italic' }]}>
                                                        {task.opmerkingen || '-'}
                                                    </Text>
                                                </View>
                                                <View style={[styles.col, { width: COL.notes }]}>
                                                    <View style={styles.notesLine} />
                                                </View>
                                            </View>
                                        );
                                    })}
                                </React.Fragment>
                            );
                        })}
                    </View>

                    {/* Signature section */}
                    <View style={styles.signatureSection} wrap={false}>
                        <View style={styles.signatureBlock}>
                            <Text style={styles.signatureLabel}>Handtekening Operator:</Text>
                            <View style={styles.signatureLine} />
                        </View>
                        <View style={styles.signatureBlock}>
                            <Text style={styles.signatureLabel}>Handtekening Supervisor:</Text>
                            <View style={styles.signatureLine} />
                        </View>
                    </View>
                </View>

                {/* Footer */}
                <Text
                    style={[styles.pageNumber, dynamicStyles.smallText, dynamicStyles.pageNumber]}
                    render={({ pageNumber, totalPages }) => `Pagina ${pageNumber} van ${totalPages}`}
                    fixed
                />
            </Page>
        </Document>
    );
};
