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
      {
        source: "/onboarding",
        destination: "/leads",
        permanent: true,
      },
      {
        source: "/favicon.png",
        destination: "/icon",
        permanent: true,
      },
      {
        source: "/favicon.ico",
        destination: "/icon",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
