import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';

const USER_KEY = 'current_user';
const PERMISSIONS_KEY = 'user_permissions';

/**
 * Servicio de autenticación y gestión de usuarios
 */
export const authService = {
  /**
   * Iniciar sesión
   */
  async login(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      // Guardar usuario
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
      
      return data;
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      throw error;
    }
  },

  /**
   * Registrar nuevo usuario
   */
  async register(email, password, userData = {}) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error al registrar:', error);
      throw error;
    }
  },

  /**
   * Cerrar sesión
   */
  async logout() {
    try {
      await supabase.auth.signOut();
      await AsyncStorage.removeItem(USER_KEY);
      await AsyncStorage.removeItem(PERMISSIONS_KEY);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      throw error;
    }
  },

  /**
   * Obtener usuario actual
   */
  async getCurrentUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
        return user;
      }

      // Intentar desde AsyncStorage
      const userStr = await AsyncStorage.getItem(USER_KEY);
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Error al obtener usuario:', error);
      return null;
    }
  },

  /**
   * Verificar si hay sesión activa
   */
  async isAuthenticated() {
    try {
      const user = await this.getCurrentUser();
      return !!user;
    } catch (error) {
      return false;
    }
  },

  /**
   * Obtener permisos del usuario
   */
  async getPermissions() {
    try {
      const user = await this.getCurrentUser();
      if (!user) return [];

      // Obtener permisos desde metadata del usuario
      const permissions = user.user_metadata?.permissions || [];
      
      // Guardar en AsyncStorage para acceso rápido
      await AsyncStorage.setItem(PERMISSIONS_KEY, JSON.stringify(permissions));
      
      return permissions;
    } catch (error) {
      console.error('Error al obtener permisos:', error);
      return [];
    }
  },

  /**
   * Verificar si usuario tiene permiso
   */
  async hasPermission(permission) {
    try {
      const permissions = await this.getPermissions();
      return permissions.includes(permission) || permissions.includes('admin');
    } catch (error) {
      return false;
    }
  },

  /**
   * Obtener rol del usuario
   */
  async getUserRole() {
    try {
      const user = await this.getCurrentUser();
      return user?.user_metadata?.role || 'vendedor';
    } catch (error) {
      return 'vendedor';
    }
  }
};

/**
 * Roles y permisos predefinidos
 */
export const ROLES = {
  ADMIN: {
    name: 'Administrador',
    permissions: ['admin', 'crear_venta', 'editar_venta', 'eliminar_venta', 'ver_estadisticas', 'exportar', 'gestionar_usuarios']
  },
  VENDEDOR: {
    name: 'Vendedor',
    permissions: ['crear_venta', 'editar_venta', 'ver_estadisticas']
  },
  CAJERO: {
    name: 'Cajero',
    permissions: ['crear_venta', 'ver_estadisticas']
  }
};














