import { useState } from 'react'
import { ActivityIndicator, Keyboard, Pressable, TextInput, View } from 'react-native'
import { getSleeperUser } from '@/lib/sleeper'
import { setSleeper, type SleeperUser } from '@/lib/settings'
import { Text } from './ui'
import { colors } from '@/theme'

/** Username field that checks the name against Sleeper and saves the user to settings when it exists. */
export function SleeperLookup({ initial = '', cta, onDone, padded }: { initial?: string; cta: string; onDone?: (u: SleeperUser) => void; padded?: boolean }) {
  const [text, setText] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const name = text.trim().replace(/^@/, '')

  const submit = async () => {
    if (!name || busy) return
    setBusy(true)
    setError(undefined)
    try {
      const u = await getSleeperUser(name)
      if (!u) setError('Not found')
      else {
        Keyboard.dismiss()
        setSleeper(u)
        onDone?.(u)
      }
    } catch {
      setError('Couldn’t reach Sleeper')
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={{ gap: 8, padding: padded ? 16 : 0 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <TextInput
          value={text}
          onChangeText={(t) => {
            setText(t)
            setError(undefined)
          }}
          onSubmitEditing={submit}
          placeholder="Sleeper username"
          placeholderTextColor={colors.faint}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="go"
          style={{ flex: 1, height: 44, borderRadius: 12, borderCurve: 'continuous', paddingHorizontal: 14, fontSize: 16, color: colors.fg, backgroundColor: colors.raised }}
        />
        <Pressable onPress={submit} disabled={!name || busy} style={{ height: 44, minWidth: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, backgroundColor: colors.fg, opacity: name ? 1 : 0.4 }}>
          {busy ? <ActivityIndicator color={colors.bg} /> : <Text style={{ fontSize: 15, fontWeight: '600', color: colors.bg }}>{cta}</Text>}
        </Pressable>
      </View>
      {error ? <Text style={{ fontSize: 13, color: colors.live }}>{error}</Text> : null}
    </View>
  )
}
