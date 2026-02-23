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
import { Checkbox } from './ui/checkbox';
import { toast } from 'sonner';
import { Katern } from '../utils/drukwerken-utils';

interface AddKaternDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (katern: Omit<Katern, 'id'>) => void;
    editKatern?: Katern | null;
}

const FormattedNumberInput = ({
    value,
    onChange,
    className
}: {
    value: number | '';
    onChange: (value: number) => void;
    className?: string;
}) => {
    const [displayValue, setDisplayValue] = useState(() =>
        value !== '' ? new Intl.NumberFormat('nl-NL').format(Number(value)) : ''
    );
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        if (!isFocused) {
            setDisplayValue(value !== '' ? new Intl.NumberFormat('nl-NL').format(Number(value)) : '');
        }
    }, [value, isFocused]);

    const handleFocus = () => {
        setIsFocused(true);
        setDisplayValue(String(value));
    };

    const handleBlur = () => {
        setIsFocused(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace(/\./g, '').replace(/[^\d]/g, '');
        setDisplayValue(e.target.value);
        const num = parseInt(raw, 10);
        onChange(isNaN(num) ? 0 : num);
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

export function AddKaternDialog({
    open,
    onOpenChange,
    onSubmit,
    editKatern,
}: AddKaternDialogProps) {

    const initialKaternData: Omit<Katern, 'id'> = {
        version: '',
        pages: 0,
        exOmw: '',
        netRun: 0,
        startup: false,
        c4_4: 0,
        c4_0: 0,
        c1_0: 0,
        c1_1: 0,
        c4_1: 0,
        maxGross: 0,
        green: 0,
        red: 0,
        delta: 0,
        deltaPercentage: 0,
    };

    const [katernFormData, setKaternFormData] = useState(initialKaternData);

    useEffect(() => {
        if (open) {
            if (editKatern) {
                const { id, ...rest } = editKatern;
                setKaternFormData(rest);
            } else {
                setKaternFormData(initialKaternData);
            }
        }
    }, [editKatern, open]);


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!katernFormData.version.trim()) {
            toast.error('Vul a.u.b. de Versie/Katern in');
            return;
        }

        onSubmit(katernFormData);
        onOpenChange(false);

        if (editKatern) {
            toast.success('Katern succesvol bijgewerkt');
        } else {
            toast.success('Katern succesvol toegevoegd');
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{editKatern ? 'Katern Bewerken' : 'Katern/Versie Toevoegen'}</DialogTitle>
                    <DialogDescription>
                        {editKatern ? 'Pas de katerngegevens hieronder aan.' : 'Vul de gegevens voor de nieuwe katern in.'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="version" className="text-right">Versie/Katern</Label>
                            <Input id="version" value={katernFormData.version} onChange={e => setKaternFormData({ ...katernFormData, version: e.target.value })} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="pages" className="text-right">Pagina's</Label>
                            <Input id="pages" type="number" value={katernFormData.pages || ''} onChange={e => setKaternFormData({ ...katernFormData, pages: Number(e.target.value) })} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="exOmw" className="text-right">Ex/Omw.</Label>
                            <Input id="exOmw" value={katernFormData.exOmw} onChange={e => setKaternFormData({ ...katernFormData, exOmw: e.target.value })} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="netRun" className="text-right">Oplage Netto</Label>
                            <FormattedNumberInput value={katernFormData.netRun || ''} onChange={val => setKaternFormData({ ...katernFormData, netRun: val })} className="col-span-3" />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="startup" className="text-right">Opstart</Label>
                            <div className="col-span-3 flex items-center">
                                <Checkbox id="startup" checked={katernFormData.startup} onCheckedChange={c => setKaternFormData({ ...katernFormData, startup: !!c })} />
                            </div>
                        </div>

                        <h3 className="font-semibold col-span-4 pt-4">Wissels</h3>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="c4_4" className="text-right">4/4</Label>
                            <Input id="c4_4" type="number" value={katernFormData.c4_4 || ''} onChange={e => setKaternFormData({ ...katernFormData, c4_4: Number(e.target.value) })} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="c4_0" className="text-right">4/0</Label>
                            <Input id="c4_0" type="number" value={katernFormData.c4_0 || ''} onChange={e => setKaternFormData({ ...katernFormData, c4_0: Number(e.target.value) })} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="c1_0" className="text-right">1/0</Label>
                            <Input id="c1_0" type="number" value={katernFormData.c1_0 || ''} onChange={e => setKaternFormData({ ...katernFormData, c1_0: Number(e.target.value) })} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="c1_1" className="text-right">1/1</Label>
                            <Input id="c1_1" type="number" value={katernFormData.c1_1 || ''} onChange={e => setKaternFormData({ ...katernFormData, c1_1: Number(e.target.value) })} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="c4_1" className="text-right">4/1</Label>
                            <Input id="c4_1" type="number" value={katernFormData.c4_1 || ''} onChange={e => setKaternFormData({ ...katernFormData, c4_1: Number(e.target.value) })} className="col-span-3" />
                        </div>

                        <h3 className="font-semibold col-span-4 pt-4">Resultaten</h3>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="green" className="text-right">Groen</Label>
                            <FormattedNumberInput value={katernFormData.green || ''} onChange={val => setKaternFormData({ ...katernFormData, green: val })} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="red" className="text-right">Rood</Label>
                            <FormattedNumberInput value={katernFormData.red || ''} onChange={val => setKaternFormData({ ...katernFormData, red: val })} className="col-span-3" />
                        </div>

                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuleren</Button>
                        <Button type="submit">{editKatern ? 'Katern Bijwerken' : 'Katern Toevoegen'}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
