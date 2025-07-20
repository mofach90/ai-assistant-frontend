// vite.config.js  (or vite.config.ts)
import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'   // Tailwind v4+ plugin

export default defineConfig({
  plugins: [
    tailwindcss(),         // enables Tailwind’s JIT + HMR
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),   // import Foo from '@/components/Foo'
    },
  },
})
