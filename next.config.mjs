/** @type {import('next').NextConfig} */
import MiniCssExtractPlugin from 'mini-css-extract-plugin';

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config) => {
    // Add plugin only if not already present
    if (!config.plugins.find(plugin => plugin.constructor.name === 'MiniCssExtractPlugin')) {
      config.plugins.push(new MiniCssExtractPlugin());
    }

    return config;
  },
};

export default nextConfig;
