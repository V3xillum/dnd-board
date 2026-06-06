# Ganzenbord — architectuur (levend document)

**Status:** actueel na sessie 11b — `game/*` splits compleet.

Dit bestand is bedoeld voor **mens én agent**: waar zit wat, in welke volgorde laden scripts, welke globals zijn publiek API. Na 10+ sessies en 8000+ regels JS is dit de snelste ingang.

---

## Stack (huidig)

| Laag | Techniek |
|------|----------|
| Frontend | Vanilla JS, geen bundler |
| Styling | `css/styles.css` (+ optioneel `scss/`) |
| Multiplayer | Firebase Realtime Database (`js/firebase.js` module + `js/multiplayer.js`) |
| Data | `js/events-data.js` — event-pool + bord-generatie |

**Architectuurkeuze sessie 11:** Optie A — `<script>`-tags + `window.*` globals. Geen Vite/webpack tenzij later expliciet gewenst.

---

## Bestanden (huidige situatie)

| Bestand | ~regels | Verantwoordelijkheid |
|---------|---------|----------------------|
| `js/settings.js` | ~55 | Tune-bare constanten — **single source of truth** |
| `js/events-data.js` | ~1640 | Event-pool, boss/ambush data, `buildSpecialSpaces()` |
| `js/game/board-layout.js` | ~90 | Spiral layout, `buildSpacePositions`, `getPathDirection` |
| `js/game/dc.js` | ~75 | `getEffectiveDc`, `calcEventSuccessSteps`, movement bonus |
| `js/game/combat.js` | ~455 | Combat resolve — `Game.prototype` mixin |
| `js/game.js` | ~1210 | `Game` class, orchestratie (move, mystery, boss) |
| `js/multiplayer.js` | ~370 | Serialize/deserialize game state, Firebase sync |
| `js/ui/dom.js` | ~170 | `game`, `els`, parse helpers, cell styling |
| `js/ui/state.js` | ~18 | Gedeelde mutable UI-state (combat flow, modals, tokensAnimating) |
| `js/ui/log.js` | ~340 | Event-log: `describeEvents`, `addLog`, `prependLogEntry` |
| `js/ui/board.js` | ~130 | `renderBoard`, mystery cell FX |
| `js/ui/tokens.js` | ~413 | Token layer, animatie, `snapshotTokenPositions` |
| `js/ui/players.js` | ~444 | Player list, combat rail, HP, turn UI, difficulty |
| `js/ui/modals/core.js` | ~490 | Scroll lock, enter animaties, spectator sync, serialize |
| `js/ui/modals/combat.js` | ~768 | Combat flow: fases, finishCombatRound, enemy/special save |
| `js/ui/modals/events.js` | ~1204 | Event, mystery, boss-reveal, path/healer, win, ambush/boss modal open |
| `js/ui/flow.js` | ~118 | `advanceTurn`, `continueAfterLand`, `handleMoveResult`, remote refresh |
| `js/ui/bootstrap.js` | ~193 | Event listeners, `window.*` exports, pagina-init |
| `js/firebase.js` | ~80 | Firebase init (ES module) |

### Laadvolgorde (`index.html`)

```
firebase.js (module)
→ settings.js
→ events-data.js
→ game/board-layout.js
→ game/dc.js
→ game.js
→ game/combat.js
→ multiplayer.js
→ ui/dom.js
→ ui/state.js
→ ui/log.js
→ ui/board.js
→ ui/tokens.js
→ ui/players.js
→ ui/modals/core.js
→ ui/modals/combat.js
→ ui/modals/events.js
→ ui/flow.js
→ ui/bootstrap.js
```

---

## Globals — publieke API (niet alles refactoren)

### Settings (`settings.js` → `window`)

- `GAME_SETTINGS` — genest object (board, player, movement, boss, difficulty, boardGen, ui)
- Aliases: `DEFAULT_HP`, `DEFAULT_MAX_HP`, `TOTAL_SPACES`, `FINISH_SPACE`, `BOSS_SPACE`, `BASE_SUCCESS_STEPS`, `OVERSHOOT_DIVISOR`, `DC_DIFFICULTY_MAX_LEVEL`, `HEALER_SPACE`, `PATH_RATIO`, `AMBUSH_RATIO`

### Bord-layout (`game/board-layout.js` → `window`)

