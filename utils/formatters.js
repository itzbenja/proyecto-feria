/**
 * Formatea un número como moneda en formato español
 * Usa punto (.) para separador de miles y coma (,) para decimales
 * @param {number} value - El valor numérico a formatear
 * @returns {string} - El valor formateado (ej: "2.000" o "1.000.000" o "2.000,50")
 */
export const formatCurrency = (value) => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }

  const num = Number(value);

  // Si es un número entero, no mostrar decimales, solo agregar separadores de miles
  if (num % 1 === 0) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  // Si tiene decimales, formatear con máximo 2 decimales
  const formatted = num.toFixed(2);
  const partes = formatted.split('.');
  let parteEntera = partes[0];
  const parteDecimal = partes[1];

  // Agregar separadores de miles (puntos) a la parte entera
  parteEntera = parteEntera.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  // Eliminar ceros finales de la parte decimal
  const decimalSinCeros = parteDecimal.replace(/0+$/, '');

  // Si la parte decimal tiene contenido después de eliminar ceros, mostrarla con COMA
  if (decimalSinCeros && decimalSinCeros.length > 0) {
    return `${parteEntera},${decimalSinCeros}`;
  }

  return parteEntera;
};

/**
 * Formatea un número con prefijo de moneda ($)
 * @param {number} value - El valor numérico a formatear
 * @returns {string} - El valor formateado con $ (ej: "$2.000" o "$1.000.000" o "$2.000,50")
 */
export const formatMoney = (value) => {
  return `$${formatCurrency(value)}`;
};

/**
 * Convierte un string con formato español (ej: "1.000.000,50") a número
 * @param {string} value - El valor formateado como string
 * @returns {number} - El valor numérico
 */
export const parseCurrency = (value) => {
  if (!value || typeof value !== 'string') return 0;

  // Eliminar puntos (separadores de miles) y reemplazar coma por punto (decimal)
  const cleaned = value.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(cleaned);

  return isNaN(num) ? 0 : num;
};

/**
 * Formatea un valor de input mientras el usuario escribe
 * Permite solo números y formatea con separadores de miles
 * @param {string} value - El valor actual del input
 * @returns {string} - El valor formateado
 */
export const formatInputCurrency = (value) => {
  if (!value) return '';

  // Eliminar todo excepto números
  const onlyNumbers = value.replace(/[^\d]/g, '');

  if (!onlyNumbers) return '';

  // Convertir a número y formatear
  const num = parseInt(onlyNumbers, 10);

  // Agregar separadores de miles
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};
