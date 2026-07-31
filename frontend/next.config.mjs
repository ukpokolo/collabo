/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/api/:path*`,
      },
      {
        source: '/broadcasting/auth',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/broadcasting/auth`,
      },
      {
        source: '/sanctum/csrf-cookie',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/sanctum/csrf-cookie`,
      },
      {
        // Local-only session bootstrap so presence channels can authorize.
        source: '/dev/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/dev/:path*`,
      },
    ];
  },
};

export default nextConfig;
