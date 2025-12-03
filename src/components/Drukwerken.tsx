import { useState } from 'react';
import { PressType } from './AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Plus, FileText, Calendar, Clock } from 'lucide-react';

interface Press {
    id: string;
    name: PressType;
    active: boolean;
    archived: boolean;
}

interface Drukwerk {
    id: string;
    press: PressType;
    name: string;
    description: string;
    date: string;
    time: string;
    status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
}

interface FinishedPrintJob {
    id: string;
    date: string; // YYYY/MM/DD
    datum: string;
    orderNr: string;
    orderName: string;
    version: string;
    pages: number;
    exOmw: string;
    netRun: number;
    startup: number;
    c4_4: number;
    c4_0: number;
    c1_0: number;
    c1_1: number;
    c4_1: number;
    maxGross: number;
    green: number;
    red: number;
    performance: string;
}

export function Drukwerken({ presses }: { presses: Press[] }) {
    const [finishedJobs] = useState<FinishedPrintJob[]>([
        {
            id: '1',
            date: '2025/12/01',
            datum: '01 Dec',
            orderNr: 'ORD-001',
            orderName: 'Magazine Q4',
            version: 'v1',
            pages: 32,
            exOmw: '1000',
            netRun: 5000,
            startup: 100,
            c4_4: 32,
            c4_0: 0,
            c1_0: 0,
            c1_1: 0,
            c4_1: 0,
            maxGross: 5500,
            green: 100,
            red: 50,
            performance: '95%'
        },
        {
            id: '2',
            date: '2025/12/02',
            datum: '02 Dec',
            orderNr: 'ORD-002',
            orderName: 'Flyers A5',
            version: 'v1',
            pages: 2,
            exOmw: '5000',
            netRun: 10000,
            startup: 50,
            c4_4: 2,
            c4_0: 0,
            c1_0: 0,
            c1_1: 0,
            c4_1: 0,
            maxGross: 10500,
            green: 20,
            red: 10,
            performance: '98%'
        }
    ]);

    const [drukwerken, setDrukwerken] = useState<Drukwerk[]>([
        {
            id: '1',
            press: 'Lithoman',
            name: 'Brochure Printing',
            description: 'Marketing brochures for Q4 campaign',
            date: '2025-12-15',
            time: '09:00',
            status: 'pending'
        },
        {
            id: '2',
            press: 'C80',
            name: 'Book Printing',
            description: 'Hardcover book printing - 500 copies',
            date: '2025-12-10',
            time: '14:00',
            status: 'in-progress'
        }
    ]);

    const [newDrukwerk, setNewDrukwerk] = useState<Omit<Drukwerk, 'id' | 'status'>>({
        press: presses.length > 0 ? presses[0].name : 'Lithoman',
        name: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        time: '09:00'
    });

    const [isAdding, setIsAdding] = useState(false);

    const handleAddDrukwerk = () => {
        if (newDrukwerk.name.trim() && newDrukwerk.description.trim()) {
            const newId = Date.now().toString();
            setDrukwerken([
                ...drukwerken,
                {
                    ...newDrukwerk,
                    id: newId,
                    status: 'pending'
                }
            ]);

            // Reset form
            setNewDrukwerk({
                press: presses.length > 0 ? presses[0].name : 'Lithoman',
                name: '',
                description: '',
                date: new Date().toISOString().split('T')[0],
                time: '09:00'
            });
            setIsAdding(false);
        }
    };

    const handleStatusChange = (id: string, newStatus: Drukwerk['status']) => {
        setDrukwerken(drukwerken.map(d =>
            d.id === id ? { ...d, status: newStatus } : d
        ));
    };

    const getStatusColor = (status: Drukwerk['status']) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'in-progress': return 'bg-blue-100 text-blue-800';
            case 'completed': return 'bg-green-100 text-green-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="space-y-4">
            <Tabs defaultValue="finished" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                    <TabsTrigger value="finished">Finished</TabsTrigger>
                    <TabsTrigger value="parameters">Parameters</TabsTrigger>
                </TabsList>

                <TabsContent value="finished">
                    <Card>
                        <CardHeader>
                            <CardTitle>Finished Print Jobs</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead colSpan={8} className="text-center bg-blue-100">Data</TableHead>
                                            <TableHead colSpan={6} className="text-center bg-green-100">Wissels</TableHead>
                                            <TableHead colSpan={3} className="text-center bg-yellow-100">Berekening</TableHead>
                                            <TableHead colSpan={1} className="text-center bg-purple-100">Prestatie</TableHead>
                                        </TableRow>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Datum</TableHead>
                                            <TableHead>Order nr</TableHead>
                                            <TableHead>Order</TableHead>
                                            <TableHead>Versie</TableHead>
                                            <TableHead>Pagina's</TableHead>
                                            <TableHead>ex/omw.</TableHead>
                                            <TableHead>Oplage netto</TableHead>
                                            <TableHead>Opstart</TableHead>
                                            <TableHead>4/4</TableHead>
                                            <TableHead>4/0</TableHead>
                                            <TableHead>1/0</TableHead>
                                            <TableHead>1/1</TableHead>
                                            <TableHead>4/1</TableHead>
                                            <TableHead>Max Bruto</TableHead>
                                            <TableHead>Groen</TableHead>
                                            <TableHead>Rood</TableHead>
                                            <TableHead>Prestatie</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {finishedJobs.map((job) => (
                                            <TableRow key={job.id}>
                                                <TableCell>{job.date}</TableCell>
                                                <TableCell>{job.datum}</TableCell>
                                                <TableCell>{job.orderNr}</TableCell>
                                                <TableCell>{job.orderName}</TableCell>
                                                <TableCell>{job.version}</TableCell>
                                                <TableCell>{job.pages}</TableCell>
                                                <TableCell>{job.exOmw}</TableCell>
                                                <TableCell>{job.netRun}</TableCell>
                                                <TableCell>{job.startup}</TableCell>
                                                <TableCell>{job.c4_4}</TableCell>
                                                <TableCell>{job.c4_0}</TableCell>
                                                <TableCell>{job.c1_0}</TableCell>
                                                <TableCell>{job.c1_1}</TableCell>
                                                <TableCell>{job.c4_1}</TableCell>
                                                <TableCell>{job.maxGross}</TableCell>
                                                <TableCell>{job.green}</TableCell>
                                                <TableCell>{job.red}</TableCell>
                                                <TableCell>{job.performance}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="parameters">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Drukwerken Management</CardTitle>
                            <Button
                                onClick={() => setIsAdding(!isAdding)}
                                className="gap-2"
                                variant="outline"
                            >
                                <Plus className="w-4 h-4" />
                                {isAdding ? 'Cancel' : 'Add Drukwerk'}
                            </Button>
                        </CardHeader>

                        <CardContent className="space-y-6">
                            {isAdding && (
                                <div className="border rounded-lg p-4 space-y-4">
                                    <h3 className="font-medium">Add New Drukwerk</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Press</label>
                                            <select
                                                value={newDrukwerk.press}
                                                onChange={(e) => setNewDrukwerk({ ...newDrukwerk, press: e.target.value as PressType })}
                                                className="w-full p-2 border rounded"
                                            >
                                                {presses.map(press => (
                                                    <option key={press.id} value={press.name}>{press.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Name</label>
                                            <Input
                                                value={newDrukwerk.name}
                                                onChange={(e) => setNewDrukwerk({ ...newDrukwerk, name: e.target.value })}
                                                placeholder="Drukwerk name"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Description</label>
                                            <Input
                                                value={newDrukwerk.description}
                                                onChange={(e) => setNewDrukwerk({ ...newDrukwerk, description: e.target.value })}
                                                placeholder="Description"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Date</label>
                                            <Input
                                                type="date"
                                                value={newDrukwerk.date}
                                                onChange={(e) => setNewDrukwerk({ ...newDrukwerk, date: e.target.value })}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Time</label>
                                            <Input
                                                type="time"
                                                value={newDrukwerk.time}
                                                onChange={(e) => setNewDrukwerk({ ...newDrukwerk, time: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <Button onClick={handleAddDrukwerk} className="gap-2">
                                        <Plus className="w-4 h-4" />
                                        Add Drukwerk
                                    </Button>
                                </div>
                            )}

                            <Tabs defaultValue="all" className="space-y-4">
                                <TabsList>
                                    <TabsTrigger value="all">All</TabsTrigger>
                                    <TabsTrigger value="pending">Pending</TabsTrigger>
                                    <TabsTrigger value="in-progress">In Progress</TabsTrigger>
                                    <TabsTrigger value="completed">Completed</TabsTrigger>
                                    <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
                                </TabsList>

                                <TabsContent value="all">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Press</TableHead>
                                                <TableHead>Name</TableHead>
                                                <TableHead>Description</TableHead>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Time</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {drukwerken.map((d) => (
                                                <TableRow key={d.id}>
                                                    <TableCell className="font-medium">{d.press}</TableCell>
                                                    <TableCell>{d.name}</TableCell>
                                                    <TableCell>{d.description}</TableCell>
                                                    <TableCell>{d.date}</TableCell>
                                                    <TableCell>{d.time}</TableCell>
                                                    <TableCell>
                                                        <select
                                                            value={d.status}
                                                            onChange={(e) => handleStatusChange(d.id, e.target.value as Drukwerk['status'])}
                                                            className={`px-2 py-1 rounded-full text-sm ${getStatusColor(d.status)}`}
                                                        >
                                                            <option value="pending">Pending</option>
                                                            <option value="in-progress">In Progress</option>
                                                            <option value="completed">Completed</option>
                                                            <option value="cancelled">Cancelled</option>
                                                        </select>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex gap-2">
                                                            <Button variant="ghost" size="icon">
                                                                <FileText className="w-4 h-4" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon">
                                                                <Calendar className="w-4 h-4" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon">
                                                                <Clock className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TabsContent>

                                <TabsContent value="pending">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Press</TableHead>
                                                <TableHead>Name</TableHead>
                                                <TableHead>Description</TableHead>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Time</TableHead>
                                                <TableHead>Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {drukwerken.filter(d => d.status === 'pending').map((d) => (
                                                <TableRow key={d.id}>
                                                    <TableCell className="font-medium">{d.press}</TableCell>
                                                    <TableCell>{d.name}</TableCell>
                                                    <TableCell>{d.description}</TableCell>
                                                    <TableCell>{d.date}</TableCell>
                                                    <TableCell>{d.time}</TableCell>
                                                    <TableCell>
                                                        <span className={`px-2 py-1 rounded-full text-sm ${getStatusColor(d.status)}`}>
                                                            {d.status}
                                                        </span>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TabsContent>

                                <TabsContent value="in-progress">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Press</TableHead>
                                                <TableHead>Name</TableHead>
                                                <TableHead>Description</TableHead>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Time</TableHead>
                                                <TableHead>Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {drukwerken.filter(d => d.status === 'in-progress').map((d) => (
                                                <TableRow key={d.id}>
                                                    <TableCell className="font-medium">{d.press}</TableCell>
                                                    <TableCell>{d.name}</TableCell>
                                                    <TableCell>{d.description}</TableCell>
                                                    <TableCell>{d.date}</TableCell>
                                                    <TableCell>{d.time}</TableCell>
                                                    <TableCell>
                                                        <span className={`px-2 py-1 rounded-full text-sm ${getStatusColor(d.status)}`}>
                                                            {d.status}
                                                        </span>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TabsContent>

                                <TabsContent value="completed">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Press</TableHead>
                                                <TableHead>Name</TableHead>
                                                <TableHead>Description</TableHead>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Time</TableHead>
                                                <TableHead>Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {drukwerken.filter(d => d.status === 'completed').map((d) => (
                                                <TableRow key={d.id}>
                                                    <TableCell className="font-medium">{d.press}</TableCell>
                                                    <TableCell>{d.name}</TableCell>
                                                    <TableCell>{d.description}</TableCell>
                                                    <TableCell>{d.date}</TableCell>
                                                    <TableCell>{d.time}</TableCell>
                                                    <TableCell>
                                                        <span className={`px-2 py-1 rounded-full text-sm ${getStatusColor(d.status)}`}>
                                                            {d.status}
                                                        </span>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TabsContent>

                                <TabsContent value="cancelled">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Press</TableHead>
                                                <TableHead>Name</TableHead>
                                                <TableHead>Description</TableHead>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Time</TableHead>
                                                <TableHead>Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {drukwerken.filter(d => d.status === 'cancelled').map((d) => (
                                                <TableRow key={d.id}>
                                                    <TableCell className="font-medium">{d.press}</TableCell>
                                                    <TableCell>{d.name}</TableCell>
                                                    <TableCell>{d.description}</TableCell>
                                                    <TableCell>{d.date}</TableCell>
                                                    <TableCell>{d.time}</TableCell>
                                                    <TableCell>
                                                        <span className={`px-2 py-1 rounded-full text-sm ${getStatusColor(d.status)}`}>
                                                            {d.status}
                                                        </span>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
