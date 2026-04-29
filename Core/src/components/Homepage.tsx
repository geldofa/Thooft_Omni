import React, { useMemo, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { LogOut, ArrowRight, GripVertical, X } from 'lucide-react';
import { Card } from './ui/card';
import { Press } from './AuthContext';
import { NAVIGATION_CONFIG } from '../config/navigationConfig';
import { useNavOrder, applyOrder } from '../hooks/useNavOrder';

interface HomepageProps {
    setActiveTab: (tab: string) => void;
    activePresses?: Press[];
}

function Background() {
    // Collect all unique icons from config
    const icons = NAVIGATION_CONFIG.map(item => item.icon);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let animationFrameId: number;
        const handleMouseMove = (e: MouseEvent) => {
            if (!containerRef.current) return;
            const x = (e.clientX / window.innerWidth - 0.5) * 60; 
            const y = (e.clientY / window.innerHeight - 0.5) * 60; 
            
            animationFrameId = requestAnimationFrame(() => {
                if (containerRef.current) {
                    containerRef.current.style.transform = `translate(${-x}px, ${-y}px)`;
                }
            });
        };
        
        window.addEventListener('mousemove', handleMouseMove);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    // Create a truly random pattern, memoized to stay consistent on re-renders
    const pattern = useMemo(() => {
        return Array.from({ length: 1200 }, () => ({
            Icon: icons[Math.floor(Math.random() * icons.length)],
            rotate: Math.random() * 360,
            scale: 0.3 + Math.random() * 0.5,
            duration: 20 + Math.random() * 30,
            delay: -Math.random() * 30,
            x: (Math.random() - 0.5) * 40, // Random jitter
            y: (Math.random() - 0.5) * 40  // Random jitter
        }));
    }, [icons]);

    return (
        <div className="fixed inset-0 pointer-events-none opacity-[0.08] overflow-hidden grayscale select-none print:hidden bg-white">
            <div 
                ref={containerRef}
                className="absolute -inset-[100px] flex flex-wrap gap-4 p-4 justify-center items-center transition-transform duration-1000 ease-out"
            >
                {pattern.map((item, i) => {
                    const Icon = item.Icon;
                    return (
                        <div
                            key={i}
                            style={{
                                "--rotation": `${item.rotate}deg`,
                                transform: `scale(${item.scale}) translate(${item.x}px, ${item.y}px)`,
                                animationDuration: `${item.duration}s`,
                                animationDelay: `${item.delay}s`
                            } as React.CSSProperties}
                            className="animate-drift shrink-0"
                        >
                            <Icon className="w-7 h-7 text-slate-800" />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export function Homepage({ setActiveTab, activePresses = [] }: HomepageProps) {
    const { user, logout, hasPermission } = useAuth();
    const [editMode, setEditMode] = useState(false);
    const [dragOverId, setDragOverId] = useState<string | null>(null);
    const [order, setOrder] = useNavOrder();
    const draggedId = useRef<string | null>(null);

    const filteredItems = useMemo(() => NAVIGATION_CONFIG.filter((item) => {
        if (item.anyPermission) return item.anyPermission.some(p => hasPermission(p));
        return hasPermission(item.permission);
    }), [hasPermission]);

    const orderedItems = useMemo(() => applyOrder(filteredItems, order), [filteredItems, order]);

    if (!user) return null;

    const handleDragStart = (id: string) => { draggedId.current = id; };
    const handleDragOver = (e: React.DragEvent, id: string) => {
        e.preventDefault();
        if (draggedId.current !== id) setDragOverId(id);
    };
    const handleDrop = (targetId: string) => {
        const from = draggedId.current;
        if (!from || from === targetId) return;
        const ids = orderedItems.map(i => i.id);
        const fi = ids.indexOf(from);
        const ti = ids.indexOf(targetId);
        const newIds = [...ids];
        newIds.splice(fi, 1);
        newIds.splice(ti, 0, from);
        const hiddenIds = order.filter(id => !ids.includes(id));
        setOrder([...newIds, ...hiddenIds]);
        draggedId.current = null;
        setDragOverId(null);
    };
    const handleDragEnd = () => { draggedId.current = null; setDragOverId(null); };

    const greeting = (() => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Goedemorgen';
        if (hour < 18) return 'Goedemiddag';
        return 'Goedenavond';
    })();

    return (
        <div className="h-screen bg-white relative overflow-hidden flex flex-col items-center justify-center">
            <Background />

            <div className="w-full max-w-[1400px] relative z-10 px-6 sm:px-12 flex flex-col h-full justify-between py-8">
                <style>
                    {`
                    @keyframes reveal {
                        0% { opacity: 0; transform: translateY(20px); filter: blur(10px); }
                        100% { opacity: 1; transform: translateY(0); filter: blur(0); }
                    }
                    @keyframes float {
                        0%, 100% { transform: translateY(0); }
                        50% { transform: translateY(-10px); }
                    }
                    @keyframes drift {
                        0% { transform: translate(0, 0) rotate(var(--rotation)); }
                        33% { transform: translate(15px, 20px) rotate(calc(var(--rotation) + 3deg)); }
                        66% { transform: translate(-10px, 10px) rotate(calc(var(--rotation) - 2deg)); }
                        100% { transform: translate(0, 0) rotate(var(--rotation)); }
                    }
                    .animate-reveal {
                        animation: reveal 1.2s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
                    }
                    .animate-float {
                        animation: float 6s ease-in-out infinite;
                    }
                    .animate-drift {
                        animation: drift 25s ease-in-out infinite;
                    }
                    `}
                </style>

                {/* Header Section */}
                <div className="text-center animate-reveal">
                    <div className="inline-block relative animate-float">
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
                        <h1 className="relative text-6xl font-black text-slate-900 mb-4 tracking-tighter italic flex items-center justify-center gap-3">
                            <span className="bg-clip-text text-transparent bg-gradient-to-br from-slate-900 to-slate-700">T'HOOFT</span>
                            <span className="text-blue-600 drop-shadow-[0_10px_20px_rgba(37,99,235,0.25)] relative">
                                OMNI
                                <span className="absolute -bottom-2 left-0 w-full h-1 bg-blue-600/10 rounded-full blur-sm"></span>
                            </span>
                        </h1>
                    </div>
                    <p className="text-lg text-slate-500 font-medium tracking-tight opacity-0 animate-reveal [animation-delay:0.4s] mb-2">
                        {greeting}, <span className="font-bold text-slate-900 border-b-2 border-blue-500/30 pb-1">{user.name || user.username}</span>
                    </p>
                </div>

                {/* Centered Grid Layout */}
                {editMode && (
                    <p className="text-center text-xs text-blue-500 font-medium -mb-2 animate-reveal">
                        Sleep kaarten om de volgorde aan te passen
                    </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 my-auto w-full mx-auto px-4 max-w-[1400px]">
                    {orderedItems.map((item: any, index: number) => {
                        const Icon = item.icon;
                        const subtabs = item.subtabs ? item.subtabs(activePresses, hasPermission) : [];

                        const isLastItem = index === orderedItems.length - 1;
                        const lastItemClass = (isLastItem && orderedItems.length % 3 === 1) ? 'lg:col-start-2' : '';
                        const isDragOver = dragOverId === item.id;

                        return (
                            <Card
                                key={item.id}
                                draggable={editMode}
                                onDragStart={editMode ? () => handleDragStart(item.id) : undefined}
                                onDragOver={editMode ? (e) => handleDragOver(e, item.id) : undefined}
                                onDrop={editMode ? () => handleDrop(item.id) : undefined}
                                onDragEnd={editMode ? handleDragEnd : undefined}
                                className={`group relative overflow-hidden transition-all duration-500 border-none shadow-xl bg-white/80 backdrop-blur-sm flex flex-col rounded-3xl p-5 min-h-[12rem] ${lastItemClass} ${editMode ? 'cursor-grab active:cursor-grabbing select-none' : 'cursor-pointer hover:shadow-2xl'} ${isDragOver ? 'ring-2 ring-blue-400 ring-offset-2 scale-[1.02]' : ''}`}
                                onClick={editMode ? undefined : () => setActiveTab(item.id)}
                            >
                                {/* Aesthetic Background Gradient */}
                                <div className={`absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 ${item.color}`} />
                                {editMode && (
                                    <div className="absolute top-3 right-3 text-slate-300">
                                        <GripVertical className="w-4 h-4" />
                                    </div>
                                )}

                                <div className="flex-1 flex flex-col text-center items-center">
                                    <div className="flex items-center justify-center mb-2 w-full relative">
                                        <div className={`${item.color} w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-slate-200 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                                            <Icon className="w-7 h-7" />
                                        </div>
                                        <div className="absolute right-0 opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all duration-500">
                                            <ArrowRight className="w-5 h-5 text-slate-400" />
                                        </div>
                                    </div>

                                    <div className="mb-2">
                                        <h3 className="text-xl font-black text-slate-900 group-hover:text-blue-600 transition-colors mb-1">
                                            {item.label}
                                        </h3>
                                        <p className="text-xs text-slate-500 font-medium leading-relaxed line-clamp-2">
                                            {item.description}
                                        </p>
                                    </div>

                                    {/* Chips Section */}
                                    {subtabs.length > 0 && (
                                        <div className="mt-auto pt-2 flex flex-wrap gap-2 justify-center border-t border-slate-50 w-full">
                                            {subtabs.map((sub: any, i: number) => {
                                                const isAdvanced = sub.label.toLowerCase() === 'geavanceerd';
                                                return (
                                                    <button
                                                        key={i}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveTab(sub.path);
                                                        }}
                                                        className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-full border transition-all duration-300 active:scale-90 shadow-sm hover:shadow-md ${
                                                            isAdvanced 
                                                                ? 'bg-slate-800 text-white border-slate-800 hover:bg-slate-900 hover:scale-105' 
                                                                : 'bg-white text-slate-600 border-slate-100 hover:bg-blue-600 hover:text-white hover:border-blue-600'
                                                        }`}
                                                    >
                                                        {sub.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </Card>
                        );
                    })}
                </div>

                {/* Footer Section */}
                <div className="flex items-center justify-center gap-8 border-t border-slate-200 pt-6">
                    <button
                        onClick={logout}
                        className="group text-slate-400 hover:text-red-500 font-black uppercase tracking-widest text-[10px] flex items-center gap-3 transition-all active:scale-95"
                    >
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-red-50 transition-colors">
                            <LogOut className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
                        </div>
                        Uitloggen
                    </button>
                    <button
                        onClick={() => setEditMode(e => !e)}
                        className={`group font-black uppercase tracking-widest text-[10px] flex items-center gap-3 transition-all active:scale-95 ${editMode ? 'text-blue-600' : 'text-slate-400 hover:text-blue-500'}`}
                    >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${editMode ? 'bg-blue-100' : 'bg-slate-100 group-hover:bg-blue-50'}`}>
                            {editMode
                                ? <X className="w-3.5 h-3.5 text-blue-600" />
                                : <GripVertical className="w-3.5 h-3.5" />
                            }
                        </div>
                        {editMode ? 'Klaar' : 'Aanpassen'}
                    </button>
                </div>
            </div>
        </div>
    );
}
