# Ganzenbord — architectuur (levend document)

**Status:** skelet (sessie 11) — per refactor-split aanvullen.

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

## Bestanden (huidige situatie — vóór refactor)

| Bestand | ~regels | Verantwoordelijkheid |
|---------|---------|----------------------|
| `js/settings.js` | — | *(gepland)* tune-bare constanten — **single source of truth** |
| `js/events-data.js` | ~1640 | Event-pool, boss/ambush data, `buildSpecialSpaces()` |
| `js/game.js` | ~1800 | `Game` class, regels, combat resolve, bord-layout helpers |
| `js/multiplayer.js` | ~370 | Serialize/deserialize game state, Firebase sync |
| `js/ui.js` | ~4180 | DOM, bord, tokens, modals, combat-UI, log, bootstrap |
| `js/firebase.js` | ~80 | Firebase init (ES module) |

### Laadvolgorde (`index.html`)

```
firebase.js (module)
→ events-data.js
→ game.js
→ multiplayer.js
→ ui.js
```

*(Na sessie 11 stap 2: `settings.js` vóór `events-data.js`.)*

---

## Globals — publieke API (niet alles refactoren)

### Game / regels (`game.js` → `window`)

- `Game`, `TOTAL_SPACES`, `FINISH_SPACE`, `BOSS_SPACE`
- `DEFAULT_HP`, `DEFAULT_MAX_HP`, `BASE_SUCCESS_STEPS`, `OVERSHOOT_DIVISOR`
- `getEffectiveDc`, `getDcBonus`, `applyMovementBonus`, `isOnBossArena`, …

### Bord-data (`events-data.js` → `window`)

- `SPECIAL_SPACES`, `EVENT_POOL`, `BOSS_POOL`, `AMBUSH_POOL`
- `HEALER_SPACE`, `HEALER_TILE`, `pickRandomAmbush`, `pickRandomBoss`, …

### Multiplayer (`multiplayer.js` → `window`)

- `syncAfterAction`, `isMultiplayerHost`, `getActiveModal`, `refreshGameUIFromRemote`, …

### UI (`ui.js` → deels `window`)

- `game` instantie (lokaal in ui.js, state via serialize)
- Modal sync hooks gebruikt door multiplayer

*(Lijst uitbreiden per split.)*

---

## Geplande mapstructuur (doelbeeld)

```
js/
  settings.js              ← stap 2
  events-data.js           ← blijft content; ratios uit settings
  game.js                  ← slanker; combat/layout later splits
  game/
    combat.js              ← (later) resolveCombat*, finalizeCombatRound
    board-layout.js        ← (later) spiral, space positions
  multiplayer.js
  ui/
    dom.js                 ← (later) els, parse helpers
    state.js               ← (later) activeAmbush, activeBoss, flow flags
    board.js
    tokens.js
    players.js
    log.js
    flow.js                ← continueAfterLand, advanceTurn
    modals/
      core.js
      combat.js
      events.js            ← event, mystery, boss-reveal, path/healer
    bootstrap.js           ← new Game(), addEventListener
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

## Gedeelde UI-state (nu in `ui.js`)

| Variabele | Doel |
|-----------|------|
| `activeAmbush` / `activeBoss` / `activeBossMinion` | Combat-modal flow |
| `activeEvent` / `activeMystery` / `activeBossReveal` | Overige modals |
| `tokensAnimating` | Blokkeert dobbelsteen-input |
| `syncedActiveModal` | Multiplayer spectator sync |
| `pathModalCallback` / `pathModalSpaceNum` | Path/healer modal |

*(Na split: documenteer in `ui/state.js`.)*

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
| Event-auteur | `js/EVENTS.md` |

---

## Changelog (architectuur)

| Datum | Wijziging |
|-------|-----------|
| 2025-06 | Skelet aangemaakt (sessie 11 planning) |

*(Per voltooide split: bestand toevoegen, laadvolgorde, globals bijwerken.)*
