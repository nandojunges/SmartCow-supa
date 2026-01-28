import { useEffect, useState } from "react";

const STATUS_COLORS = {
  online: "#22c55e",
  offline: "#f59e0b",
  syncing: "#3b82f6",
};

export default function StatusConexao({ isSyncing = false }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncInfo, setSyncInfo] = useState({
    syncing: false,
    pending: 0,
    processed: 0,
    total: 0,
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleSyncStatus = (event) => {
      if (!event?.detail) return;
      setSyncInfo((prev) => ({
        ...prev,
        ...event.detail,
      }));
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("sync:status", handleSyncStatus);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("sync:status", handleSyncStatus);
    };
  }, []);

  const syncing = isSyncing || syncInfo.syncing;
  const total = Number.isFinite(syncInfo.total) ? syncInfo.total : 0;
  const processed = Number.isFinite(syncInfo.processed) ? syncInfo.processed : 0;
  const pending =
    Number.isFinite(syncInfo.pending) && syncInfo.pending >= 0
      ? syncInfo.pending
      : Number.isFinite(total - processed)
        ? Math.max(total - processed, 0)
        : 0;
  const totalLabel = total > 0 ? total : processed + pending;
  const canShowPercent =
    syncing && totalLabel > 0 && processed >= 0 && processed <= totalLabel;
  const percent = canShowPercent
    ? Math.round((processed / totalLabel) * 100)
    : null;

  const statusKey = syncing ? "syncing" : isOnline ? "online" : "offline";
  const color = STATUS_COLORS[statusKey];

  const label = syncing
    ? totalLabel > 0
      ? `Sync ${processed}/${totalLabel}${percent !== null ? ` (${percent}%)` : ""}`
      : "Sync"
    : isOnline
      ? "Online"
      : "Offline";
  const tooltip = syncing
    ? totalLabel > 0
      ? `Sync ${processed}/${totalLabel}${percent !== null ? ` (${percent}%)` : ""}`
      : `Sync (${pending} pendentes)`
    : isOnline
      ? "Online"
      : "Offline";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 12,
        fontWeight: 800,
        color: "rgba(255,255,255,0.92)",
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
      aria-live="polite"
      title={tooltip}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: color,
          boxShadow: syncing ? `0 0 0 4px ${color}33` : "none",
          animation: syncing ? "statusPulse 1.6s ease-in-out infinite" : "none",
          flexShrink: 0,
        }}
        aria-hidden="true"
      />
      <span>{label}</span>
      <style>{`
        @keyframes statusPulse {
          0% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.55);
          }
          70% {
            transform: scale(1.05);
            box-shadow: 0 0 0 6px rgba(59, 130, 246, 0);
          }
          100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
          }
        }
      `}</style>
    </span>
  );
}
