/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        // --- CORRECCIÓN AQUÍ ---
        // Añadimos el hostname de tu Supabase Storage a la lista de dominios permitidos.
        hostname: 'khqdqdepmgbdmumfdorv.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/analysis-images/**',
      },
    ],
  },
};

module.exports = nextConfig;