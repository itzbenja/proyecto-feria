/* eslint-env node */
const sharp = require('sharp');
const path = require('path');

// Obtener __dirname de forma compatible
const __dirname = path.dirname(require.resolve('./convert-logo.js'));

const inputPath = path.join(__dirname, '../assets/images/logo.jpg');
const outputPath = path.join(__dirname, '../assets/images/icon.png');
const adaptiveIconPath = path.join(__dirname, '../assets/images/adaptive-icon.png');

async function convertLogo() {
  try {
    console.log('🔄 Convirtiendo logo.jpg a PNG cuadrado...');
    
    // Tamaño estándar para iconos de Expo: 1024x1024
    const size = 1024;
    
    // Leer la imagen y convertir a PNG cuadrado
    await sharp(inputPath)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 22, g: 163, b: 74, alpha: 1 } // Color verde #16a34a
      })
      .png()
      .toFile(outputPath);
    
    console.log('✅ Icono principal creado:', outputPath);
    
    // Crear también el adaptive icon (mismo proceso)
    await sharp(inputPath)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 22, g: 163, b: 74, alpha: 1 } // Color verde #16a34a
      })
      .png()
      .toFile(adaptiveIconPath);
    
    console.log('✅ Icono adaptativo creado:', adaptiveIconPath);
    console.log('✅ Conversión completada exitosamente!');
    
  } catch (error) {
    console.error('❌ Error al convertir el logo:', error);
    process.exit(1);
  }
}

convertLogo();

