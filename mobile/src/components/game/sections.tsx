import { Link } from 'expo-router'
import { Pressable, View } from 'react-native'
import type { Game, LeagueId, Side } from '@/lib/espn'
import { headshot, teamLogo } from '@/lib/espn'
import { dateTime, monthDay, readable } from '@/lib/format'
import { Card, Divider, Headshot, Logo, Muted, Text } from '../ui'
import { colors, scoreFont } from '@/theme'

type Any = any

export function periodLabel(league: LeagueId, p: number) {
  if (p <= 4) return ['1st', '2nd', '3rd', '4th'][p - 1]
  return league === 'nba' ? (p === 5 ? 'OT' : `${p - 4}OT`) : 'OT'
}

const TeamTag = ({ side, size = 20 }: { side: { logo?: string; abbr: string }; size?: number }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
    <Logo src={side.logo} size={size} />
    <Text style={{ fontWeight: '600', fontSize: 14 }}>{side.abbr}</Text>
  </View>
)

/* ---------- line score ---------- */

export function LineScore({ game }: { game: Game }) {
  const n = Math.max(4, game.home.linescores.length, game.away.linescores.length)
  if (!game.home.linescores.length) return null
  const cols = Array.from({ length: n }, (_, i) => i + 1)
  const cell = { width: 34, textAlign: 'center' as const }
  const row = (s: Side) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 7 }}>
      <View style={{ flex: 1, minWidth: 64 }}>
        <TeamTag side={s} />
      </View>
      {cols.map((c) => (
        <Text key={c} tnum style={[cell, { color: colors.muted, fontSize: 14 }]}>
          {s.linescores[c - 1] ?? '-'}
        </Text>
      ))}
      <Text tnum style={[cell, { fontWeight: '700', width: 40, fontSize: 15 }]}>
        {s.score}
      </Text>
    </View>
  )
  return (
    <Card>
      <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
        <View style={{ flexDirection: 'row', paddingBottom: 2 }}>
          <View style={{ flex: 1 }} />
          {cols.map((c) => (
            <Text key={c} style={[cell, { fontSize: 12, color: colors.faint }]}>
              {c <= 4 ? c : periodLabel(game.league, c)}
            </Text>
          ))}
          <Text style={[cell, { fontSize: 12, color: colors.faint, width: 40 }]}>T</Text>
        </View>
        {row(game.away)}
        {row(game.home)}
      </View>
    </Card>
  )
}

/* ---------- odds ---------- */

export function OddsCard({ game }: { game: Game }) {
  const o = game.odds
  if (!o) return null
  const rows = [
    { side: game.away, spread: o.awaySpread, spreadOdds: o.awaySpreadOdds, total: o.overUnder != null ? `o${o.overUnder}` : undefined, totalOdds: o.overOdds, ml: o.awayML },
    { side: game.home, spread: o.homeSpread, spreadOdds: o.homeSpreadOdds, total: o.overUnder != null ? `u${o.overUnder}` : undefined, totalOdds: o.underOdds, ml: o.homeML },
  ]
  const col = { width: 78, alignItems: 'center' as const }
  const Cell = ({ v, sub }: { v?: string; sub?: string }) => (
    <View style={col}>
      <Text tnum style={{ fontSize: 14 }}>{v ?? '-'}</Text>
      {sub ? <Text tnum style={{ fontSize: 11, color: colors.faint }}>{sub}</Text> : null}
    </View>
  )
  return (
    <Card title="Odds" action={o.provider ? <Muted style={{ fontSize: 12 }}>{o.provider}</Muted> : null}>
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 4 }}>
        <Text style={{ flex: 1, fontSize: 12, color: colors.faint }}>Team</Text>
        {['Spread', 'Total', 'Moneyline'].map((h) => (
          <Text key={h} style={[col, { fontSize: 12, color: colors.faint, textAlign: 'center' }]}>
            {h === 'Moneyline' ? 'ML' : h}
          </Text>
        ))}
      </View>
      {rows.map((r) => (
        <View key={r.side.id}>
          <Divider />
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 }}>
            <View style={{ flex: 1 }}>
              <TeamTag side={r.side} />
            </View>
            <Cell v={r.spread} sub={r.spreadOdds} />
            <Cell v={r.total} sub={r.totalOdds} />
            <Cell v={r.ml} />
          </View>
        </View>
      ))}
      <Text style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 14, fontSize: 11, color: colors.faint }}>Lines may be closed or out of date.</Text>
    </Card>
  )
}

/* ---------- matchup predictor ---------- */

