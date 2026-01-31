// components/ui/Input.jsx
import React, { forwardRef, useId } from "react";

const Input = forwardRef(
  (
    {
      label,
      error,
      icon: Icon,
      className = "",
      disabled = false,
      type = "text",
      id,
      ...props
    },
    ref
  ) => {
    const autoId = useId();
    const inputId = id || autoId;

    return (
      <div className={`w-full ${className}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm text-slate-400 mb-2 font-medium"
          >
            {label}
          </label>
        )}

        <div className="relative">
          {Icon && (
            <Icon
              aria-hidden
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none"
            />
          )}

          <input
            ref={ref}
            id={inputId}
            type={type}
            disabled={disabled}
            className={`
              w-full bg-slate-950 rounded-lg px-4 py-2.5 text-white
              placeholder-slate-500 transition-all
              focus:outline-none focus:ring-2
              ${Icon ? "pl-10" : ""}
              
              ${
                error
                  ? "border border-red-500 focus:ring-red-500/20"
                  : "border border-slate-800 focus:border-cyan-500 focus:ring-cyan-500/20 hover:border-slate-700"
              }

              ${
                disabled
                  ? "opacity-60 cursor-not-allowed bg-slate-900"
                  : ""
              }

              ${type === "number" ? "appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" : ""}
            `}
            {...props}
          />
        </div>

        {error && (
          <p className="mt-1 text-xs text-red-400">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
