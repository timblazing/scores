import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { cloudflare } from '@cloudflare/vite-plugin'

// The Cloudflare plugin is only needed for web deploys; Capacitor builds use plain `dist/`.
// CF_SKIP_TYPES=1 skips type generation, which spawns workerd (crashes on 39-bit VA kernels like the Pi's).
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), mode !== 'capacitor' && cloudflare({ types: { generate: !process.env.CF_SKIP_TYPES } })],
  resolve: { alias: { '@': '/src' } },
}))
