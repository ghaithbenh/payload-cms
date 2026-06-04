import { withPayload } from "@payloadcms/next/withPayload";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'Content-Security-Policy',
          value: "script-src 'self' 'unsafe-eval'",
        },
      ],
    },
  ],
  /* config options here */
};

export default withPayload(nextConfig);
