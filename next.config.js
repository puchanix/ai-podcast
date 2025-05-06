// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config, { isServer }) => {
      if (isServer) {
        // Exclude node built-ins (e.g. node:crypto) from server bundle
        config.externals = config.externals || [];
        config.externals.push(/^node:.*/);
        // Exclude redis module from bundling so it's required at runtime
        config.externals.push('redis');
      }
      return config;
    }
  };
  module.exports = nextConfig;
  