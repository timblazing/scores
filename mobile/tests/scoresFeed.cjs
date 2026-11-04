// Run with node tests/scoresFeed.cjs (uses the app's TypeScript compiler).
const ts = require('typescript')
const fs = require('node:fs')
const Module = require('node:module')
const path = require('node:path')
const assert = require('node:assert/strict')
function load(file) {
  const filename = path.resolve(__dirname, '../src/lib', file)
  const mod = new Module(filename)
  mod.filename = filename
  mod.require = (name) => name === './format' ? load('format.ts') : require(name)
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, filename)
  return mod.exports
}
const { buildScoresFeed: feed } = load('scoresFeed.ts')
const today = '20261103'
const team = { league: 'nfl', id: '1', name: 'Team' }
const game = (id, league, date, state = 'pre', home = '1', away = '2') => ({ id, league, date: `${date}T18:00:00`, state, home: { id: home }, away: { id: away } })
const next = game('next', 'nfl', '2026-11-15')
let result = feed([], [next], [team], [], today)
assert.deepEqual(result.following.map(g => g.id), ['next'], 'schedule beyond a bye week survives a hidden league')
assert.equal(result.groups.length, 0)
const live = game('live', 'nfl', '2026-11-02', 'in')
result = feed([live], [next, { ...live, state: 'pre' }], [team], ['nfl'], today)
assert.deepEqual(result.following.map(g => g.id), ['live'], 'live scoreboard overrides schedule past midnight')
result = feed([game('final', 'nfl', '2026-11-03', 'post')], [next], [team, { ...team, id: '2' }], ['nfl'], today)
assert.deepEqual(result.following.map(g => g.id), ['next', 'final'], 'next matchup shown after final, shared matchup deduplicated')
const nba = game('nba', 'nba', '2026-11-03', 'in')
const cfb = { ...game('cfb', 'cfb', '2026-11-04'), home: { id: '3', rank: 1 } }
result = feed([next, nba, cfb], [], [], ['nfl', 'cfb', 'nba'], today)
assert.deepEqual(result.groups.map(g => g.league), ['nba', 'cfb', 'nfl'], 'live leagues then nearest start')
result = feed([game('later', 'nba', '2026-11-03'), nba, game('done', 'nba', '2026-11-03', 'post')], [], [], ['nba'], today)
assert.deepEqual(result.groups[0].games.map(g => g.id), ['nba', 'later', 'done'], 'live, upcoming, final within leagues')
result = feed([], [], [team], ['nfl'], today)
assert.equal(result.unscheduled.length, 1, 'offseason does not fabricate a next game')
console.log('Scores feed: 6 scenarios passed')
