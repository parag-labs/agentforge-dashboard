/**
 * When PAGES=1 (the GitHub Pages build) we produce a fully static export served under the repo
 * subpath. Otherwise we build a standalone server image (Docker). The dashboard runs entirely
 * client-side on deterministic simulated data, so the static export is a complete, live demo.
 */
const isPages = process.env.PAGES === "1";
const repo = "agentforge-dashboard";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: isPages ? "export" : "standalone",
  ...(isPages ? { basePath: `/${repo}`, assetPrefix: `/${repo}/` } : {}),
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
