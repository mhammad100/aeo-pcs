/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  transpilePackages: ["@aeo-pcs/shared"],
};

module.exports = nextConfig;
