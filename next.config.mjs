/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // web-push memakai modul Node (crypto/https) — jangan di-bundle.
    serverComponentsExternalPackages: ["web-push"],
  },
  images: {
    remotePatterns: [
      // Google profile photo (currentUser.photoURL via Firebase Auth).
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  // Route modul/halaman yang sudah dihapus — arahkan ke Beranda supaya
  // bookmark / tab PWA lama tidak 404.
  async redirects() {
    return [
      { source: "/productivity/:path*", destination: "/dashboard", permanent: false },
      { source: "/arul", destination: "/dashboard", permanent: false },
      { source: "/fifi", destination: "/dashboard", permanent: false },
      { source: "/together", destination: "/dashboard", permanent: false },
      { source: "/more", destination: "/dashboard", permanent: false },
      { source: "/wishlist", destination: "/dashboard", permanent: false },
      { source: "/categories", destination: "/budget", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
      {
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache" }],
      },
    ];
  },
};

export default nextConfig;
