/** @type {import('next').NextConfig} */
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

  // --- CONDITIONAL EXPORT ---
  // Only use 'export' if the BUILD_TARGET environment variable is set to 'mobile'
  // Otherwise, default to standard server mode (needed for API routes)
  output: process.env.BUILD_TARGET === 'mobile' ? 'export' : undefined,
}

export default nextConfig