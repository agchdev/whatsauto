"use client";

import { useState } from "react";
import { NAV_ITEMS, PALETTES } from "../../constants";

const IconBase = ({ children, className }) => (
  <svg
    className={className}
    fill="none"
    height="24"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="1.6"
    viewBox="0 0 24 24"
    width="24"
  >
    {children}
  </svg>
);

const LogoIcon = ({ className }) => (
  <IconBase className={className}>
    <path d="M12 2l7 4v8l-7 4-7-4V6z" />
    <path d="M12 6l4 2.3v4.6L12 15l-4-2.1V8.3z" />
  </IconBase>
);

const ToggleIcon = ({ className }) => (
  <IconBase className={className}>
    <rect height="17" rx="3.5" width="17" x="3.5" y="3.5" />
    <path d="M9 4.5v15" />
  </IconBase>
);

const PanelIcon = ({ className }) => (
  <IconBase className={className}>
    <rect height="7" rx="1.5" width="7" x="3" y="3" />
    <rect height="7" rx="1.5" width="7" x="14" y="3" />
    <rect height="7" rx="1.5" width="7" x="3" y="14" />
    <rect height="7" rx="1.5" width="7" x="14" y="14" />
  </IconBase>
);

const TeamIcon = ({ className }) => (
  <IconBase className={className}>
    <circle cx="8" cy="9" r="3" />
    <circle cx="16" cy="9" r="3" />
    <path d="M2.5 20c1.4-3 4-4.6 6.5-4.6" />
    <path d="M21.5 20c-1.4-3-4-4.6-6.5-4.6" />
  </IconBase>
);

const ServicesIcon = ({ className }) => (
  <IconBase className={className}>
    <rect height="12" rx="2" width="16" x="4" y="7" />
    <path d="M9 7V5a3 3 0 0 1 6 0v2" />
  </IconBase>
);

const CalendarIcon = ({ className }) => (
  <IconBase className={className}>
    <rect height="16" rx="2" width="18" x="3" y="5" />
    <path d="M3 9h18" />
    <path d="M8 3v4" />
    <path d="M16 3v4" />
  </IconBase>
);

const ClientsIcon = ({ className }) => (
  <IconBase className={className}>
    <circle cx="12" cy="9" r="3" />
    <path d="M4 20c1.8-3.3 5-5.2 8-5.2s6.2 1.9 8 5.2" />
  </IconBase>
);

const UserIcon = ({ className }) => (
  <IconBase className={className}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M4 20c1.8-3.4 5-5.5 8-5.5s6.2 2.1 8 5.5" />
  </IconBase>
);

const LogoutIcon = ({ className }) => (
  <IconBase className={className}>
    <path d="M16 17l4-4-4-4" />
    <path d="M20 13H9" />
    <path d="M12 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h5a2 2 0 0 0 2-2v-2" />
  </IconBase>
);

const SettingsIcon = ({ className }) => (
  <IconBase className={className}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3 1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8 1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.5 1z" />
  </IconBase>
);

const ChevronIcon = ({ className }) => (
  <IconBase className={className}>
    <path d="M6 9l6 6 6-6" />
  </IconBase>
);

const ICONS_BY_KEY = {
  panel: PanelIcon,
  empleados: TeamIcon,
  servicios: ServicesIcon,
  citas: CalendarIcon,
  clientes: ClientsIcon,
};

