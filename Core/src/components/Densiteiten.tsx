import { useState, useEffect, useMemo } from 'react';
import { pb } from './AuthContext';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Search, Beaker } from 'lucide-react';
import { cn } from './ui/utils';
import { formatNumber } from '../utils/formatNumber';
import { format } from 'date-fns';

interface DensityRecord {
    id: string;
    date: string;
    order_nummer: number;
    klant_order_beschrijving: string;
    versie: string;
    cmyk_naam: string;
    papier_id: string;
    papier_naam?: string;
    front_k: number;
    front_c: number;
    front_m: number;
    front_y: number;
    back_k: number;
    back_c: number;
    back_m: number;
    back_y: number;
}

export function Densiteiten() {
    const [records, setRecords] = useState<DensityRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        async function fetchDensiteiten() {
            try {
                setIsLoading(true);
                // Fetch only records that have at least a name or some CMYK data
                const result = await pb.collection('drukwerken').getFullList<any>({
                    filter: 'cmyk_naam != "" || front_k != 0 || front_c != 0 || front_m != 0 || front_y != 0',
                    sort: '-date',
                    expand: 'papier_id'
                });

                const mapped = result.map(r => ({
                    id: r.id,
                    date: r.date,
                    order_nummer: r.order_nummer,
                    klant_order_beschrijving: r.klant_order_beschrijving,
                    versie: r.versie,
                    cmyk_naam: r.cmyk_naam,
                    papier_id: r.papier_id,
                    papier_naam: r.expand?.papier_id?.naam || 'Onbekend papier',
                    front_k: r.front_k,
                    front_c: r.front_c,
                    front_m: r.front_m,
                    front_y: r.front_y,
                    back_k: r.back_k,
                    back_c: r.back_c,
                    back_m: r.back_m,
                    back_y: r.back_y,
                }));

                setRecords(mapped);
            } catch (error) {
                console.error('[Densiteiten] Failed to fetch:', error);
            } finally {
                setIsLoading(false);
            }
        }

        fetchDensiteiten();
    }, []);

    const filteredRecords = useMemo(() => {
        if (!searchQuery) return records;
        const lowerQuery = searchQuery.toLowerCase();
        return records.filter(r => 
            r.cmyk_naam?.toLowerCase().includes(lowerQuery) ||
            r.klant_order_beschrijving?.toLowerCase().includes(lowerQuery) ||
            String(r.order_nummer).includes(lowerQuery) ||
            r.papier_naam?.toLowerCase().includes(lowerQuery)
        );
    }, [records, searchQuery]);

    const ColorTag = ({ label, value, colorClass }: { label: string, value: number, colorClass: string }) => {
        if (!value) return <span className="text-gray-300 mx-0.5">0</span>;
        return (
            <div className="flex flex-col items-center mx-0.5">
                <span className="text-[8px] text-gray-400 leading-none mb-0.5">{label}</span>
                <span className={cn("text-[11px] font-bold px-1 rounded border-b-2", colorClass)}>
                    {formatNumber(value, 2)}
                </span>
            </div>
        );
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-50 rounded-lg">
                        <Beaker className="text-green-600 size-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Densiteiten</h1>
                        <p className="text-sm text-gray-500">Overzicht van opgeslagen inktdekkingen en papierinstellingen</p>
                    </div>
                </div>
                <div className="relative w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                    <Input 
                        placeholder="Zoek op naam, order of papier..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-gray-50 border-gray-200"
                    />
                </div>
            </div>

            <Card className="border-none shadow-md overflow-hidden">
                <Table>
                    <TableHeader className="bg-gray-50">
                        <TableRow>
                            <TableHead className="w-[100px]">Datum</TableHead>
                            <TableHead className="w-[100px]">Order</TableHead>
                            <TableHead>Klant / Project</TableHead>
                            <TableHead>Naam Densiteit</TableHead>
                            <TableHead>Papier</TableHead>
                            <TableHead className="text-center">Front KCMY</TableHead>
                            <TableHead className="text-center">Back KCMY</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-32 text-center text-gray-500">
                                    Laden van densiteiten...
                                </TableCell>
                            </TableRow>
                        ) : filteredRecords.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-32 text-center text-gray-500">
                                    Geen densiteiten gevonden.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredRecords.map((record) => (
                                <TableRow key={record.id} className="hover:bg-green-50/30 transition-colors">
                                    <TableCell className="text-xs text-gray-500 font-medium">
                                        {record.date ? format(new Date(record.date), 'dd-MM-yyyy') : '-'}
                                    </TableCell>
                                    <TableCell className="font-bold text-gray-700">
                                        {record.order_nummer}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-semibold text-gray-800">{record.klant_order_beschrijving}</span>
                                            <span className="text-[10px] text-gray-400 uppercase">Versie: {record.versie}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-green-50 text-green-700 text-xs font-bold border border-green-100">
                                            {record.cmyk_naam || 'Standaard'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-sm text-gray-600">
                                        {record.papier_naam}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex justify-center">
                                            <ColorTag label="K" value={record.front_k} colorClass="border-gray-800 text-gray-900" />
                                            <ColorTag label="C" value={record.front_c} colorClass="border-cyan-500 text-cyan-700" />
                                            <ColorTag label="M" value={record.front_m} colorClass="border-pink-500 text-pink-700" />
                                            <ColorTag label="Y" value={record.front_y} colorClass="border-yellow-500 text-yellow-700" />
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex justify-center">
                                            <ColorTag label="K" value={record.back_k} colorClass="border-gray-800 text-gray-900" />
                                            <ColorTag label="C" value={record.back_c} colorClass="border-cyan-500 text-cyan-700" />
                                            <ColorTag label="M" value={record.back_m} colorClass="border-pink-500 text-pink-700" />
                                            <ColorTag label="Y" value={record.back_y} colorClass="border-yellow-500 text-yellow-700" />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}
