import { Stack } from 'expo-router'
import { ScrollView, View } from 'react-native'
import { Card, Muted, Text } from '@/components/ui'
import { colors } from '@/theme'

export default function PicksScreen() {
  return (
    <>
      <Stack.Title>Picks</Stack.Title>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 12, paddingBottom: 120 }}>
        <Card style={{ padding: 20, gap: 12 }}>
          <Text accessibilityRole="header" style={{ fontSize: 20, fontWeight: '600' }}>Coming soon</Text>
          <Muted>Your picks will live here.</Muted>
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ gap: 12, marginTop: 12 }}>
            {[0, 1, 2].map((row) => (
              <View key={row} style={{ gap: 10, paddingVertical: 12 }}>
                <View style={{ height: 14, width: '55%', borderRadius: 7, backgroundColor: colors.raised }} />
                <View style={{ height: 12, width: '85%', borderRadius: 6, backgroundColor: colors.raised }} />
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>
    </>
  )
}
