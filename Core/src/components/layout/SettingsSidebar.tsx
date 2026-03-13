

export interface SidebarItem {
    value: string;
    label: string;
    icon: any;
    description?: string;
}

export interface SidebarGroup {
    label?: string;
    items: SidebarItem[];
}

interface SettingsSidebarProps {
    groups: SidebarGroup[];
    activeValue: string;
    onSelect: (value: string) => void;
    title?: string;
}

export function SettingsSidebar({ groups, activeValue, onSelect, title }: SettingsSidebarProps) {
    return (
        <aside className="w-64 flex-shrink-0 flex flex-col h-full border-r border-gray-100/80 bg-white rounded-l-2xl overflow-hidden">
            {title && (
                <div className="px-5 py-3 pb-1">
                    <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <span className="w-1.5 h-5 bg-blue-600 rounded-full" />
                        {title}
                    </h2>
                </div>
            )}
            <nav className="flex-1 overflow-y-auto no-scrollbar px-2 space-y-0 pb-4">
                {groups.map((group, gi) => (
                    <div key={gi} className="space-y-0 mt-2 first:mt-0">
                        {group.label && (
                            <div className="px-3 mb-1">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{group.label}</span>
                            </div>
                        )}
                        <div className="space-y-[1px]">
                            {group.items.map((item) => {
                                const Icon = item.icon;
                                const isActive = activeValue === item.value;
                                return (
                                    <button
                                        key={item.value}
                                        onClick={() => onSelect(item.value)}
                                        className={`
                                            w-full flex items-center gap-3 px-3 py-1 rounded-lg text-sm font-bold
                                            transition-all duration-200 text-left group
                                            ${isActive
                                                ? 'bg-blue-600 text-white shadow-sm shadow-blue-100/50 scale-[1.01]'
                                                : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 active:scale-[0.99]'
                                            }
                                        `}
                                    >
                                        <div className={`p-1 rounded-md transition-colors ${isActive ? 'bg-white/20' : 'bg-slate-100 group-hover:bg-white'}`}>
                                            <Icon
                                                className={`w-3.5 h-3.5 flex-shrink-0 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'}`}
                                            />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="truncate">{item.label}</span>
                                            {item.description && (
                                                <span className={`text-[10px] truncate font-medium ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>
                                                    {item.description}
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>
        </aside>
    );
}
