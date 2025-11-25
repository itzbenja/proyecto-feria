import AsyncStorage from '@react-native-async-storage/async-storage';

const PRODUCTOS_KEY = 'catalogo_productos';
const CATEGORIAS_KEY = 'categorias_productos';

/**
 * Servicio de gestión de productos y catálogo
 */
export const productosService = {
  /**
   * Obtener todos los productos
   */
  async getProductos() {
    try {
      const productosStr = await AsyncStorage.getItem(PRODUCTOS_KEY);
      return productosStr ? JSON.parse(productosStr) : [];
    } catch (error) {
      console.error('Error al obtener productos:', error);
      return [];
    }
  },

  /**
   * Guardar productos
   */
  async saveProductos(productos) {
    try {
      await AsyncStorage.setItem(PRODUCTOS_KEY, JSON.stringify(productos));
    } catch (error) {
      console.error('Error al guardar productos:', error);
      throw error;
    }
  },

  /**
   * Agregar producto
   */
  async agregarProducto(producto) {
    try {
      const productos = await this.getProductos();
      const nuevoProducto = {
        id: `prod_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        ...producto,
        fechaCreacion: new Date().toISOString(),
        fechaActualizacion: new Date().toISOString()
      };
      
      productos.push(nuevoProducto);
      await this.saveProductos(productos);
      return nuevoProducto;
    } catch (error) {
      console.error('Error al agregar producto:', error);
      throw error;
    }
  },

  /**
   * Actualizar producto
   */
  async actualizarProducto(id, cambios) {
    try {
      const productos = await this.getProductos();
      const index = productos.findIndex(p => p.id === id);
      
      if (index === -1) {
        throw new Error('Producto no encontrado');
      }

      productos[index] = {
        ...productos[index],
        ...cambios,
        fechaActualizacion: new Date().toISOString()
      };
      
      await this.saveProductos(productos);
      return productos[index];
    } catch (error) {
      console.error('Error al actualizar producto:', error);
      throw error;
    }
  },

  /**
   * Eliminar producto
   */
  async eliminarProducto(id) {
    try {
      const productos = await this.getProductos();
      const filtrados = productos.filter(p => p.id !== id);
      await this.saveProductos(filtrados);
      return true;
    } catch (error) {
      console.error('Error al eliminar producto:', error);
      throw error;
    }
  },

  /**
   * Buscar productos
   */
  async buscarProductos(query) {
    try {
      const productos = await this.getProductos();
      if (!query || !query.trim()) return productos;

      const queryLower = query.toLowerCase().trim();
      return productos.filter(p => 
        p.nombre.toLowerCase().includes(queryLower) ||
        (p.descripcion && p.descripcion.toLowerCase().includes(queryLower)) ||
        (p.categoria && p.categoria.toLowerCase().includes(queryLower))
      );
    } catch (error) {
      console.error('Error al buscar productos:', error);
      return [];
    }
  },

  /**
   * Obtener productos por categoría
   */
  async getProductosPorCategoria(categoria) {
    try {
      const productos = await this.getProductos();
      return productos.filter(p => p.categoria === categoria);
    } catch (error) {
      console.error('Error al obtener productos por categoría:', error);
      return [];
    }
  },

  /**
   * Obtener todas las categorías
   */
  async getCategorias() {
    try {
      const categoriasStr = await AsyncStorage.getItem(CATEGORIAS_KEY);
      const categorias = categoriasStr ? JSON.parse(categoriasStr) : [];
      
      // Si no hay categorías guardadas, extraer de productos
      if (categorias.length === 0) {
        const productos = await this.getProductos();
        const categoriasUnicas = [...new Set(productos.map(p => p.categoria).filter(Boolean))];
        await AsyncStorage.setItem(CATEGORIAS_KEY, JSON.stringify(categoriasUnicas));
        return categoriasUnicas;
      }
      
      return categorias;
    } catch (error) {
      console.error('Error al obtener categorías:', error);
      return [];
    }
  },

  /**
   * Agregar categoría
   */
  async agregarCategoria(categoria) {
    try {
      const categorias = await this.getCategorias();
      if (!categorias.includes(categoria)) {
        categorias.push(categoria);
        await AsyncStorage.setItem(CATEGORIAS_KEY, JSON.stringify(categorias));
      }
      return categorias;
    } catch (error) {
      console.error('Error al agregar categoría:', error);
      throw error;
    }
  },

  /**
   * Obtener producto por ID
   */
  async getProductoPorId(id) {
    try {
      const productos = await this.getProductos();
      return productos.find(p => p.id === id);
    } catch (error) {
      console.error('Error al obtener producto:', error);
      return null;
    }
  }
};














