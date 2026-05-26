/** @type {import('next').NextConfig} */
const nextConfig = {
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
