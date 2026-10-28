import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { Layout } from './components/Layout'
import { GamePage } from './routes/Game'
import { NewsPage } from './routes/News'
import { PlayerPage } from './routes/Player'
import { ScoresPage } from './routes/Scores'
import { StandingsPage } from './routes/Standings'
import { TeamPage } from './routes/Team'
import { TeamsPage } from './routes/Teams'
import './index.css'
import { StatusBar, Style } from '@capacitor/status-bar'
import { isNative } from './lib/native'

if (isNative) {
  document.documentElement.classList.add('native')
  StatusBar.setStyle({ style: Style.Dark }).catch(() => {})
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: true } },
})

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <ScoresPage /> },
      { path: '/standings', element: <StandingsPage /> },
      { path: '/teams', element: <TeamsPage /> },
      { path: '/news', element: <NewsPage /> },
      { path: '/:league/game/:id', element: <GamePage /> },
      { path: '/:league/team/:id', element: <TeamPage /> },
      { path: '/:league/player/:id', element: <PlayerPage /> },
      { path: '*', element: <ScoresPage /> },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
