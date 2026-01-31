// components/ui/Modal.jsx
import React, { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

export const Modal = ({ title, children, onClose, maxWidth = "max-w-lg" }) => {
  const titleId = useId();
  const panelRef = useRef(null);

  useEffect(() => {
    if (!onClose) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);

    // trava scroll do body
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // foco no modal (sem quebrar)
    setTimeout(() => panelRef.current?.focus(), 0);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(e) => {
        // fecha somente se clicar no backdrop
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`bg-slate-900 border border-slate-700 rounded-xl w-full ${maxWidth} shadow-2xl outline-none`}
      >
        <div className="flex justify-between items-center p-6 border-b border-slate-800">
          <h3 id={titleId} className="text-xl font-bold text-white">
            {title}
          </h3>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/60 transition-colors"
            aria-label="Fechar modal"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