export function Predictor({ raw, game }: { raw: Any; game: Game }) {
  const p = raw.predictor
  if (!p?.homeTeam?.gameProjection) return null
  const home = Number(p.homeTeam.gameProjection)
  const away = Number(p.awayTeam?.gameProjection ?? 100 - home)
  return (
    <Card title="Matchup predictor">
      <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text tnum style={{ fontFamily: scoreFont, fontSize: 30, lineHeight: 32 }}>{away.toFixed(1)}%</Text>
          <Text tnum style={{ fontFamily: scoreFont, fontSize: 30, lineHeight: 32 }}>{home.toFixed(1)}%</Text>
        </View>
        <View style={{ flexDirection: 'row', height: 8, gap: 4, borderRadius: 4, overflow: 'hidden' }}>
          <View style={{ width: `${away}%`, backgroundColor: readable(game.away.color) }} />
          <View style={{ width: `${home}%`, backgroundColor: readable(game.home.color) }} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
          <Muted style={{ fontSize: 12 }}>{game.away.abbr}</Muted>
          <Muted style={{ fontSize: 12 }}>{game.home.abbr}</Muted>
        </View>
        <Text style={{ marginTop: 10, fontSize: 11, color: colors.faint }}>ESPN Analytics</Text>
      </View>
    </Card>
  )
}

/* ---------- leaders ---------- */

export function Leaders({ raw, game, title }: { raw: Any; game: Game; title: string }) {
  const teams: Any[] = raw.leaders ?? []
  const away = teams.find((t) => String(t.team?.id) === game.away.id)
  const home = teams.find((t) => String(t.team?.id) === game.home.id)
  const cats: string[] = (away?.leaders ?? home?.leaders ?? []).filter((c: Any) => c.leaders?.length).map((c: Any) => c.name)
  if (!cats.length) return null
  const pick = (t: Any, name: string) => t?.leaders?.find((c: Any) => c.name === name)
  return (
    <Card title={title}>
      {cats.slice(0, 5).map((name) => {
        const a = pick(away, name)
        const h = pick(home, name)
        return (
          <View key={name}>
            <Divider />
            <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
              <Text style={{ textAlign: 'center', fontSize: 12, color: colors.faint, marginBottom: 8 }}>{(a ?? h)?.displayName}</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                <LeaderCell league={game.league} l={a?.leaders?.[0]} />
                <LeaderCell league={game.league} l={h?.leaders?.[0]} right />
              </View>
            </View>
          </View>
        )
      })}
    </Card>
  )
}

function LeaderCell({ l, right, league }: { l: Any; right?: boolean; league: LeagueId }) {
  if (!l) return <View style={{ flex: 1 }} />
  const a = l.athlete ?? {}
  return (
    <Link href={`/player/${league}/${a.id}`} asChild>
      <Pressable style={{ flex: 1, flexDirection: right ? 'row-reverse' : 'row', alignItems: 'center', gap: 10 }}>
        <Headshot src={headshot(league, a.id, 44)} size={44} />
        <View style={{ flex: 1, alignItems: right ? 'flex-end' : 'flex-start' }}>
          <Text tnum style={{ fontFamily: scoreFont, fontSize: 26, lineHeight: 28 }}>{l.mainStat?.value ?? l.displayValue}</Text>
          <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '500', marginTop: 2 }}>{a.shortName ?? a.displayName}</Text>
          <Text numberOfLines={1} style={{ fontSize: 11, color: colors.faint }}>{l.summary || l.displayValue}</Text>
        </View>
      </Pressable>
    </Link>
  )
}

/* ---------- team stats comparison ---------- */

const num = (s: string) => {
  const m = String(s).match(/-?\d+(\.\d+)?/)
  return m ? Number(m[0]) : NaN
}

const LOWER_IS_BETTER = /turnover|penalt|sack|interception|fumble|foul|lost/i

