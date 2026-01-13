import { DEFAULT_PALETTE_KEY, PALETTES } from "../constants";

export const THEME_STORAGE_KEY = "whatsauto.palette";

const getPaletteByKey = (paletteKey) => {
  const fallback =
    PALETTES.find((palette) => palette.key === DEFAULT_PALETTE_KEY) || PALETTES[0];
  if (!paletteKey) return fallback;
  return PALETTES.find((palette) => palette.key === paletteKey) || fallback;
};

export const applyPalette = (paletteKey) => {
  if (typeof document === "undefined") return DEFAULT_PALETTE_KEY;

  const selected = getPaletteByKey(paletteKey);
  const root = document.documentElement;

  root.style.setProperty("--supabase-green", selected.accent);
  root.style.setProperty("--supabase-green-rgb", selected.accentRgb);
  root.style.setProperty("--supabase-green-dark", selected.accentDark);
  root.style.setProperty("--supabase-green-bright", selected.accentBright);
  root.style.setProperty("--supabase-mist", selected.glow);
  root.style.setProperty("--theme-glow", selected.glow);
  root.style.setProperty("--theme-base", selected.base);
  root.style.setProperty("--theme-base-rgb", selected.baseRgb);
  root.style.setProperty("--theme-dot-rgb", selected.accentRgb);
  root.style.setProperty("--background", selected.background);
  root.style.setProperty("--foreground", selected.foreground);
  root.style.setProperty("--surface", selected.surface);
  root.style.setProperty("--surface-strong", selected.surfaceStrong);
  root.style.setProperty("--surface-muted", selected.surfaceMuted);
  root.style.setProperty("--border", selected.border);
  root.style.setProperty("--muted", selected.muted);
  root.style.setProperty("--muted-strong", selected.mutedStrong);

  return selected.key;
};

export const loadStoredPalette = () => {
  if (typeof window === "undefined") return DEFAULT_PALETTE_KEY;
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored || DEFAULT_PALETTE_KEY;
};

export const persistPalette = (paletteKey) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(THEME_STORAGE_KEY, paletteKey);
};
