import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { cloudflare } from '@cloudflare/vite-plugin'

// The Cloudflare plugin is only needed for web deploys; Capacitor builds use plain `dist/`.
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), mode !== 'capacitor' && cloudflare()],
  resolve: { alias: { '@': '/src' } },
}))
