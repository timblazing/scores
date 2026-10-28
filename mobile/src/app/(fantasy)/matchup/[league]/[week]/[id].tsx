import { Stack, useLocalSearchParams } from 'expo-router'
import { MatchupDetail } from '@/screens/FantasyScreen'

export default function MatchupRoute() {
  const { league, week, id } = useLocalSearchParams<{ league: string; week: string; id: string }>()
  return (
    <>
      <Stack.Screen options={{ title: `Week ${week}` }} />
      <MatchupDetail id={league} week={Number(week)} matchup={id} />
    </>
  )
}
