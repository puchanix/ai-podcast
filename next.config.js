// next.config.js
const webpack = require('webpack');

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Ignore all "node:" imports (e.g. node:crypto) during bundling
    config.plugins.push(
      new webpack.IgnorePlugin({ resourceRegExp: /^node:/ })
    );

    if (isServer) {
      // Exclude redis from server bundle so it's required at runtime
      config.externals = config.externals || [];
      config.externals.push('redis');
      // Treat other node built-ins as externals
      config.externals.push((context, request, callback) => {
        if (/^node:.*/.test(request)) {
          return callback(null, `commonjs ${request}`);
        }
        callback();
      });
    } else {
      // On client, fallback node built-ins to false
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: false,
        stream: false,
        fs: false,
        path: false,
      };
    }

    return config;
  },
};

module.exports = nextConfig;
