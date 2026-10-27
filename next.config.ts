import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Electron loads the static export from `out/` through the app:// protocol
  // (electron/lib/app-protocol.ts). There is no Next server at runtime, so the
  // main process plays the server role over IPC.
  output: "export",
  images: { unoptimized: true },
  devIndicators: false,
};

export default nextConfig;
