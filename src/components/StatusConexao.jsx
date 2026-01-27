import { useEffect, useState } from "react";

export default function StatusConexao({ isSyncing = false }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  let label = "🟡 Offline";
  if (isSyncing) {
    label = "🔄 Sincronizando";
  } else if (isOnline) {
    label = "🟢 Online";
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 12,
        right: 16,
        zIndex: 9999,
        background: "rgba(255,255,255,0.9)",
        borderRadius: 12,
        padding: "6px 10px",
        fontSize: "0.85rem",
        color: "#1f2937",
        boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
      }}
      aria-live="polite"
    >
      {label}
    </div>
  );
}
