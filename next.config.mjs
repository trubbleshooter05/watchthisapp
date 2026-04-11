/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: "/movies-like/dune-2", destination: "/movies-like/dune-part-two", permanent: true },
      { source: "/movies-like/dune-part-2", destination: "/movies-like/dune-part-two", permanent: true },
      { source: "/movies-like/batman-2022", destination: "/movies-like/the-batman", permanent: true },
      { source: "/movies-like/avengers-4", destination: "/movies-like/avengers-endgame", permanent: true },
    ];
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/t/p/**",
      },
    ],
  },
};

export default nextConfig;
