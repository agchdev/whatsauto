"use client";

import { useEffect } from "react";
import { DEFAULT_PALETTE_KEY } from "../../constants";
import { applyPalette, loadStoredPalette, THEME_STORAGE_KEY } from "../../lib/theme";

export default function ThemeSync() {
  useEffect(() => {
    const storedKey = loadStoredPalette();
    applyPalette(storedKey);

    const handleStorage = (event) => {
      if (event.key !== THEME_STORAGE_KEY) return;
      const nextKey = event.newValue || DEFAULT_PALETTE_KEY;
      applyPalette(nextKey);
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return null;
}