export default function Sidebar({
  activeKey = "panel",
  employeeName,
  employeeRole,
  employeeEmail,
  isExpanded,
  onToggle,
  onPaletteChange,
  paletteKey,
  onSignOut,
}) {
  const containerPadding = isExpanded ? "p-6" : "px-4 py-6";
  const widthClass = isExpanded ? "w-72" : "w-20";
  const [settingsOpen, setSettingsOpen] = useState(true);

  const handleToggleSettings = () => {
    setSettingsOpen((prev) => !prev);
  };

  return (
    <aside
      className={`fixed left-0 top-0 z-40 flex h-full flex-col rounded-none rounded-r-3xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-[0_24px_70px_-60px_rgba(0,0,0,0.9)] transition-[width] duration-300 ${widthClass} ${containerPadding}`}
    >
      <div
        className={`flex items-center justify-between gap-3 ${
          isExpanded ? "" : "flex-col"
        }`}
      >
        <div className={`flex items-center gap-3 ${isExpanded ? "" : "flex-col"}`}>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-strong)]">
            <LogoIcon className="h-5 w-5 text-[color:var(--supabase-green)]" />
          </div>
          {isExpanded && (
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                WhatsAuto
              </p>
              <p className="mt-1 text-lg font-semibold text-[color:var(--foreground)]">
                Panel
              </p>
            </div>
          )}
        </div>
        <button
          aria-label={isExpanded ? "Contraer menu" : "Expandir menu"}
          className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-2 text-[color:var(--muted-strong)] transition hover:border-[color:var(--supabase-green)] hover:text-[color:var(--supabase-green)]"
          onClick={onToggle}
          type="button"
        >
          <ToggleIcon className="h-5 w-5" />
        </button>
      </div>

      <nav
        className={`mt-8 flex flex-1 flex-col gap-2 overflow-y-auto ${
          isExpanded ? "" : "items-center"
        }`}
      >
        {NAV_ITEMS.map((item) => {
          const isActive = item.key === activeKey;
          const ItemIcon = ICONS_BY_KEY[item.key] || PanelIcon;
          return (
            <button
              key={item.key}
              aria-current={isActive ? "page" : undefined}
              className={`flex w-full items-center rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                isExpanded ? "justify-between" : "justify-center"
              } ${
                isActive
                  ? "bg-[color:var(--surface-strong)] text-[color:var(--foreground)] shadow-[0_18px_40px_-30px_rgba(0,0,0,0.8)]"
                  : "text-[color:var(--muted)] hover:bg-[color:var(--surface-muted)] hover:text-[color:var(--muted-strong)]"
              }`}
              title={!isExpanded ? item.label : undefined}
              type="button"
            >
              <span className={`flex items-center gap-3 ${isExpanded ? "" : "justify-center"}`}>
                <ItemIcon className="h-5 w-5" />
                {isExpanded && <span>{item.label}</span>}
              </span>
              {isActive && isExpanded && (
                <span className="h-2 w-2 rounded-full bg-[color:var(--supabase-green)] shadow-[0_0_12px_rgba(62,207,142,0.9)]" />
              )}
            </button>
          );
        })}
      </nav>

      <div className="mt-8 border-t border-[color:var(--border)] pt-6">
        <div className={`${isExpanded ? "" : "flex flex-col items-center"}`}>
          <button
            aria-expanded={settingsOpen}
            className={`flex w-full items-center rounded-2xl border border-[color:var(--border)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--supabase-green)] hover:text-[color:var(--supabase-green)] ${
              isExpanded ? "justify-between" : "justify-center"
            }`}
            onClick={handleToggleSettings}
            title="Ajustes"
            type="button"
          >
            <span className="flex items-center gap-2">
              <SettingsIcon className="h-4 w-4" />
              {isExpanded && <span>Ajustes</span>}
            </span>
            {isExpanded && (
              <ChevronIcon
                className={`h-4 w-4 transition ${
                  settingsOpen ? "rotate-180" : ""
                }`}
              />
            )}
          </button>

          {settingsOpen && (
            <div
              className={`mt-4 flex flex-wrap gap-3 ${
                isExpanded ? "" : "flex-col items-center"
              }`}
            >
              {isExpanded && (
                <p className="w-full text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                  Paletas
                </p>
              )}
              {PALETTES.map((palette) => {
                const isActive = palette.key === paletteKey;
                return (
                  <button
                    key={palette.key}
                    className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                      isExpanded ? "" : "justify-center px-2"
                    } ${
                      isActive
                        ? "border-[color:var(--supabase-green)] text-[color:var(--supabase-green)]"
                        : "border-[color:var(--border)] text-[color:var(--muted-strong)] hover:border-[color:var(--supabase-green)] hover:text-[color:var(--supabase-green)]"
                    }`}
                    onClick={() => onPaletteChange(palette.key)}
                    title={palette.label}
                    type="button"
                  >
                    <span
                      className={`h-3 w-3 rounded-full ${
                        isExpanded ? "" : "h-4 w-4"
                      }`}
                      style={{ backgroundColor: palette.accent }}
                    />
                    {isExpanded && <span>{palette.label}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="mt-auto border-t border-[color:var(--border)] pt-6">
        {isExpanded ? (
          <div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[color:var(--foreground)]">
                  {employeeName}
                </p>
                <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
                  {employeeRole}
                </p>
              </div>
              <button
                className="rounded-full border border-[color:rgb(var(--supabase-green-rgb)/0.6)] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--supabase-green)] transition hover:border-[color:var(--supabase-green)] hover:text-[color:var(--supabase-green-bright)]"
                onClick={onSignOut}
                type="button"
              >
                Salir
              </button>
            </div>
            <p className="mt-3 text-xs text-[color:var(--muted)]">{employeeEmail}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <button
              aria-label={employeeName}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] text-[color:var(--muted-strong)]"
              title={employeeName}
              type="button"
            >
              <UserIcon className="h-5 w-5" />
            </button>
            <button
              aria-label="Salir"
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:rgb(var(--supabase-green-rgb)/0.5)] bg-[color:var(--surface-strong)] text-[color:var(--supabase-green)] transition hover:border-[color:var(--supabase-green)] hover:text-[color:var(--supabase-green-bright)]"
              onClick={onSignOut}
              title="Salir"
              type="button"
            >
              <LogoutIcon className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
