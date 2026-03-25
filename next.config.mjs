/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: "/personal-design",
        destination: "/design-archive",
        permanent: true,
      },
      {
        source: "/personal-design/2019-2024",
        destination: "/design-archive/2019-2024",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
