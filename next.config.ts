import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/package/starter',
        permanent: false,
      },
      {
        source: '/sns',
        destination: '/package/growth',
        statusCode: 301,
      },
      {
        source: '/db',
        destination: '/package/growth',
        statusCode: 301,
      },
    ];
  },
};

export default nextConfig;