- `buildSpiralLayout`, `buildSpacePositions`, `getPathDirection`
- `isCenterCell`, `isCenterCovered`, `getCenterAnchor`
- Laadt vóór `game.js` — gebruikt door `Game` constructor en `ui/board.js`

### DC / difficulty (`game/dc.js` → `window`)

- `getEffectiveDc`, `getDcBonus`, `getDcModifier`, `getDifficultyDcBonus`
- `calcEventSuccessSteps`, `applyMovementBonus`
- `BASE_SUCCESS_STEPS`, `OVERSHOOT_DIVISOR`, `DC_DIFFICULTY_MAX_LEVEL` (ook via `settings.js`)
- Laadt vóór `game.js` — gebruikt door `Game`, `ui/players.js`, `ui/modals/events.js`

### Combat resolve (`game/combat.js` → `Game.prototype`)

- `buildCombatContext`, `resolveCombatPlayerAttack`, `rollCombatEnemyAttack`, `resolveCombatEnemyAttack`
- `resolveCombatSpecialSave`, `finalizeCombatRound`, `applyRepeatedHpDamage`
- Laadt **ná** `game.js` — mixin op `Game.prototype`; UI roept `game.*` aan

### Game / regels (`game.js` → `window`)

- `Game`, `TOTAL_SPACES`, `FINISH_SPACE`, `BOSS_SPACE`
- `DEFAULT_HP`, `DEFAULT_MAX_HP`, `isOnBossArena`, …

### Bord-data (`events-data.js` → `window`)

- `SPECIAL_SPACES`, `EVENT_POOL`, `BOSS_POOL`, `AMBUSH_POOL`
- `HEALER_SPACE`, `HEALER_TILE`, `pickRandomAmbush`, `pickRandomBoss`, …

### Multiplayer (`multiplayer.js` → `window`)

- `syncAfterAction`, `isMultiplayerHost`, `getActiveModal`, `refreshGameUIFromRemote`, …

### UI state (`ui/state.js`)

- `tokensAnimating`, `activeAmbush`, `activeBoss`, `activeBossMinion`, `activeEvent`, `activeMystery`, `activeBossReveal`
- `syncedActiveModal`, `pathModalCallback`, `pathModalSpaceNum`, `pathModalSkipMysteryReset`, `activeCombatActionHandler`
- Laadt na `ui/dom.js` — `var` voor cross-script shared scope (geen bundler)

### UI dom (`ui/dom.js`)

- `game` instantie, `els` DOM refs, `COLORS`
- `parseDiceRoll`, `parse2d6Total`, `parseCheckTotal`, `applyCellStyle`

### UI board (`ui/board.js`)

- `renderBoard`, `snapshotSpecialSpaces`, mystery cell FX
- `prefersReducedMotion`

### UI players (`ui/players.js`)

- `renderPlayers`, `updateCombatRail`, `updateTurnUI`, `updateDifficultyUI`
- HP controls, combat rail cards

### UI modals core (`ui/modals/core.js`)

- `syncModalScrollLock`, `playModalCardEnter`, spectator sync
- `serializeModalConfig`, `renderSpectatorModal`, rules/new-adventure modals

### UI combat modal (`ui/modals/combat.js`)

- `createCombatFlowState`, `getCombatFlowType`, `finishCombatRound`, `handleCombatPlayerSubmit`
- Enemy fases: `startEnemyAttackPhase`, `handleCombatEnemyHit`, `showSpecialSavePhase`
- Helpers: `setCombatFooter`, `resetCombatModalPhases`, `buildCombatOutcomeHtml`, `setEventCheckForCombat`
- Laadt vóór `ui/modals/events.js`

### UI modals events (`ui/modals/events.js`)

- Event, mystery, boss-reveal, path/healer, win modals
- Ambush/boss modal open + submit handlers (`showAmbushModal`, `handleEventSubmit`, …)

### UI flow (`ui/flow.js`)

- `advanceTurn`, `continueAfterLand`, `handleMoveResult`, `refreshGameUIFromRemote`

### UI bootstrap (`ui/bootstrap.js`)

- Event listeners, `window.getGame`, `window.refreshGameUI`, pagina-init

### UI tokens (`ui/tokens.js`)

- `renderTokens`, `syncTokensAfterEvents`, `animateFromEvents`, position-diff voor multiplayer-gast
- `window.snapshotTokenPositions`
- Laadt vóór `ui/bootstrap.js` (bootstrap roept `renderTokens` indirect aan via board refresh)

