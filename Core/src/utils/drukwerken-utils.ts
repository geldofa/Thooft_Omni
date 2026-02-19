
export interface Katern {
    id: string;
    originalId?: string; // PocketBase ID for resumed jobs
    version: string;
    pages: number | null;
    exOmw: string;
    netRun: number;
    startup: boolean;
    c4_4: number;
    c4_0: number;
    c1_0: number;
    c1_1: number;
    c4_1: number;
    maxGross: number;
    green: number | null;
    red: number | null;
    delta: number;
    deltaPercentage: number;
}

export interface FinishedPrintJob {
    id: string;
    date: string; // YYYY/MM/DD
    datum: string;
    orderNr: string;
    orderName: string;
    version: string;
    pages: number | null;
    exOmw: string;
    netRun: number | null;
    startup: boolean;
    c4_4: number | null;
    c4_0: number | null;
    c1_0: number | null;
    c1_1: number | null;
    c4_1: number | null;
    maxGross: number;
    green: number | null;
    red: number | null;
    delta_number: number;
    delta_percentage: number;
    opmerkingen?: string;
    delta: number;
    performance: string;
    pressId?: string;
    pressName?: string;
    created?: string;
}

export interface CalculatedField {
    id: string;
    name: string;
    formula: string;
    description?: string;
    targetColumn?: 'maxGross' | 'green' | 'red' | 'delta_number' | 'delta_percentage';
}

export const finishedFields = [
    { key: 'pages', label: "Pagina's" },
    { key: 'exOmw', label: 'Ex/Omw' },
    { key: 'netRun', label: 'Oplage netto' },
    { key: 'startup', label: 'Opstart' },
    { key: 'c4_4', label: '4/4' },
    { key: 'c4_0', label: '4/0' },
    { key: 'c1_0', label: '1/0' },
    { key: 'c1_1', label: '1/1' },
    { key: 'c4_1', label: '4/1' },
    { key: 'maxGross', label: 'Max Bruto' },
    { key: 'green', label: 'Groen' },
    { key: 'red', label: 'Rood' },
    { key: 'delta_number', label: 'Delta' }
];

export const parameterFields = [
    { key: 'Marge', label: 'Marge' },
    { key: 'Opstart', label: 'Opstart' },
    { key: 'param_4_4', label: '4/4' },
    { key: 'param_4_0', label: '4/0' },
    { key: 'param_1_0', label: '1/0' },
    { key: 'param_1_1', label: '1/1' },
    { key: 'param_4_1', label: '4/1' }
];

export const operators = ['+', '-', '*', '/', '(', ')'];

export const fieldColors: Record<string, { bg: string; text: string }> = {
    // Job fields
    pages: { bg: '#dbeafe', text: '#1e40af' },      // blue
    exOmw: { bg: '#cffafe', text: '#0e7490' },      // cyan
    netRun: { bg: '#ccfbf1', text: '#0f766e' },     // teal
    startup: { bg: '#d1fae5', text: '#047857' },    // emerald
    c4_4: { bg: '#e0e7ff', text: '#4338ca' },       // indigo
    c4_0: { bg: '#ede9fe', text: '#6d28d9' },       // violet
    c1_0: { bg: '#f3e8ff', text: '#7c3aed' },       // purple
    c1_1: { bg: '#fae8ff', text: '#a21caf' },       // fuchsia
    c4_1: { bg: '#fce7f3', text: '#be185d' },       // pink
    // Parameter fields
    Marge: { bg: '#dcfce7', text: '#15803d' },      // green
    Opstart: { bg: '#ecfccb', text: '#4d7c0f' },    // lime
    param_4_4: { bg: '#fef9c3', text: '#a16207' },  // yellow
    param_4_0: { bg: '#fef3c7', text: '#b45309' },  // amber
    param_1_0: { bg: '#ffedd5', text: '#c2410c' },  // orange
    param_1_1: { bg: '#fee2e2', text: '#b91c1c' },  // red
    param_4_1: { bg: '#ffe4e6', text: '#be123c' },  // rose
};

// Helper function to escape regex special characters
export const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export interface FormulaSubstitution {
    key: string;
    label: string;
    value: string | number;
    color: { bg: string; text: string };
}

export const getFormulaSubstitutions = (
    formula: string,
    job: any,
    parameters: Record<string, Record<string, any>>,
    activePresses: string[]
): FormulaSubstitution[] => {
    if (!formula) return [];

    const jobPressName = job?.pressName || (activePresses.length > 0 ? activePresses[0] : '');
    const pressParams = (jobPressName && parameters[jobPressName])
        ? parameters[jobPressName]
        : (activePresses.length > 0 ? (parameters[activePresses[0]] || {}) : {});

    const safeParams = pressParams || {};
    const substitutions: FormulaSubstitution[] = [];

    // Collect job field substitutions
    finishedFields.forEach(field => {
        if (formula.includes(field.key)) {
            let value = job?.[field.key] ?? 0;
            if (field.key === 'startup') value = job?.startup ? (safeParams['opstart'] ?? 0) : 0;
            if (field.key === 'delta_number') value = job?.delta_number || job?.delta || 0;

            substitutions.push({
                key: field.key,
                label: field.label,
                value: value,
                color: fieldColors[field.key] || { bg: '#f3f4f6', text: '#374151' }
            });
        }
    });

    // Collect parameter field substitutions
    parameterFields.forEach(field => {
        if (formula.includes(field.key)) {
            let paramKey = field.key;
            if (field.key === 'Marge') paramKey = 'marge';
            if (field.key === 'Opstart') paramKey = 'opstart';

            let value = safeParams[paramKey] ?? 0;
            if (paramKey === 'marge') {
                const sMarge = String(safeParams['margePercentage'] || '0');
                const cleanMarge = sMarge.includes(',') ? sMarge.replace(/\./g, '').replace(',', '.') : sMarge;
                value = (parseFloat(cleanMarge) || 0) / 100;
            }

            substitutions.push({
                key: field.key,
                label: field.label + ' (param)',
                value: value,
                color: fieldColors[field.key] || { bg: '#f3f4f6', text: '#374151' }
            });
        }
    });

    return substitutions;
};

