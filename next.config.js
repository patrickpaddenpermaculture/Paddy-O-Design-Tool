/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    'three',
    '@react-three/fiber',
    '@react-three/drei',
    '@runwayml/sdk'  // also helps if runway is causing issues
  ],
};

module.exports = nextConfig;