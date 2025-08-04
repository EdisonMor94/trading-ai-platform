/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    '@tailwindcss/postcss': {}, // <-- LA LÍNEA CORREGIDA
    'autoprefixer': {},
  },
};

export default config;