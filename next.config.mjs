import { withPlausibleProxy } from "next-plausible";

const PLAUSIBLE_SCRIPT_SRC =
  process.env.NEXT_PUBLIC_PLAUSIBLE_SRC?.trim() ||
  "https://plausible.io/js/pa-ovrHkV6d0xXFSasjvDwiU.js";

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
    ];
  },
};

export default withPlausibleProxy({ src: PLAUSIBLE_SCRIPT_SRC })(nextConfig);
