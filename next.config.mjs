/** @type {import('next').NextConfig} */
const nextConfig = {
  // Bundle mandiri untuk Docker monolith (node server.js tanpa node_modules penuh).
  output: "standalone",
  // We render meme assets via plain <img>/<video> so remotePatterns isn't
  // strictly required — but listing them keeps the door open for next/image
  // adoption later (see PERSONALIZATION_PLAN.md §2.3).
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "media.tenor.com" },
      { protocol: "https", hostname: "media1.tenor.com" },
      { protocol: "https", hostname: "c.tenor.com" },
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
    ];
  },
};

export default nextConfig;
