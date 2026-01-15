/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/:tipo(confirmar|eliminar|espera|modificar)/:token",
        destination: "/confirmaciones/:tipo/:token",
      },
    ];
  },
};

export default nextConfig;
