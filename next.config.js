/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    // Remove the unrecognized option
    experimental: {
      // Remove excludeDefaultMomentLocales as it's not recognized
    },
    eslint: {
      ignoreDuringBuilds: true,
    },
    typescript: {
      ignoreBuildErrors: true,
    },
    images: {
      unoptimized: true,
    },
  }
  
  module.exports = nextConfig
  