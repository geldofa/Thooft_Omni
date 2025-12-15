import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import { CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { FinishedPrintJob } from './Drukwerken';

interface AddFinishedJobDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (job: Omit<FinishedPrintJob, 'id'>) => void;
    editJob?: FinishedPrintJob | null;
}

const FormattedNumberInput = ({
    value,
    onChange,
    className
}: {
    value: number | null;
    onChange: (value: number | null) => void;
    className?: string;
}) => {
    const [displayValue, setDisplayValue] = useState(() =>
        value !== null ? new Intl.NumberFormat('nl-NL').format(Number(value)) : ''
    );
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        if (!isFocused) {
            setDisplayValue(value !== null ? new Intl.NumberFormat('nl-NL').format(Number(value)) : '');
        }
    }, [value, isFocused]);

    const handleFocus = () => {
        setIsFocused(true);
        setDisplayValue(String(value ?? ''));
    };

    const handleBlur = () => {
        setIsFocused(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace(/\./g, '').replace(/[^\d]/g, '');
        setDisplayValue(e.target.value);
        const num = parseInt(raw, 10);
        onChange(isNaN(num) ? null : num);
    };

    return (
        <Input
            value={displayValue}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className={className}
            inputMode="numeric"
        />
    );
};

export function AddFinishedJobDialog({
    open,
    onOpenChange,
    onSubmit,
    editJob,
}: AddFinishedJobDialogProps) {

    const initialJobData: Omit<FinishedPrintJob, 'id'> = {
        date: new Date().toISOString().split('T')[0],
        datum: '',
        orderNr: '',
        orderName: '',
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
        performance: ''
    };

    const [jobFormData, setJobFormData] = useState<Omit<FinishedPrintJob, 'id'>>(initialJobData);

    useEffect(() => {
        if (open) {
            if (editJob) {
                const { id, ...rest } = editJob;
                setJobFormData(rest);
            } else {
                setJobFormData(initialJobData);
            }
        }
    }, [editJob, open]);


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!jobFormData.orderNr.trim() || !jobFormData.orderName.trim()) {
            toast.error('Please fill out Order Nr and Order Name');
            return;
        }

        onSubmit(jobFormData);
        onOpenChange(false);

        if (editJob) {
            toast.success('Job updated successfully');
        } else {
            toast.success('Job added successfully');
        }
    };

    const formatDate = (date: string | null) => {
        if (!date) return 'Pick a date';
        return new Date(date).toLocaleDateString('nl-BE', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };
    
    const handleNumericInputChange = (field: keyof Omit<FinishedPrintJob, 'id'>) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setJobFormData({ ...jobFormData, [field]: e.target.value === '' ? null : Number(e.target.value) });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{editJob ? 'Edit Finished Job' : 'Add Finished Job'}</DialogTitle>
                    <DialogDescription>
                        {editJob ? 'Update the job details below.' : 'Fill in the details for the new finished job.'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit}>
                    <div className="grid gap-2 py-2">
                        <div className="grid grid-cols-4 items-center gap-2">
                            <Label htmlFor="date" className="text-right text-xs">Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="col-span-3 justify-start text-left text-xs h-8"
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {formatDate(jobFormData.date)}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={new Date(jobFormData.date)}
                                        onSelect={(date) => setJobFormData({ ...jobFormData, date: date?.toISOString().split('T')[0] || '' })}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-2">
                            <Label htmlFor="orderNr" className="text-right text-xs">Order Nr.</Label>
                            <Input id="orderNr" value={jobFormData.orderNr} onChange={e => setJobFormData({ ...jobFormData, orderNr: e.target.value })} className="col-span-3 text-xs h-8" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-2">
                            <Label htmlFor="orderName" className="text-right text-xs">Order</Label>
                            <Input id="orderName" value={jobFormData.orderName} onChange={e => setJobFormData({ ...jobFormData, orderName: e.target.value })} className="col-span-3 text-xs h-8" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-2">
                            <Label htmlFor="version" className="text-right text-xs">Version/Katern</Label>
                            <Input id="version" value={jobFormData.version} onChange={e => setJobFormData({ ...jobFormData, version: e.target.value })} className="col-span-3 text-xs h-8" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-2">
                            <Label htmlFor="opmerkingen" className="text-right text-xs">Opmerkingen</Label>
                            <Textarea id="opmerkingen" value={jobFormData.opmerkingen} onChange={e => setJobFormData({ ...jobFormData, opmerkingen: e.target.value })} className="col-span-3 text-xs" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-2">
                            <Label htmlFor="pages" className="text-right text-xs">Pages</Label>
                            <Input id="pages" type="number" value={jobFormData.pages ?? ''} onChange={handleNumericInputChange('pages')} className="col-span-3 text-xs h-8" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-2">
                            <Label htmlFor="exOmw" className="text-right text-xs">Ex/Omw.</Label>
                            <Input id="exOmw" value={jobFormData.exOmw} onChange={e => setJobFormData({ ...jobFormData, exOmw: e.target.value })} className="col-span-3 text-xs h-8" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-2">
                            <Label htmlFor="netRun" className="text-right text-xs">Oplage Netto</Label>
                            <FormattedNumberInput value={jobFormData.netRun} onChange={val => setJobFormData({ ...jobFormData, netRun: val })} className="col-span-3 text-xs h-8" />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-2">
                            <Label htmlFor="startup" className="text-right text-xs">Opstart</Label>
                            <div className="col-span-3 flex items-center">
                                <Checkbox id="startup" checked={jobFormData.startup} onCheckedChange={c => setJobFormData({ ...jobFormData, startup: !!c })} />
                            </div>
                        </div>

                        <h3 className="font-semibold col-span-4 pt-2 text-sm">Wissels</h3>
                        <div className="grid grid-cols-4 items-center gap-2">
                            <Label htmlFor="c4_4" className="text-right text-xs">4/4</Label>
                            <Input id="c4_4" type="number" value={jobFormData.c4_4 ?? ''} onChange={handleNumericInputChange('c4_4')} className="col-span-3 text-xs h-8" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-2">
                            <Label htmlFor="c4_0" className="text-right text-xs">4/0</Label>
                            <Input id="c4_0" type="number" value={jobFormData.c4_0 ?? ''} onChange={handleNumericInputChange('c4_0')} className="col-span-3 text-xs h-8" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-2">
                            <Label htmlFor="c1_0" className="text-right text-xs">1/0</Label>
                            <Input id="c1_0" type="number" value={jobFormData.c1_0 ?? ''} onChange={handleNumericInputChange('c1_0')} className="col-span-3 text-xs h-8" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-2">
                            <Label htmlFor="c1_1" className="text-right text-xs">1/1</Label>
                            <Input id="c1_1" type="number" value={jobFormData.c1_1 ?? ''} onChange={handleNumericInputChange('c1_1')} className="col-span-3 text-xs h-8" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-2">
                            <Label htmlFor="c4_1" className="text-right text-xs">4/1</Label>
                            <Input id="c4_1" type="number" value={jobFormData.c4_1 ?? ''} onChange={handleNumericInputChange('c4_1')} className="col-span-3 text-xs h-8" />
                        </div>

                        <h3 className="font-semibold col-span-4 pt-2 text-sm">Resultaten</h3>
                        <div className="grid grid-cols-4 items-center gap-2">
                            <Label htmlFor="green" className="text-right text-xs">Groen</Label>
                            <FormattedNumberInput value={jobFormData.green} onChange={val => setJobFormData({ ...jobFormData, green: val })} className="col-span-3 text-xs h-8" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-2">
                            <Label htmlFor="red" className="text-right text-xs">Rood</Label>
                            <FormattedNumberInput value={jobFormData.red} onChange={val => setJobFormData({ ...jobFormData, red: val })} className="col-span-3 text-xs h-8" />
                        </div>

                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit">{editJob ? 'Update Job' : 'Add Job'}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
