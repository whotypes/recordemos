import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'
import viteTsConfigPaths from 'vite-tsconfig-paths'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

const config = defineConfig({
  resolve: {
    alias: {
      cookie: 'cookie',
      // App-generated Convex bindings live under ./convex; bare "convex" resolves to the npm package.
      'convex/_generated/api': path.resolve(rootDir, 'convex/_generated/api.js'),
      'convex/_generated/dataModel': path.resolve(
        rootDir,
        'convex/_generated/dataModel.d.ts',
      ),
    }
  },
  optimizeDeps: {
    include: ['@clerk/tanstack-react-start','cookie'],
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
  plugins: [
    devtools(),
    nitro(),
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
})

export default config
