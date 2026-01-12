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
import { CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Werkorder } from './Drukwerken';

interface AddWerkorderDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (werkorder: Omit<Werkorder, 'id' | 'katernen'>) => void;
    editWerkorder?: Werkorder | null;
}

export function AddWerkorderDialog({
    open,
    onOpenChange,
    onSubmit,
    editWerkorder,
}: AddWerkorderDialogProps) {

    const initialWerkorderData: Omit<Werkorder, 'id' | 'katernen'> = {
        orderNr: '',
        orderName: '', // Added orderName
        orderDate: new Date().toISOString().split('T')[0],
    };

    const [werkorderFormData, setWerkorderFormData] = useState(initialWerkorderData);

    useEffect(() => {
        if (open) {
            if (editWerkorder) {
                const { id, katernen, ...rest } = editWerkorder;
                setWerkorderFormData(rest);
            } else {
                setWerkorderFormData(initialWerkorderData);
            }
        }
    }, [editWerkorder, open]);


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!werkorderFormData.orderNr.trim() || !werkorderFormData.orderName.trim()) {
            toast.error('Vul a.u.b. het Ordernr. en de Ordernaam in');
            return;
        }

        onSubmit(werkorderFormData);
        onOpenChange(false);

        if (editWerkorder) {
            toast.success('Werkorder succesvol bijgewerkt');
        } else {
            toast.success('Werkorder succesvol toegevoegd');
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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{editWerkorder ? 'Werkorder Bewerken' : 'Werkorder Toevoegen'}</DialogTitle>
                    <DialogDescription>
                        {editWerkorder ? 'Pas de werkordergegevens hieronder aan.' : 'Vul de gegevens voor de nieuwe werkorder in.'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="orderNr">Ordernr.</Label>
                            <Input id="orderNr" value={werkorderFormData.orderNr} onChange={e => setWerkorderFormData({ ...werkorderFormData, orderNr: e.target.value })} className="col-span-full" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="orderName">Ordernaam</Label>
                            <Input id="orderName" value={werkorderFormData.orderName} onChange={e => setWerkorderFormData({ ...werkorderFormData, orderName: e.target.value })} className="col-span-full" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="orderDate">Orderdatum</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="col-span-full justify-start text-left"
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {formatDate(werkorderFormData.orderDate)}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={new Date(werkorderFormData.orderDate)}
                                        onSelect={(date) => setWerkorderFormData({ ...werkorderFormData, orderDate: date?.toISOString().split('T')[0] || '' })}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuleren</Button>
                        <Button type="submit">{editWerkorder ? 'Werkorder Bijwerken' : 'Werkorder Toevoegen'}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
