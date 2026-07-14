/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/subscribe",
        destination: "/pack-territoire",
        permanent: true,
      },
      {
        source: "/dashboard",
        destination: "/mon-espace",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
