
import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { FormattedNumberInput } from './ui/FormattedNumberInput';
import { Checkbox } from './ui/checkbox';
import { toast } from 'sonner';
import { FinishedPrintJob } from '../utils/drukwerken-utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Trash2, Plus } from 'lucide-react';
import { ConfirmationModal } from './ui/ConfirmationModal';

interface AddFinishedJobDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (jobs: FinishedPrintJob[], deletedIds: string[]) => void;
    initialJobs: FinishedPrintJob[];
    onCalculate: (job: FinishedPrintJob) => FinishedPrintJob;
    outputConversions?: Record<string, Record<string, number>>;
    pressMap?: Record<string, string>;
    currentPressName?: string;
}

export function AddFinishedJobDialog({
    open,
    onOpenChange,
    onSubmit,
    initialJobs,
    onCalculate,
    outputConversions = {},
    pressMap = {},
    currentPressName = ''
}: AddFinishedJobDialogProps) {

    const [jobs, setJobs] = useState<FinishedPrintJob[]>([]);
    const [deletedIds, setDeletedIds] = useState<string[]>([]);
    const [orderNr, setOrderNr] = useState('');
    const [orderName, setOrderName] = useState('');
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [jobToDelete, setJobToDelete] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            // Sort by creation time or ID to keep stable order if needed, 
            // but usually incoming order is fine.
            setJobs(JSON.parse(JSON.stringify(initialJobs))); // Deep copy
            setDeletedIds([]);

            if (initialJobs.length > 0) {
                setOrderNr(initialJobs[0].orderNr);
                setOrderName(initialJobs[0].orderName);
            } else {
                setOrderNr('');
                setOrderName('');
            }
        }
    }, [initialJobs, open]);

    // Update common fields across all jobs
    useEffect(() => {
        setJobs(prev => prev.map(job => ({ ...job, orderNr, orderName })));
    }, [orderNr, orderName]);


    const handleJobChange = (id: string, field: keyof FinishedPrintJob, value: any) => {
        setJobs(prev => prev.map(job => {
            if (job.id === id) {
                // Handle different input types
                // For FormattedNumberInput, value is already a number or null
                // For checked inputs, value is boolean
                // For text inputs, value is string

                let updatedJob = { ...job, [field]: value };

                // Recalculate formulas immediately
                if (['maxGross', 'green', 'red', 'netRun', 'c4_4', 'c4_0', 'c1_0', 'c1_1', 'c4_1', 'startup'].includes(field)) {
                    updatedJob = onCalculate(updatedJob);
                }

                return updatedJob;
            }
            return job;
        }));
    };

    const handleAddVersion = () => {
        const baseJob = jobs.length > 0 ? jobs[0] : null;
        const newJob: FinishedPrintJob = {
            id: `temp-${Date.now()}`,
            date: baseJob?.date || new Date().toISOString().split('T')[0],
            datum: baseJob?.datum || '',
            orderNr: orderNr,
            orderName: orderName,
            version: '',
            opmerkingen: '',
            pages: null,
            exOmw: '',
            netRun: null,
            startup: false,
            c4_4: null,
            c4_0: null,
            c1_0: null,
            c1_1: null,
            c4_1: null,
            maxGross: 0,
            green: null,
            red: null,
            delta: 0,
            delta_number: 0,
            delta_percentage: 0,
            performance: '100%',
            pressId: baseJob?.pressId || '',
            pressName: baseJob?.pressName || ''
        };

        // Calculate initial formulas for the new empty job
        const calculcatedNewJob = onCalculate(newJob);

        setJobs(prev => [...prev, calculcatedNewJob]);
    };

    const handleDeleteVersion = (jobId: string) => {
        if (jobs.length <= 1) {
            toast.error("Je kunt niet de laatste versie verwijderen.");
            return;
        }

        setJobToDelete(jobId);
        setDeleteModalOpen(true);
    };

    const confirmDelete = () => {
        if (!jobToDelete) return;

        setJobs(prev => prev.filter(j => j.id !== jobToDelete));
        if (!jobToDelete.startsWith('temp-')) {
            setDeletedIds(prev => [...prev, jobToDelete]);
        }
        setJobToDelete(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(jobs, deletedIds);
        onOpenChange(false);
    };

    // Column widths matching Drukwerken.tsx
    const COL_WIDTHS = {
        version: '400px',
        pages: '55px',
        exOmw: '55px',
        netRun: '100px',
        startup: '55px',
        c4_4: '55px',
        c4_0: '55px',
        c1_0: '55px',
        c1_1: '55px',
        c4_1: '55px',
        maxGross: '90px',
        green: '90px',
        red: '90px',
        delta: '90px',
        deltaPercent: '55px',
        actions: '40px'
    };


    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[95vw] w-full max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Afgewerkt Drukwerk Bewerken (Bulk)</DialogTitle>
                    <DialogDescription>Bewerk alle versies van deze order in één keer.</DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                    {/* Header: Order Details */}
                    <div className="flex gap-4 items-end border p-4 rounded-lg bg-gray-50">
                        <div className="flex flex-col items-center">
                            <Label>Order Nr</Label>
                            <div className="flex items-center border border-gray-200 rounded-md px-2 bg-white h-9" style={{ width: '120px' }}>
                                <span className="text-sm font-medium text-muted-foreground mr-1">DT</span>
                                <Input
                                    value={orderNr}
                                    onChange={(e) => setOrderNr(e.target.value)}
                                    className="text-right p-0 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-full w-full bg-transparent"
                                />
                            </div>
                        </div>
                        <div className="flex-1">
                            <Label>Order</Label>
                            <Input
                                value={orderName}
                                onChange={(e) => setOrderName(e.target.value)}
                                className="bg-white border-gray-200"
                            />
                        </div>
                    </div>

                    {/* Table */}
                    <div className="border rounded-lg overflow-hidden">
                        <Table className="w-full text-sm">
                            <TableHeader>
                                <TableRow>
                                    <TableHead style={{ width: COL_WIDTHS.version }}>Version</TableHead>
                                    <TableHead style={{ width: COL_WIDTHS.pages }}>Blz</TableHead>
                                    <TableHead style={{ width: COL_WIDTHS.exOmw }}>Ex/Omw</TableHead>
                                    <TableHead style={{ width: COL_WIDTHS.netRun }}>Net Run</TableHead>
                                    <TableHead className="text-center" style={{ width: COL_WIDTHS.startup }}>Startup</TableHead>
                                    <TableHead className="text-center" style={{ width: COL_WIDTHS.c4_4 }}>4/4</TableHead>
                                    <TableHead className="text-center" style={{ width: COL_WIDTHS.c4_0 }}>4/0</TableHead>
                                    <TableHead className="text-center" style={{ width: COL_WIDTHS.c1_0 }}>1/0</TableHead>
                                    <TableHead className="text-center" style={{ width: COL_WIDTHS.c1_1 }}>1/1</TableHead>
                                    <TableHead className="text-center" style={{ width: COL_WIDTHS.c4_1 }}>4/1</TableHead>
                                    <TableHead className="text-center" style={{ width: COL_WIDTHS.maxGross }}>Max Gross</TableHead>
                                    <TableHead className="text-center" style={{ width: COL_WIDTHS.green }}>Green</TableHead>
                                    <TableHead className="text-center" style={{ width: COL_WIDTHS.red }}>Red</TableHead>
                                    <TableHead className="text-center" style={{ width: COL_WIDTHS.delta }}>Delta</TableHead>
                                    <TableHead className="text-center" style={{ width: COL_WIDTHS.deltaPercent }}>Delta %</TableHead>
                                    <TableHead style={{ width: COL_WIDTHS.actions }}></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {jobs.map((job) => (
                                    <TableRow key={job.id}>
                                        <TableCell>
                                            <Input value={job.version} onChange={(e) => handleJobChange(job.id, 'version', e.target.value)} className="h-9 px-2 bg-white border-gray-200" />
                                        </TableCell>
                                        <TableCell>
                                            <FormattedNumberInput value={job.pages} onChange={(val) => handleJobChange(job.id, 'pages', val)} className="h-9 px-2 bg-white border-gray-200" />
                                        </TableCell>
                                        <TableCell>
                                            <Select
                                                value={String(job.exOmw || '1')}
                                                onValueChange={(val) => handleJobChange(job.id, 'exOmw', val)}
                                            >
                                                <SelectTrigger className="h-9 px-2 bg-white border-gray-200 text-center">
                                                    <SelectValue placeholder="1" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {(() => {
                                                        const pressId = pressMap[job.pressName || ''] || '';
                                                        const pressExOmwKeys = Object.keys(outputConversions[pressId] || {}).sort((a, b) => Number(a) - Number(b));
                                                        const options = pressExOmwKeys.length > 0 ? pressExOmwKeys : ['1', '2', '4'];
                                                        return options.map(val => (
                                                            <SelectItem key={val} value={val}>{val}</SelectItem>
                                                        ));
                                                    })()}
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell>
                                            <FormattedNumberInput value={job.netRun} onChange={(val) => handleJobChange(job.id, 'netRun', val)} className="h-9 px-2 bg-white border-gray-200" />
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Checkbox checked={job.startup} onCheckedChange={(c) => handleJobChange(job.id, 'startup', !!c)} />
                                        </TableCell>
                                        <TableCell>
                                            <FormattedNumberInput value={job.c4_4} onChange={(val) => handleJobChange(job.id, 'c4_4', val)} className="h-9 px-2 bg-white border-gray-200" />
                                        </TableCell>
                                        <TableCell>
                                            <FormattedNumberInput value={job.c4_0} onChange={(val) => handleJobChange(job.id, 'c4_0', val)} className="h-9 px-2 bg-white border-gray-200" />
                                        </TableCell>
                                        <TableCell>
                                            <FormattedNumberInput value={job.c1_0} onChange={(val) => handleJobChange(job.id, 'c1_0', val)} className="h-9 px-2 bg-white border-gray-200" />
                                        </TableCell>
                                        <TableCell>
                                            <FormattedNumberInput value={job.c1_1} onChange={(val) => handleJobChange(job.id, 'c1_1', val)} className="h-9 px-2 bg-white border-gray-200" />
                                        </TableCell>
                                        <TableCell>
                                            <FormattedNumberInput value={job.c4_1} onChange={(val) => handleJobChange(job.id, 'c4_1', val)} className="h-9 px-2 bg-white border-gray-200" />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex flex-col items-end">
                                                {(() => {
                                                    const pressId = pressMap[job.pressName || ''] || '';
                                                    const divider = outputConversions[pressId]?.[String(job.exOmw)] || 1;

                                                    // State stores MACHINE CYCLES. UI shows CYCLES. Subtext shows UNITS.
                                                    return (
                                                        <div className={`flex flex-col items-end ${divider > 1 ? 'min-h-[48px] justify-end' : ''}`}>
                                                            <FormattedNumberInput
                                                                value={Math.round(job.maxGross)}
                                                                onChange={(val) => handleJobChange(job.id, 'maxGross', Number(val) || 0)}
                                                                className="h-9 px-2 bg-white border-gray-200 text-right"
                                                            />
                                                            {divider > 1 && (
                                                                <div className="min-h-[12px] mb-1 flex items-center pr-2">
                                                                    <span className="text-[9px] text-gray-900 font-medium leading-none">
                                                                        {(job.maxGross * divider).toLocaleString('nl-BE')}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex flex-col items-end">
                                                {/* Green/Red in dialog: input is Machine Cycles, stored is Total Units */}
                                                {(() => {
                                                    const pressId = pressMap[job.pressName || currentPressName] || '';
                                                    const divider = outputConversions[pressId]?.[String(job.exOmw)] || 1;
                                                    const localUnits = Number(job.green || 0); // This is Cycles
                                                    return (
                                                        <div className={`flex flex-col items-end ${divider > 1 ? 'min-h-[48px] justify-end' : ''}`}>
                                                            <FormattedNumberInput
                                                                value={localUnits}
                                                                onChange={(val) => handleJobChange(job.id, 'green', Number(val) || 0)}
                                                                className="h-9 px-2 bg-white border-gray-200 text-right"
                                                            />
                                                            {divider > 1 && (
                                                                <div className="min-h-[12px] mb-1 flex items-center pr-2">
                                                                    <span className="text-[9px] text-gray-900 font-medium leading-none">
                                                                        {(localUnits * divider).toLocaleString('nl-BE')}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex flex-col items-end">
                                                {(() => {
                                                    const pressId = pressMap[job.pressName || currentPressName] || '';
                                                    const divider = outputConversions[pressId]?.[String(job.exOmw)] || 1;
                                                    const localUnits = Number(job.red || 0); // This is Cycles
                                                    return (
                                                        <div className={`flex flex-col items-end ${divider > 1 ? 'min-h-[48px] justify-end' : ''}`}>
                                                            <FormattedNumberInput
                                                                value={localUnits}
                                                                onChange={(val) => handleJobChange(job.id, 'red', Number(val) || 0)}
                                                                className="h-9 px-2 bg-white border-gray-200 text-right"
                                                            />
                                                            {divider > 1 && (
                                                                <div className="min-h-[12px] mb-1 flex items-center pr-2">
                                                                    <span className="text-[9px] text-gray-900 font-medium leading-none">
                                                                        {(localUnits * divider).toLocaleString('nl-BE')}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center font-medium">
                                            {/* Delta is undivided Actual Units */}
                                            {job.delta_number?.toLocaleString('nl-BE') || '0'}
                                        </TableCell>
                                        <TableCell className="text-center font-medium">
                                            {job.delta_percentage ? `${(job.delta_percentage * 100).toLocaleString('nl-BE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%` : '0,00%'}
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="ghost"
                                                className="hover:bg-red-100 text-red-500"
                                                onClick={() => handleDeleteVersion(job.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <div className="p-2 border-t bg-gray-50">
                            <Button type="button" onClick={handleAddVersion} size="sm" variant="ghost">
                                <Plus className="w-4 h-4 mr-1" /> Versie toevoegen
                            </Button>
                        </div>
                    </div>

                    <DialogFooter className="pt-4 border-t">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuleren</Button>
                        <Button type="submit">Opslaan</Button>
                    </DialogFooter>
                </form>
                <ConfirmationModal
                    open={deleteModalOpen}
                    onOpenChange={setDeleteModalOpen}
                    onConfirm={confirmDelete}
                    title="Versie verwijderen"
                    description="Weet je zeker dat je deze versie wilt verwijderen?"
                    confirmText="Verwijderen"
                    variant="destructive"
                />
            </DialogContent>
        </Dialog >
    );
}