export const getFormulaExplanation = (
    formula: string,
    job: any,
    parameters: Record<string, Record<string, any>>,
    activePresses: string[]
): string => {
    if (!formula) return '';
    let explanation = formula;
    const substitutions = getFormulaSubstitutions(formula, job, parameters, activePresses);

    substitutions.forEach(sub => {
        const regex = new RegExp('\\b' + escapeRegex(sub.key) + '\\b', 'g');
        const displayValue = typeof sub.value === 'number' ? sub.value : sub.value;
        explanation = explanation.replace(regex, `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold mx-0.5" style="background-color: ${sub.color.bg}; color: ${sub.color.text}">${displayValue}</span>`);
    });

    return explanation;
};

export const evaluateFormula = (
    formula: string,
    job: FinishedPrintJob | Omit<FinishedPrintJob, 'id'> | Katern,
    parameters: Record<string, Record<string, any>>,
    activePresses: string[]
): number | string => {
    let evalFormula = formula;
    try {
        if (!formula || !formula.trim()) {
            return '';
        }

        const IF = (condition: boolean, trueVal: any, falseVal: any) => condition ? trueVal : falseVal;

        const jobPressName = (job as any).pressName;
        const pressParams = (jobPressName && parameters[jobPressName])
            ? parameters[jobPressName]
            : (activePresses.length > 0 ? (parameters[activePresses[0]] || {}) : {});

        const safeParams = pressParams || {};

        if (Object.keys(safeParams).length === 0) {
            console.warn(`[evaluateFormula] No parameters found for press: ${jobPressName || 'default'}. activePresses: ${activePresses.join(', ')}`);
        }

        finishedFields.forEach(field => {
            const regex = new RegExp('\\b' + escapeRegex(field.key) + '\\b', 'g');
            let value: any = (job as any)[field.key];
            if (field.key === 'startup') {
                value = value ? (safeParams['opstart'] || 0) : 0;
            }

            if (field.key === 'delta_number') {
                value = (job as any).delta_number || (job as any).delta || 0;
            }

            const sValue = String(value ?? '0').trim();
            let sanitizedValue = sValue;

            if (!sValue || sValue === 'null' || sValue === 'undefined') {
                sanitizedValue = '0';
            } else {
                const commaCount = (sValue.match(/,/g) || []).length;
                if (commaCount > 0) {
                    if (commaCount === 1) {
                        sanitizedValue = sValue.replace(/\./g, '').replace(',', '.');
                    } else {
                        sanitizedValue = sValue.replace(/,/g, '');
                    }
                } else if (sValue.includes('.')) {
                    const dotCount = (sValue.match(/\./g) || []).length;
                    if (dotCount > 1) {
                        sanitizedValue = sValue.replace(/\./g, '');
                    }
                }
            }

            if (isNaN(parseFloat(sanitizedValue))) {
                sanitizedValue = '0';
            }

            evalFormula = evalFormula.replace(regex, sanitizedValue);
        });

        parameterFields.forEach(field => {
            const regex = new RegExp('\\b' + escapeRegex(field.key) + '\\b', 'g');
            let paramKey = field.key;
            if (field.key === 'Marge') paramKey = 'marge';
            if (field.key === 'Opstart') paramKey = 'opstart';

            let value = safeParams[paramKey] || 0;

            if (paramKey === 'marge') {
                const sMarge = String(safeParams['margePercentage'] || '0');
                const cleanMarge = sMarge.includes(',') ? sMarge.replace(/\./g, '').replace(',', '.') : sMarge;
                value = (parseFloat(cleanMarge) || 0) / 100;
            }

            const sValue = String(value ?? '0').trim();
            let sanitizedValue = sValue;

            if (!sValue || sValue === 'null' || sValue === 'undefined') {
                sanitizedValue = '0';
            } else {
                const commaCount = (sValue.match(/,/g) || []).length;
                if (commaCount > 0) {
                    if (commaCount === 1) {
                        sanitizedValue = sValue.replace(/\./g, '').replace(',', '.');
                    } else {
                        sanitizedValue = sValue.replace(/,/g, '');
                    }
                } else if (sValue.includes('.')) {
                    const dotCount = (sValue.match(/\./g) || []).length;
                    if (dotCount > 1) {
                        sanitizedValue = sValue.replace(/\./g, '');
                    }
                }
            }

            if (isNaN(parseFloat(sanitizedValue))) {
                sanitizedValue = '0';
            }

            evalFormula = evalFormula.replace(regex, sanitizedValue);
        });

        const result = Function('IF', '"use strict"; return (' + evalFormula + ')')(IF);

        if (typeof result === 'number') {
            if (isNaN(result) || !isFinite(result)) {
                console.error(`[evaluateFormula] Invalid result (NaN/Infinity): ${result} from formula: ${evalFormula}`);
                return 0;
            }
            return result;
        }
        return String(result);
    } catch (e) {
        console.error(`[evaluateFormula] Error evaluating "${formula}" (Processed: "${evalFormula}"):`, e);
        return 0;
    }
};
