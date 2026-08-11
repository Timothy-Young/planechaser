import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // The nsfwjs model weights and the TensorFlow WASM binaries are loaded at
  // runtime by path, not by import, so tracing does not discover them and the
  // moderation route would 500 on a cold start in production without this.
  //
  // The package.json entry is not a runtime asset — it is the *resolve target*
  // moderation/image.ts uses to locate the .wasm files next to it. Tracing
  // cannot see that lookup (it goes through `createRequire(import.meta.url)`,
  // which the bundler mangles), so the file was absent from the deployed
  // function and `require.resolve` threw MODULE_NOT_FOUND on every scan. The
  // .wasm binaries below were shipping fine; nothing could find them.
  outputFileTracingIncludes: {
    '/api/custom-planes': [
      './node_modules/@tensorflow/tfjs-backend-wasm/package.json',
      './node_modules/@tensorflow/tfjs-backend-wasm/dist/*.wasm',
      './node_modules/nsfwjs/dist/models/mobilenet_v2/**/*',
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cards.scryfall.io',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'obuwoovwqwyhmbycavkx.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

export default nextConfig
