import * as React from "react";

import { cn } from "./utils";

function Input({ className, type, onWheel, onKeyDown, onChange, ...props }: React.ComponentProps<"input">) {
  const isNumeric = type === 'number';

  // Prevent scroll-to-change on number inputs
  const handleWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    if (isNumeric) {
      e.currentTarget.blur();
    }
    onWheel?.(e);
  };

  // Prevent decimal and non-numeric input for number fields
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isNumeric && (e.key === '.' || e.key === ',' || e.key === 'e' || e.key === 'E')) {
      e.preventDefault();
    }
    onKeyDown?.(e);
  };

  // Filter out non-numeric characters for number fields
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isNumeric) {
      // Only allow digits and minus sign at the start
      const filtered = e.target.value.replace(/[^\d-]/g, '').replace(/(?!^)-/g, '');
      e.target.value = filtered;
    }
    onChange?.(e);
  };

  return (
    <input
      type={isNumeric ? 'text' : type}
      inputMode={isNumeric ? 'numeric' : undefined}
      pattern={isNumeric ? '[0-9]*' : undefined}
      data-slot="input"
      onWheel={handleWheel}
      onKeyDown={handleKeyDown}
      onChange={handleChange}
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border px-3 py-1 text-base bg-input-background transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
