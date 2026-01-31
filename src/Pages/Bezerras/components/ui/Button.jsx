import React from "react";
import { Loader2 } from "lucide-react";

const ICON_SIZE = (size) => (size === "sm" ? 14 : size === "lg" ? 20 : 16);

const Button = ({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  className = "",
  disabled,
  type = "button",
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary:
      "bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-900/20 active:scale-95",
    secondary: "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700",
    outline:
      "bg-transparent border border-slate-600 text-slate-300 hover:border-cyan-500 hover:text-cyan-400",
    danger: "bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-900/50",
    ghost: "bg-transparent text-slate-400 hover:text-white hover:bg-slate-800/50",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2.5 text-sm",
    lg: "px-6 py-3 text-base",
    icon: "p-2",
  };

  const resolvedVariant = variants[variant] || variants.primary;
  const resolvedSize = sizes[size] || sizes.md;

  return (
    <button
      type={type}
      className={`${baseStyles} ${resolvedVariant} ${resolvedSize} ${className}`}
      disabled={Boolean(disabled || isLoading)}
      aria-busy={isLoading ? "true" : "false"}
      {...props}
    >
      {isLoading ? <Loader2 size={ICON_SIZE(size)} className="animate-spin" /> : null}
      {!isLoading && LeftIcon ? <LeftIcon size={ICON_SIZE(size)} /> : null}
      {children}
      {!isLoading && RightIcon ? <RightIcon size={ICON_SIZE(size)} /> : null}
    </button>
  );
};

export default Button;
