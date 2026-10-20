import { defineConfig } from 'cf/config'

export default defineConfig({
  worker: {
    name: 'scores',
    compatibilityDate: '2026-10-06',
    // Only /api/* runs the Worker (ESPN edge cache); everything else is static assets with SPA fallback.
    entrypoint: './worker/index.ts',
    domains: ['scores.blasingame.dev'],
    observability: { enabled: true },
    assets: { notFoundHandling: 'single-page-application', runWorkerFirst: ['/api/*'] },
  },
})
