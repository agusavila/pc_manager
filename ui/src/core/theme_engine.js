/**
 * PC Manager Core - Theme Engine
 * Version: 0.0.1-alpha
 * 
 * Gestiona el sistema de temas dinámico Material Expressive,
 * aplicando variables CSS semánticas para modos Oscuro/Claro y paleta de acentos.
 */

export const ACCENT_PALETTE = [
  { id: 'blue', name: 'Azul Cósmico', hex: '#3b82f6', hover: '#2563eb' },
  { id: 'purple', name: 'Púrpura Eléctrico', hex: '#8b5cf6', hover: '#7c3aed' },
  { id: 'emerald', name: 'Verde Esmeralda', hex: '#10b981', hover: '#059669' },
  { id: 'amber', name: 'Ámbar Cálido', hex: '#f59e0b', hover: '#d97706' },
  { id: 'crimson', name: 'Rojo Carmesí', hex: '#ef4444', hover: '#dc2626' },
  { id: 'pink', name: 'Rosa Neón', hex: '#ec4899', hover: '#db2777' },
  { id: 'cyan', name: 'Cian Glacial', hex: '#06b6d4', hover: '#0891b2' },
  { id: 'orange', name: 'Naranja Vulcano', hex: '#f97316', hover: '#ea580c' },
  { id: 'teal', name: 'Menta Fresca', hex: '#14b8a6', hover: '#0d9488' },
  { id: 'indigo', name: 'Índigo Profundo', hex: '#6366f1', hover: '#4f46e5' }
];

export const THEME_PRESETS = {
  dark: {
    'carbon': {
      name: 'Carbon Black',
      bgPrimary: '#0f1115',
      bgSurface: '#161922',
      bgElevated: '#1e2230',
      textPrimary: '#f1f5f9',
      textSecondary: '#94a3b8',
      textMuted: '#64748b',
      borderSubtle: '#262b3d'
    },
    'deep-dark': {
      name: 'Oscuro Profundo',
      bgPrimary: '#050507',
      bgSurface: '#0d0e14',
      bgElevated: '#151722',
      textPrimary: '#f8fafc',
      textSecondary: '#94a3b8',
      textMuted: '#64748b',
      borderSubtle: '#1e2130'
    },
    'midnight': {
      name: 'Midnight Navy',
      bgPrimary: '#0a0e1a',
      bgSurface: '#111827',
      bgElevated: '#1f2937',
      textPrimary: '#f3f4f6',
      textSecondary: '#9ca3af',
      textMuted: '#6b7280',
      borderSubtle: '#2a3449'
    },
    'cyberpunk': {
      name: 'Cyberpunk Dark',
      bgPrimary: '#0c0714',
      bgSurface: '#170f26',
      bgElevated: '#24173d',
      textPrimary: '#faf5ff',
      textSecondary: '#c084fc',
      textMuted: '#8957e5',
      borderSubtle: '#3b2564'
    }
  },
  light: {
    'pure-white': {
      name: 'Blanco Puro',
      bgPrimary: '#f8fafc',
      bgSurface: '#ffffff',
      bgElevated: '#f1f5f9',
      textPrimary: '#0f172a',
      textSecondary: '#475569',
      textMuted: '#94a3b8',
      borderSubtle: '#e2e8f0'
    },
    'soft-blue': {
      name: 'Azul Suave',
      bgPrimary: '#f0f4f8',
      bgSurface: '#ffffff',
      bgElevated: '#e2e8f0',
      textPrimary: '#1e293b',
      textSecondary: '#475569',
      textMuted: '#64748b',
      borderSubtle: '#cbd5e1'
    },
    'platinum': {
      name: 'Gris Platino',
      bgPrimary: '#eceff1',
      bgSurface: '#f8fafc',
      bgElevated: '#e2e8f0',
      textPrimary: '#1c1e21',
      textSecondary: '#52575c',
      textMuted: '#8b929a',
      borderSubtle: '#cfd8dc'
    },
    'soft-mint': {
      name: 'Menta Suave',
      bgPrimary: '#f0fdf4',
      bgSurface: '#ffffff',
      bgElevated: '#dcfce7',
      textPrimary: '#064e3b',
      textSecondary: '#047857',
      textMuted: '#6ee7b7',
      borderSubtle: '#bbf7d0'
    }
  }
};

export class ThemeEngine {
  /**
   * @param {import('./event_bus.js').EventBus} eventBus
   */
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.currentMode = 'dark';
    this.currentStyle = 'carbon';
    this.currentAccent = 'blue';
  }

  /**
   * Inicializa el motor de temas con la configuración guardada o por defecto.
   */
  init(savedConfig = null) {
    if (savedConfig) {
      if (savedConfig.mode) this.currentMode = savedConfig.mode;
      if (savedConfig.style) this.currentStyle = savedConfig.style;
      if (savedConfig.accent) this.currentAccent = savedConfig.accent;
    }
    this.applyTheme();
  }

  /**
   * Cambia el modo y estilo temático.
   * @param {'dark'|'light'} mode
   * @param {string} style
   */
  setTheme(mode, style) {
    if (!THEME_PRESETS[mode]) {
      console.warn(`[ThemeEngine] Modo '${mode}' desconocido. Usando 'dark'.`);
      mode = 'dark';
    }
    const availableStyles = THEME_PRESETS[mode];
    if (!availableStyles[style]) {
      style = Object.keys(availableStyles)[0];
    }

    this.currentMode = mode;
    this.currentStyle = style;
    this.applyTheme();
  }

  /**
   * Cambia el color de acento primario.
   * @param {string} accentId
   */
  setAccent(accentId) {
    const found = ACCENT_PALETTE.find(a => a.id === accentId);
    if (!found) {
      console.warn(`[ThemeEngine] Acento '${accentId}' no encontrado.`);
      return;
    }
    this.currentAccent = accentId;
    this.applyTheme();
  }

  /**
   * Aplica las variables semánticas a document.documentElement.
   */
  applyTheme() {
    const preset = THEME_PRESETS[this.currentMode]?.[this.currentStyle] || THEME_PRESETS.dark.carbon;
    const accent = ACCENT_PALETTE.find(a => a.id === this.currentAccent) || ACCENT_PALETTE[0];

    if (typeof document !== 'undefined' && document.documentElement) {
      const root = document.documentElement;
      root.style.setProperty('--bg-primary', preset.bgPrimary);
      root.style.setProperty('--bg-surface', preset.bgSurface);
      root.style.setProperty('--bg-elevated', preset.bgElevated);
      root.style.setProperty('--text-primary', preset.textPrimary);
      root.style.setProperty('--text-secondary', preset.textSecondary);
      root.style.setProperty('--text-muted', preset.textMuted);
      root.style.setProperty('--border-subtle', preset.borderSubtle);

      root.style.setProperty('--accent-primary', accent.hex);
      root.style.setProperty('--accent-hover', accent.hover);
      root.style.setProperty('--accent-glow', `${accent.hex}33`);

      root.setAttribute('data-theme-mode', this.currentMode);
      root.setAttribute('data-theme-style', this.currentStyle);
      root.setAttribute('data-accent', this.currentAccent);
    }

    if (this.eventBus) {
      this.eventBus.publish('theme.changed', {
        mode: this.currentMode,
        style: this.currentStyle,
        accent: this.currentAccent
      });
    }
  }

  /**
   * Obtiene la configuración activa.
   */
  getConfig() {
    return {
      mode: this.currentMode,
      style: this.currentStyle,
      accent: this.currentAccent
    };
  }
}
