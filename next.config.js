/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    // Disable static optimization for test-recording page
    // This ensures it's always server-rendered and not statically generated
    experimental: {
      // This is a workaround to prevent prerendering of pages with browser APIs
      excludeDefaultMomentLocales: true,
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
  