export function TeamStatsCompare({ raw, game, limit }: { raw: Any; game: Game; limit?: number }) {
  const teams: Any[] = raw.boxscore?.teams ?? []
  const away = teams.find((t) => String(t.team?.id) === game.away.id)
  const home = teams.find((t) => String(t.team?.id) === game.home.id)
  if (!away?.statistics?.length || !home?.statistics?.length) return null
  const seen = new Set<string>()
  const stats = away.statistics
    .filter((s: Any) => {
      if (seen.has(s.label)) return false
      seen.add(s.label)
      return true
    })
    .map((s: Any) => ({ label: s.label as string, a: s.displayValue as string, h: (home.statistics.find((x: Any) => x.name === s.name)?.displayValue ?? '-') as string }))
    .filter((s: Any) => !/technical|flagrant|team turnovers/i.test(s.label))
  const ac = readable(game.away.color)
  const hc = readable(game.home.color)
  return (
    <Card title="Team stats">
      <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 16 }}>
        {(limit ? stats.slice(0, limit) : stats).map((s: { label: string; a: string; h: string }) => {
          const a = num(s.a)
          const h = num(s.h)
          const ok = !Number.isNaN(a) && !Number.isNaN(h) && a + h > 0
          const share = ok ? a / (a + h) : 0.5
          const lower = LOWER_IS_BETTER.test(s.label)
          const aWins = ok && (lower ? a < h : a > h)
          const hWins = ok && (lower ? h < a : h > a)
          return (
            <View key={s.label}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text tnum style={{ fontSize: 14, fontWeight: aWins ? '600' : '400', color: aWins ? colors.fg : colors.muted }}>{s.a}</Text>
                <Muted style={{ fontSize: 12 }}>{s.label}</Muted>
                <Text tnum style={{ fontSize: 14, fontWeight: hWins ? '600' : '400', color: hWins ? colors.fg : colors.muted }}>{s.h}</Text>
              </View>
              <View style={{ flexDirection: 'row', height: 6, gap: 4 }}>
                <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-end', backgroundColor: colors.raised, borderRadius: 3, overflow: 'hidden' }}>
                  <View style={{ width: `${share * 100}%`, backgroundColor: ac, opacity: aWins ? 1 : 0.45, borderRadius: 3 }} />
                </View>
                <View style={{ flex: 1, backgroundColor: colors.raised, borderRadius: 3, overflow: 'hidden' }}>
                  <View style={{ width: `${(1 - share) * 100}%`, height: '100%', backgroundColor: hc, opacity: hWins ? 1 : 0.45, borderRadius: 3 }} />
                </View>
              </View>
            </View>
          )
        })}
      </View>
    </Card>
  )
}

/* ---------- last five ---------- */

export function LastFive({ raw, game }: { raw: Any; game: Game }) {
  const teams: Any[] = raw.lastFiveGames ?? []
  if (!teams.length) return null
  return (
    <Card title="Last five games">
      <View style={{ paddingHorizontal: 16, paddingBottom: 12, gap: 14 }}>
        {[game.away, game.home].map((side) => {
          const t = teams.find((x) => String(x.team?.id) === side.id)
          if (!t?.events?.length) return null
          return (
            <View key={side.id}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Logo src={side.logo} size={18} />
                <Text style={{ fontSize: 13, fontWeight: '600' }}>{side.displayName}</Text>
              </View>
              {t.events.map((e: Any) => (
                <Link key={e.id} href={`/game/${game.league}/${e.id}`} asChild>
                  <Pressable style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 0.5, borderTopColor: colors.lineStrong }}>
                    <Text tnum style={{ width: 48, fontSize: 13, color: colors.faint }}>{monthDay(e.gameDate)}</Text>
                    <Text style={{ width: 22, fontSize: 13, color: colors.faint }}>{e.atVs}</Text>
                    <Logo src={teamLogo(game.league, e.opponent?.abbreviation, 32, e.opponent?.id)} size={18} />
                    <Text style={{ flex: 1, marginLeft: 6, fontSize: 13 }}>{e.opponent?.abbreviation}</Text>
                    <Text tnum style={{ fontSize: 13 }}>
                      <Text style={{ fontSize: 13, color: e.gameResult === 'W' ? colors.win : e.gameResult === 'L' ? colors.live : colors.muted }}>{e.gameResult}</Text> {e.score}
                    </Text>
                  </Pressable>
                </Link>
              ))}
            </View>
          )
        })}
      </View>
    </Card>
  )
}

/* ---------- season series ---------- */

