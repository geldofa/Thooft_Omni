import { LucideIcon } from 'lucide-react';
// If cn doesn't exist, I'll stick to template literals as seen in other files (e.g. Home.tsx used simple strings). 
// Checking imports in other files... FeedbackList import className... usually uses generic strings.
// I'll stick to simple strings + props.

interface PageHeaderProps {
    title: React.ReactNode;
    description?: string;
    icon?: LucideIcon | React.ElementType;
    actions?: React.ReactNode;
    className?: string;
    iconColor?: string; // e.g. "text-blue-600"
    iconBgColor?: string; // e.g. "bg-blue-100"
}

export function PageHeader({
    title,
    description,
    icon: Icon,
    actions,
    className = "",
    iconColor = "text-blue-600",
    iconBgColor = "bg-blue-100"
}: PageHeaderProps) {
    return (
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 ${className}`}>
            <div className="flex items-center gap-3">
                {Icon && (
                    <div className={`p-2 rounded-xl shrink-0 ${iconBgColor}`}>
                        <Icon className={`w-6 h-6 ${iconColor}`} />
                    </div>
                )}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight leading-none">
                        {title}
                    </h1>
                    {description && (
                        <p className="text-sm text-gray-500 font-medium mt-1">
                            {description}
                        </p>
                    )}
                </div>
            </div>
            {actions && (
                <div className="flex items-center gap-2">
                    {actions}
                </div>
            )}
        </div>
    );
}
