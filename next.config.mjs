/** @type {import('next').NextConfig} */
const nextConfig = {
  // Export estatico: Netlify sirve HTML plano y toda la logica de servidor
  // vive en Netlify Functions. Menos piezas moviles, build mas rapido,
  // y cero riesgo de que el runtime de Next consuma invocaciones.
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
};
export default nextConfig;
