import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { useColorScheme } from 'react-native';

const THEME_KEY = 'app_theme';

/**
 * Temas de la aplicación
 */
export const themes = {
  light: {
    name: 'Claro',
    colors: {
      primary: '#16a34a',
      secondary: '#3b82f6',
      background: '#f0fdf4',
      surface: '#ffffff',
      text: '#065f46',
      textSecondary: '#64748b',
      border: '#d1fae5',
      error: '#ef4444',
      success: '#16a34a',
      warning: '#f59e0b',
      card: '#ffffff',
      cardBorder: '#e6e6e6'
    }
  },
  dark: {
    name: 'Oscuro',
    colors: {
      primary: '#22c55e',
      secondary: '#60a5fa',
      background: '#0f172a',
      surface: '#1e293b',
      text: '#f1f5f9',
      textSecondary: '#94a3b8',
      border: '#334155',
      error: '#f87171',
      success: '#22c55e',
      warning: '#fbbf24',
      card: '#1e293b',
      cardBorder: '#334155'
    }
  }
};

/**
 * Servicio de gestión de temas
 */
export const themeService = {
  /**
   * Obtener tema actual
   */
  async getTheme() {
    try {
      const themeStr = await AsyncStorage.getItem(THEME_KEY);
      if (themeStr) {
        return JSON.parse(themeStr);
      }
      
      // Usar tema del sistema por defecto
      const systemTheme = useColorScheme();
      return systemTheme === 'dark' ? 'dark' : 'light';
    } catch (error) {
      console.error('Error al obtener tema:', error);
      return 'light';
    }
  },

  /**
   * Establecer tema
   */
  async setTheme(themeName) {
    try {
      if (!themes[themeName]) {
        throw new Error(`Tema "${themeName}" no existe`);
      }
      
      await AsyncStorage.setItem(THEME_KEY, JSON.stringify(themeName));
      return themeName;
    } catch (error) {
      console.error('Error al establecer tema:', error);
      throw error;
    }
  },

  /**
   * Alternar entre claro y oscuro
   */
  async toggleTheme() {
    try {
      const currentTheme = await this.getTheme();
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      return await this.setTheme(newTheme);
    } catch (error) {
      console.error('Error al alternar tema:', error);
      throw error;
    }
  },

  /**
   * Obtener colores del tema actual
   */
  async getColors() {
    try {
      const themeName = await this.getTheme();
      return themes[themeName].colors;
    } catch (error) {
      console.error('Error al obtener colores:', error);
      return themes.light.colors;
    }
  }
};

/**
 * Hook para usar tema en componentes
 */
export const useTheme = () => {
  const [theme, setThemeState] = React.useState('light');
  const [colors, setColors] = React.useState(themes.light.colors);

  React.useEffect(() => {
    const loadTheme = async () => {
      const currentTheme = await themeService.getTheme();
      setThemeState(currentTheme);
      setColors(themes[currentTheme].colors);
    };
    loadTheme();
  }, []);

  const toggleTheme = async () => {
    const newTheme = await themeService.toggleTheme();
    setThemeState(newTheme);
    setColors(themes[newTheme].colors);
  };

  return { theme, colors, toggleTheme };
};