### UI log (`ui/log.js`)

- `describeEvents`, `addLog`, `prependLogEntry`, `formatEnemyAttackLogEffect`
- `window.appendRemoteLogEntry`, `window.clearGameLog` (multiplayer)

### UI (`window` exports via bootstrap)

- `game` instantie (in `ui/dom.js`, state via serialize)
- Modal sync hooks gebruikt door multiplayer

---

## Geplande mapstructuur (doelbeeld)

```
js/
  settings.js
  events-data.js
  game.js                  ✅ orchestratie (~1210 regels)
  game/
    board-layout.js        ✅ sub-stap A (11b)
    dc.js                  ✅ sub-stap B (11b)
    combat.js              ✅ sub-stap C (11b)
  multiplayer.js
  ui/
    dom.js                 ✅
    state.js               ✅
    board.js               ✅
    tokens.js              ✅
    players.js             ✅
    log.js                 ✅
    flow.js                ✅
    modals/
      core.js              ✅
      combat.js            ✅
      events.js            ✅
    bootstrap.js           ✅
  firebase.js
```

**Namespace (optioneel):** `window.Ganzenbord = { settings, ui, … }` — alleen als het globals opruimt zonder big-bang.

---

## Afhankelijkheidsregels

```
settings.js
    ↓
events-data.js  →  game.js  →  multiplayer.js  →  ui/*
         ↑_______________|________________|
              (alleen lezen van settings + game API)
```

- **UI → game:** wel (methodes aanroepen)
- **game → UI:** nee
- **game → events-data:** wel (`SPECIAL_SPACES`, pools)
- **events-data → game:** nee

---

## Gedeelde UI-state (`ui/state.js`)

| Variabele | Doel |
|-----------|------|
| `activeAmbush` / `activeBoss` / `activeBossMinion` | Combat-modal flow |
| `activeEvent` / `activeMystery` / `activeBossReveal` | Overige modals |
| `tokensAnimating` | Blokkeert dobbelsteen-input |
| `syncedActiveModal` | Multiplayer spectator sync |
| `pathModalCallback` / `pathModalSpaceNum` | Path/healer modal |

---

## Sessie-documentatie

| Onderwerp | MD |
|-----------|-----|
| HP / death | `MD/hp-systeem.md` |
| Ambush | `MD/sessie-4-ambush.md` |
| Boss / win | `MD/sessie-3-boss-win.md` |
| Mystery D12 | `MD/sessie-7-mystery-vakjes.md` |
| Boss D12 | `MD/sessie-8-boss-d12.md` |
| Tokens / animatie | `MD/sessie-9-token-animatie.md` |
| Attack-roll combat | `MD/sessie-10-attack-roll-combat.md` |
| **Refactor-plan** | `MD/sessie-11-refactor-architecture.md` |
| **Game-splits (11b)** | `MD/sessie-11b-game-splits.md` |
| Event-auteur | `js/EVENTS.md` |

---

## Changelog (architectuur)

| Datum | Wijziging |
|-------|-----------|
| 2025-06 | Sessie 11b sub-stap C: `js/game/combat.js` — combat resolve via `Game.prototype` mixin |
| 2025-06 | Sessie 11b sub-stap B: `js/game/dc.js` — DC helpers, event-stappen, movement bonus |
| 2025-06 | Sessie 11b sub-stap A: `js/game/board-layout.js` — spiral, posities, pad-richting |
| 2025-06 | Stap 6: `ui.js` opgesplitst → dom, board, players, modals/core, modals/events, flow, bootstrap |
| 2025-06 | Stap 5: `js/ui/modals/combat.js` — combat modal flow |
| 2025-06 | Stap 4: `js/ui/tokens.js` — token layer + animatie |
| 2025-06 | Stap 3b: `js/ui/state.js` — gedeelde mutable UI-state |
| 2025-06 | Stap 3: `js/ui/log.js` — event-log uit ui.js geëxtraheerd |
| 2025-06 | Stap 2: `js/settings.js` — centrale constanten + backwards-compat aliases |
| 2025-06 | Skelet aangemaakt (sessie 11 planning) |

*(Per voltooide split: bestand toevoegen, laadvolgorde, globals bijwerken.)*
