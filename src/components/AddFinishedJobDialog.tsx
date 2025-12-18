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
            toast.error('Vul a.u.b. het Ordernr en de Ordernaam in');
            return;
        }

        onSubmit(jobFormData);
        onOpenChange(false);

        if (editJob) {
            toast.success('Drukwerk succesvol bijgewerkt');
        } else {
            toast.success('Drukwerk succesvol toegevoegd');
        }
    };

    const formatDate = (date: string | null) => {
        if (!date) return 'Kies een datum';
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
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{editJob ? 'Afgewerkt Drukwerk Bewerken' : 'Afgewerkt Drukwerk Toevoegen'}</DialogTitle>
                    <DialogDescription>
                        {editJob ? 'Werk de details van het drukwerk hieronder bij.' : 'Vul de details in voor het nieuwe afgewerkte drukwerk.'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Section 1: Order Details */}
                    <div className="bg-gray-50 p-4 rounded-md border border-gray-100">
                        <h3 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wider">Order Details</h3>
                        <div className="flex flex-wrap gap-4">
                            <div className="w-[23%] space-y-2">
                                <Label htmlFor="date">Datum</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className="w-full justify-start text-left text-xs h-9"
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
                            <div className="w-[23%] space-y-2">
                                <Label htmlFor="orderNr">Ordernr.</Label>
                                <Input id="orderNr" value={jobFormData.orderNr} onChange={e => setJobFormData({ ...jobFormData, orderNr: e.target.value })} className="h-9" />
                            </div>
                            <div className="w-[30%] space-y-2">
                                <Label htmlFor="orderName">Ordernaam</Label>
                                <Input id="orderName" value={jobFormData.orderName} onChange={e => setJobFormData({ ...jobFormData, orderName: e.target.value })} className="h-9" />
                            </div>
                            <div className="flex-1 space-y-2">
                                <Label htmlFor="version">Versie</Label>
                                <Input id="version" value={jobFormData.version} onChange={e => setJobFormData({ ...jobFormData, version: e.target.value })} className="h-9" />
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Production Specs */}
                    <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wider">Productie Specs</h3>
                        <div className="flex flex-wrap gap-4">
                            <div className="flex-1 space-y-2">
                                <Label htmlFor="pages">Pagina's</Label>
                                <Input id="pages" type="number" value={jobFormData.pages ?? ''} onChange={handleNumericInputChange('pages')} className="h-9" />
                            </div>
                            <div className="flex-1 space-y-2">
                                <Label htmlFor="exOmw">Ex/Omw.</Label>
                                <Input id="exOmw" value={jobFormData.exOmw} onChange={e => setJobFormData({ ...jobFormData, exOmw: e.target.value })} className="h-9" />
                            </div>
                            <div className="flex-1 space-y-2">
                                <Label htmlFor="netRun">Oplage Netto</Label>
                                <FormattedNumberInput value={jobFormData.netRun} onChange={val => setJobFormData({ ...jobFormData, netRun: val })} className="h-9" />
                            </div>
                            <div className="flex-1 flex items-end pb-2">
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="startup" checked={jobFormData.startup} onCheckedChange={c => setJobFormData({ ...jobFormData, startup: !!c })} />
                                    <Label htmlFor="startup" className="cursor-pointer">Opstart</Label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Wissels */}
                    <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wider">Wissels</h3>
                        <div className="flex gap-2">
                            <div className="flex-1 space-y-2">
                                <Label htmlFor="c4_4" className="text-xs text-center block">4/4</Label>
                                <Input id="c4_4" type="number" value={jobFormData.c4_4 ?? ''} onChange={handleNumericInputChange('c4_4')} className="h-9 text-center px-1" />
                            </div>
                            <div className="flex-1 space-y-2">
                                <Label htmlFor="c4_0" className="text-xs text-center block">4/0</Label>
                                <Input id="c4_0" type="number" value={jobFormData.c4_0 ?? ''} onChange={handleNumericInputChange('c4_0')} className="h-9 text-center px-1" />
                            </div>
                            <div className="flex-1 space-y-2">
                                <Label htmlFor="c1_0" className="text-xs text-center block">1/0</Label>
                                <Input id="c1_0" type="number" value={jobFormData.c1_0 ?? ''} onChange={handleNumericInputChange('c1_0')} className="h-9 text-center px-1" />
                            </div>
                            <div className="flex-1 space-y-2">
                                <Label htmlFor="c1_1" className="text-xs text-center block">1/1</Label>
                                <Input id="c1_1" type="number" value={jobFormData.c1_1 ?? ''} onChange={handleNumericInputChange('c1_1')} className="h-9 text-center px-1" />
                            </div>
                            <div className="flex-1 space-y-2">
                                <Label htmlFor="c4_1" className="text-xs text-center block">4/1</Label>
                                <Input id="c4_1" type="number" value={jobFormData.c4_1 ?? ''} onChange={handleNumericInputChange('c4_1')} className="h-9 text-center px-1" />
                            </div>
                        </div>
                    </div>

                    {/* Section 4: Results & Comments */}
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <h3 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wider">Resultaten</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="green" className="text-green-600">Groen</Label>
                                    <FormattedNumberInput value={jobFormData.green} onChange={val => setJobFormData({ ...jobFormData, green: val })} className="h-9" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="red" className="text-red-600">Rood</Label>
                                    <FormattedNumberInput value={jobFormData.red} onChange={val => setJobFormData({ ...jobFormData, red: val })} className="h-9" />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="opmerkingen">Opmerkingen</Label>
                            <Textarea id="opmerkingen" value={jobFormData.opmerkingen} onChange={e => setJobFormData({ ...jobFormData, opmerkingen: e.target.value })} className="min-h-[80px]" placeholder="Add any comments..." />
                        </div>
                    </div>

                    <DialogFooter className="pt-4 border-t">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuleren</Button>
                        <Button type="submit">{editJob ? 'Drukwerk Bijwerken' : 'Drukwerk Toevoegen'}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