export function SeasonSeries({ raw, game }: { raw: Any; game: Game }) {
  const s = (raw.seasonseries ?? [])[0]
  if (!s?.events?.length || s.events.length < 2) return null
  return (
    <Card title={s.title ?? 'Season series'} action={s.summary ? <Muted style={{ fontSize: 12 }}>{s.summary}</Muted> : null}>
      {s.events.map((e: Any) => {
        const away = e.competitors?.find((c: Any) => c.homeAway === 'away')
        const home = e.competitors?.find((c: Any) => c.homeAway === 'home')
        const done = e.statusType?.completed ?? e.status?.type?.completed
        const current = String(e.id) === game.id
        return (
          <View key={e.id}>
            <Divider />
            <Link href={`/game/${game.league}/${e.id}`} asChild>
              <Pressable style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 11, backgroundColor: current ? colors.raised : 'transparent' }}>
                <View style={{ width: 84, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Logo src={teamLogo(game.league, away?.team?.abbreviation, 32, away?.team?.id)} size={22} />
                  <Text tnum style={{ fontSize: 14, fontWeight: done || Number(away?.score) > 0 ? '600' : '400' }}>
                    {done || Number(away?.score) > 0 ? away?.score : away?.team?.abbreviation}
                  </Text>
                </View>
                <Muted style={{ fontSize: 12 }}>{e.statusType?.shortDetail ?? e.status?.type?.shortDetail ?? ''}</Muted>
                <View style={{ width: 84, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                  <Text tnum style={{ fontSize: 14, fontWeight: done || Number(home?.score) > 0 ? '600' : '400' }}>
                    {done || Number(home?.score) > 0 ? home?.score : home?.team?.abbreviation}
                  </Text>
                  <Logo src={teamLogo(game.league, home?.team?.abbreviation, 32, home?.team?.id)} size={22} />
                </View>
              </Pressable>
            </Link>
          </View>
        )
      })}
    </Card>
  )
}

/* ---------- injuries ---------- */

export function Injuries({ raw, game }: { raw: Any; game: Game }) {
  const teams: Any[] = (raw.injuries ?? []).filter((t: Any) => t.injuries?.length)
  if (!teams.length) return null
  return (
    <Card title="Injury report">
      <View style={{ paddingHorizontal: 16, paddingBottom: 12, gap: 14 }}>
        {[game.away, game.home].map((side) => {
          const t = teams.find((x) => String(x.team?.id) === side.id)
          if (!t) return null
          return (
            <View key={side.id}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <Logo src={side.logo} size={18} />
                <Text style={{ fontSize: 13, fontWeight: '600' }}>{side.displayName}</Text>
              </View>
              {t.injuries.map((i: Any, idx: number) => (
                <Link key={`${i.athlete?.id}${i.status}${idx}`} href={`/player/${game.league}/${i.athlete?.id}`} asChild>
                  <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, borderTopWidth: 0.5, borderTopColor: colors.lineStrong }}>
                    <Headshot src={headshot(game.league, i.athlete?.id, 32)} size={32} />
                    <View style={{ flex: 1 }}>
                      <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '500' }}>
                        {i.athlete?.displayName} <Text style={{ fontSize: 12, color: colors.faint, fontWeight: '400' }}>{i.athlete?.position?.abbreviation}</Text>
                      </Text>
                      <Muted numberOfLines={1} style={{ fontSize: 12 }}>{[i.details?.type, i.details?.detail].filter(Boolean).join(' · ') || i.type?.description}</Muted>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 13, fontWeight: '500', color: /out|injured reserve/i.test(i.status) ? colors.live : colors.warn }}>{i.status}</Text>
                      {i.details?.returnDate ? <Text style={{ fontSize: 11, color: colors.faint }}>Est. {monthDay(i.details.returnDate)}</Text> : null}
                    </View>
                  </Pressable>
                </Link>
              ))}
            </View>
          )
        })}
      </View>
    </Card>
  )
}

/* ---------- game info ---------- */

export function GameInfo({ raw, game }: { raw: Any; game: Game }) {
  const gi = raw.gameInfo ?? {}
  const v = gi.venue
  const where = [v?.address?.city, v?.address?.state].filter(Boolean).join(', ')
  const officials = (gi.officials ?? []).map((o: Any) => o.displayName).filter(Boolean)
  const items = [
    ['Date', dateTime(game.date)],
    ['Venue', v?.fullName ? `${v.fullName}${where ? `, ${where}` : ''}` : undefined],
    ['TV', game.broadcast],
    ['Weather', gi.weather ? `${gi.weather.temperature ?? ''}° ${gi.weather.displayValue ?? ''}`.trim() : undefined],
    ['Attendance', gi.attendance ? Number(gi.attendance).toLocaleString() : undefined],
    ['Officials', officials.length ? officials.join(', ') : undefined],
  ].filter(([, val]) => val) as [string, string][]
  return (
    <Card title="Game info">
      {items.map(([k, val]) => (
        <View key={k}>
          <Divider />
          <View style={{ flexDirection: 'row', gap: 16, paddingHorizontal: 16, paddingVertical: 11 }}>
            <Muted style={{ width: 84, fontSize: 14 }}>{k}</Muted>
            <Text style={{ flex: 1, fontSize: 14 }}>{val}</Text>
          </View>
        </View>
      ))}
    </Card>
  )
}

/* ---------- scoring summary ---------- */

export function ScoringSummary({ raw, game }: { raw: Any; game: Game }) {
  const plays: Any[] = raw.scoringPlays ?? []
  if (!plays.length) return null
  return (
    <Card title="Scoring summary">
      {plays.map((p) => (
        <View key={p.id}>
          <Divider />
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 16, paddingVertical: 12 }}>
            <Logo src={teamLogo(game.league, p.team?.abbreviation, 48, p.team?.id)} size={24} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '600' }}>{p.type?.text}</Text>
              <Muted style={{ fontSize: 13 }}>{p.text}</Muted>
              <Text style={{ marginTop: 2, fontSize: 11, color: colors.faint }}>
                {periodLabel(game.league, p.period?.number)} · {p.clock?.displayValue}
              </Text>
            </View>
            <Text tnum style={{ fontSize: 13, fontWeight: '600' }}>
              {p.awayScore}-{p.homeScore}
            </Text>
          </View>
        </View>
      ))}
    </Card>
  )
}
