// components/ui/Select.jsx
import React, { forwardRef } from "react";
import { ChevronDown } from "lucide-react";

const Select = forwardRef(
  (
    {
      label,
      error,
      options = [],
      placeholder,
      className = "",
      ...props
    },
    ref
  ) => {
    return (
      <div className={`w-full ${className}`}>
        {label && (
          <label className="block text-sm text-slate-400 mb-2 font-medium">
            {label}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            aria-invalid={!!error}
            className={`
              w-full bg-slate-950 border rounded-lg px-4 py-2.5 pr-10 text-white appearance-none
              focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all
              ${
                error
                  ? "border-red-500 focus:border-red-500"
                  : "border-slate-800 focus:border-cyan-500 hover:border-slate-700"
              }
            `}
            {...props}
          >
            {placeholder && (
              <option value="" disabled hidden>
                {placeholder}
              </option>
            )}

            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>

          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
            <ChevronDown size={16} />
          </div>
        </div>

        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";
export default Select;
