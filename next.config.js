/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['edfcwbtzcnfosiiymbqg.supabase.co'],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't resolve server-side modules on the client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
        buffer: require.resolve('buffer'),
      };
    }
    return config;
  },
};

module.exports = nextConfig;