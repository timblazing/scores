import { defineConfig } from 'cf/config'

export default defineConfig({
  worker: {
    name: 'scores',
    compatibilityDate: '2026-10-06',
    domains: ['scores.blasingame.dev'],
    observability: { enabled: true },
    assets: { notFoundHandling: 'single-page-application' },
  },
})
