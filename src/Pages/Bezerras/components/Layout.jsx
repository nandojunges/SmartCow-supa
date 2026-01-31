import React, { useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  GitCompare,
  FileText,
  Calendar,
  Menu,
  X,
  Bell,
  Settings,
  LogOut,
  ChevronRight,
} from "lucide-react";

const cn = (...classes) => classes.filter(Boolean).join(" ");

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const menuItems = useMemo(
    () => [
      { path: "/", icon: LayoutDashboard, label: "Dashboard" },
      { path: "/bezerras", icon: Users, label: "Bezerras" },
      { path: "/comparativo", icon: GitCompare, label: "Comparativo" },
      { path: "/relatorios", icon: FileText, label: "Relatórios" },
      { path: "/calendario", icon: Calendar, label: "Calendário" },
    ],
    []
  );

  const currentLabel = useMemo(() => {
    const exact = menuItems.find((m) => m.path === location.pathname);
    if (exact) return exact.label;

    // fallback: tenta achar prefixo (pra rotas filhas)
    const parent = menuItems
      .filter((m) => m.path !== "/")
      .find((m) => location.pathname.startsWith(m.path + "/"));
    if (parent) return parent.label;

    // fallback genérico
    const clean = location.pathname
      .replace("/", "")
      .replace(/-/g, " ")
      .trim();
    if (!clean) return "Dashboard";
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  }, [location.pathname, menuItems]);

  const SidebarContent = ({ isMobile = false }) => (
    <aside
      className={cn(
        sidebarOpen ? "w-72" : "w-20",
        "bg-slate-900 border-r border-slate-800 transition-all duration-300 flex flex-col h-full"
      )}
    >
      <div className="p-6 flex items-center justify-between border-b border-slate-800">
        {sidebarOpen ? (
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20 shrink-0">
              <span className="text-xl font-bold text-white">B</span>
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-lg text-white leading-tight truncate">
                SmartCow
              </h1>
              <span className="text-xs text-cyan-400">Bezerras</span>
            </div>
          </div>
        ) : (
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto shadow-lg shadow-cyan-500/20">
            <span className="text-xl font-bold text-white">B</span>
          </div>
        )}

        {/* Toggle */}
        <button
          onClick={() => {
            if (isMobile) setMobileOpen(false);
            else setSidebarOpen((v) => !v);
          }}
          className="text-slate-400 hover:text-white transition-colors"
          type="button"
          aria-label={isMobile ? "Fechar menu" : "Alternar menu"}
        >
          {isMobile ? <X size={20} /> : sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <nav className="flex-1 py-6 px-3 space-y-1">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => isMobile && setMobileOpen(false)}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative",
                isActive
                  ? "bg-cyan-600 text-white shadow-lg shadow-cyan-900/20"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white",
                sidebarOpen ? "" : "justify-center"
              )
            }
            title={!sidebarOpen ? item.label : undefined}
          >
            <item.icon size={20} className="shrink-0" />
            {sidebarOpen && (
              <>
                <span className="font-medium flex-1 truncate">{item.label}</span>
                <ChevronRight
                  size={16}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                />
              </>
            )}

            {/* Tooltip quando colapsado */}
            {!sidebarOpen && !isMobile && (
              <div
                className={cn(
                  "absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded",
                  "opacity-0 group-hover:opacity-100 whitespace-nowrap z-[60]",
                  "pointer-events-none shadow-lg border border-slate-700"
                )}
              >
                {item.label}
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800 space-y-1">
        <button
          type="button"
          className={cn(
            "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors",
            sidebarOpen ? "" : "justify-center"
          )}
        >
          <Settings size={20} />
          {sidebarOpen && <span className="font-medium">Configurações</span>}
        </button>

        <button
          type="button"
          className={cn(
            "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-red-400 hover:bg-red-950/30 transition-colors",
            sidebarOpen ? "" : "justify-center"
          )}
        >
          <LogOut size={20} />
          {sidebarOpen && <span className="font-medium">Sair</span>}
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Sidebar Desktop */}
      <div className="hidden md:block">
        <SidebarContent />
      </div>

      {/* Sidebar Mobile (drawer) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-[85vw] max-w-[320px]">
            <SidebarContent isMobile />
          </div>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-slate-900/50 border-b border-slate-800 flex items-center justify-between px-4 md:px-6 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              type="button"
              className="md:hidden p-2 text-slate-400 hover:text-white"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu size={20} />
            </button>

            {/* Breadcrumb */}
            <div className="flex items-center text-sm text-slate-400">
              <span className="hover:text-white cursor-pointer">Home</span>
              <ChevronRight size={16} className="mx-2" />
              <span className="text-white capitalize">{currentLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              className="relative p-2 text-slate-400 hover:text-white transition-colors"
              aria-label="Notificações"
            >
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            </button>

            <div className="flex items-center gap-3 pl-4 border-l border-slate-800">
              <div className="text-right hidden md:block">
                <div className="text-sm font-medium text-white">Admin Fazenda</div>
                <div className="text-xs text-slate-500">Gestor Técnico</div>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-slate-700 to-slate-800 rounded-full border border-slate-600 flex items-center justify-center">
                <span className="text-cyan-400 font-bold">AF</span>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
};

export default Layout;
