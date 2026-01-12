import { useState, useEffect } from 'react';
import { Input } from './input';

interface FormattedNumberInputProps {
    value: number | null;
    onChange: (value: number | null) => void;
    className?: string;
    decimals?: number;
    placeholder?: string;
}

export function FormattedNumberInput({
    value,
    onChange,
    className,
    decimals = 0,
    placeholder
}: FormattedNumberInputProps) {
    const [displayValue, setDisplayValue] = useState(() =>
        value !== null && value !== undefined
            ? new Intl.NumberFormat('nl-NL', {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals,
            }).format(Number(value))
            : ''
    );
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        if (!isFocused) {
            setDisplayValue(
                value !== null && value !== undefined
                    ? new Intl.NumberFormat('nl-NL', {
                        minimumFractionDigits: decimals,
                        maximumFractionDigits: decimals,
                    }).format(Number(value))
                    : ''
            );
        }
    }, [value, isFocused, decimals]);

    const handleFocus = () => {
        setIsFocused(true);
        // Show raw value for editing (using dot as decimal separator if any)
        setDisplayValue(value !== null && value !== undefined ? String(value) : '');
    };

    const handleBlur = () => {
        setIsFocused(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(',', '.'); // Allow comma as decimal separator during entry
        setDisplayValue(e.target.value);
        const num = parseFloat(val);
        onChange(isNaN(num) ? null : num);
    };

    return (
        <Input
            value={displayValue}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className={className}
            placeholder={placeholder}
        />
    );
}
