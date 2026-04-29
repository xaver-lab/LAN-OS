// Design Tokens — extrahiert aus LAN OS.html Mockup.
// Drei Themes: dark-arcade (default), synthwave, arctic.

export const themes = {
  "dark-arcade": {
    "--neon": "#39ff6e",
    "--neon-dim": "#1aff5522",
    "--cyan": "#00e5ff",
    "--magenta": "#ff2d6b",
    "--amber": "#ffb830",
    "--bg": "#080a14",
    "--bg2": "#0d1022",
    "--bg3": "#121730",
    "--border": "#1e2540",
    "--text": "#e8eaf6",
    "--muted": "#5c6285",
    "--on-neon": "#080a14",
  },
  synthwave: {
    "--neon": "#f72fff",
    "--neon-dim": "#f72fff22",
    "--cyan": "#00f5d4",
    "--magenta": "#ff2d6b",
    "--amber": "#ffe156",
    "--bg": "#0a0015",
    "--bg2": "#130025",
    "--bg3": "#1a0035",
    "--border": "#2d004d",
    "--text": "#f0e6ff",
    "--muted": "#7040a0",
    "--on-neon": "#0a0015",
  },
  arctic: {
    "--neon": "#00e5ff",
    "--neon-dim": "#00e5ff22",
    "--cyan": "#80ffea",
    "--magenta": "#0070f3",
    "--amber": "#ffd60a",
    "--bg": "#04111a",
    "--bg2": "#071e2e",
    "--bg3": "#0b2840",
    "--border": "#0e3050",
    "--text": "#e0f4ff",
    "--muted": "#3a6080",
    "--on-neon": "#04111a",
  },
} as const;

export type ThemeName = keyof typeof themes;

export const fontStack = {
  display: "'Rajdhani', 'Segoe UI', sans-serif",
  mono: "'JetBrains Mono', 'Cascadia Code', monospace",
};

export const spacing = {
  xs: "4px",
  sm: "8px",
  md: "16px",
  lg: "24px",
  xl: "40px",
};

export const radius = {
  sm: "4px",
  md: "8px",
  lg: "12px",
  pill: "9999px",
};
