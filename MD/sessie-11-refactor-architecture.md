# Sessie 11 — Refactor: settings, splits & architectuur

**Status:** gepland (nog niet uitgevoerd)

## Doel

De codebase is gegroeid tot **~8000 regels JS** (`ui.js` ~4200, `game.js` ~1800, `events-data.js` ~1640). Sessie 11 maakt het project **onderhoudbaarder** zonder gedrag te wijzigen:

1. **`settings.js`** — één plek voor tune-bare constanten (HP, bord, ratios, …).
2. **Incrementele splits** — vooral `ui.js`, later `game.js`.
3. **`MD/ARCHITECTURE.md`** — levend naslagwerk voor mens én agent.

**Geen big-bang.** Na **elke** stap handmatig testen (zie testchecklist onderaan).

**Geen bundler** — Optie A: `<script>`-volgorde + `window.*` (zoals nu).

---

## Principes

| Principe | Toelichting |
|----------|-------------|
| Gedrag first | Refactor = verplaatsen, niet herschrijven |
| Settings vóór splits | Geen UI/game split zolang constanten verspreid staan |
| Backwards compat | Bestaande `window.DEFAULT_HP` etc. blijven werken (aliases uit settings) |
| Eén richting | UI → game; game ↛ UI |
| ARCHITECTURE bijwerken | Elke split: `MD/ARCHITECTURE.md` changelog + bestandslijst |

---

## Uitvoeringsvolgorde

### Stap 1 — `MD/ARCHITECTURE.md` (skelet)

- [x] Skelet met huidige bestanden, laadvolgorde, globals, geplande structuur
- [ ] Per volgende stap: changelog + concrete bestandsverantwoordelijkheden invullen

**Waarom eerst:** na 10 sessies is dit het eerste wat een nieuwe agent nodig heeft — ook vóór code verplaatst wordt.

---

### Stap 2 — `js/settings.js` (single source of truth)

**Geen enkel UI- of game-bestand splitsen vóór deze stap is af.**

#### Wat naar settings

| Categorie | Huidige locatie | Voorbeelden |
|-----------|-----------------|-------------|
| Bord | `game.js` | `TOTAL_SPACES`, `FINISH_SPACE`, `BOSS_SPACE`, `PATH_SPACES`, `BOARD_SIZE` |
| Speler | `game.js` | `DEFAULT_HP`, `DEFAULT_MAX_HP` |
| Beweging / events | `game.js` | `BASE_SUCCESS_STEPS`, `OVERSHOOT_DIVISOR` |
| Boss | `game.js` | `BOSS_HP_PER_PLAYER` |
| Difficulty | `game.js` | `DC_DIFFICULTY_MAX_LEVEL` |
| Bord-generatie | `events-data.js` | `PATH_RATIO`, `AMBUSH_RATIO`, `HEALER_SPACE` |
| UI tune | `ui.js` | `COLORS`, `MYSTERY_CELL_ANIM_MS`, max spelers (8) |

#### Wat **niet** naar settings

- `EVENT_POOL`, `PATH_TILES`, boss/ambush **content** (flavor, DC, namen) → blijft `events-data.js`
- HTML / modal-teksten → UI of `index.html`
- Firebase-config → `firebase.js`

#### Voorgestelde structuur

```javascript
const GAME_SETTINGS = {
  board: {
    totalSpaces: 63,
    finishSpace: 63,
    bossSpace: 62,
    pathSpaces: 62,
    boardSize: 9,
    healerSpace: 56,
  },
  player: {
    startHp: 3,
    maxHp: 6,
    maxPlayers: 8,
  },
  movement: {
    baseSuccessSteps: 1,
    overshootDivisor: 2,
  },
  boss: {
    hpPerPlayer: 3,
  },
  difficulty: {
    maxLevel: 5,
  },
  boardGen: {
    pathRatio: 0.38,
    ambushRatio: 0.08,
  },
  ui: {
    playerColors: ['#e74c3c', …],
    mysteryAnimMs: { reveal: 720, reset: 580 },
  },
};

window.GAME_SETTINGS = GAME_SETTINGS;

// Backwards compat — game.js / ui.js blijven werken:
window.DEFAULT_HP = GAME_SETTINGS.player.startHp;
window.DEFAULT_MAX_HP = GAME_SETTINGS.player.maxHp;
// … etc.
```

#### Laadvolgorde na stap 2

```html
<script src="js/settings.js"></script>
<script src="js/events-data.js"></script>
<script src="js/game.js"></script>
<script src="js/multiplayer.js"></script>
<script src="js/ui.js"></script>
```

`events-data.js` leest `GAME_SETTINGS.boardGen.pathRatio` i.p.v. lokale `const PATH_RATIO`.

#### Test na stap 2

- [ ] Nieuw avontuur → bord ziet er identiek uit
- [ ] Wijzig `startHp` in settings → nieuwe speler pakt waarde
- [ ] Genezer op vak 56 → heelt naar `maxHp` uit settings
- [ ] `window.DEFAULT_HP` nog bruikbaar voor log-teksten in ui

---

### Stap 3 — `ui/log.js`

- `describeEvents`, `addLog`, `prependLogEntry`
- Weinig afhankelijkheden; roept `renderBoard` / `renderPlayers` aan via bestaande globals

**Test:** event, combat, death, healer — logregels kloppen.

---

### Stap 4 — `ui/tokens.js`

- Token layer, `animateFromEvents`, `syncTokensAfterEvents`, multiplayer position-diff
- Globale `tokensAnimating` → later `ui/state.js`

**Test:** zet, bounce, death, boss-gevecht zonder retreat, multiplayer gast-animatie.

---

### Stap 5 — `ui/modals/combat.js`

- Grootste winst qua leesbaarheid (~800 regels)
- Combat flow state, fases, `finishCombatRound`, enemy Hit/Miss, special save
- Deel gedeelde modal-helpers blijven in `ui/modals/core.js` of tijdelijk in ui.js tot stap 6

**Test:** volledige sessie-10 checklist (ambush, minion, boss, samenvatting, minion one-shot).

---

### Stap 6 — Overige UI-modals + core

| Bestand | Inhoud |
|---------|--------|
| `ui/modals/core.js` | scroll lock, spectator sync, `playModalCardEnter`, serialize modal |
| `ui/modals/events.js` | event, mystery, boss-reveal, path/healer, win |
| `ui/board.js` | `renderBoard`, mystery cell effects |
| `ui/players.js` | player list, combat rail, HP controls |
| `ui/flow.js` | `continueAfterLand`, `advanceTurn`, `handleMoveResult` |
| `ui/dom.js` | `els`, parse helpers |
| `ui/state.js` | `activeAmbush`, `activeBoss`, … |
| `ui/bootstrap.js` | `new Game()`, event listeners |

**Test:** mystery D12, boss D12, normale events, path, regels-modal, nieuw avontuur.

---

### Stap 7 — `game.js` splits (optioneel, laatste)

| Bestand | Inhoud |
|---------|--------|
| `js/game/combat.js` | `resolveCombat*`, `finalizeCombatRound`, `applyRepeatedHpDamage` |
| `js/game/board-layout.js` | spiral, `buildSpacePositions` |
| `js/game.js` | `Game` class, `resolveSpace`, `move`, exports |

**Test:** zelfde als combat + movement + win/lose.

---

## `ui.js` — huidige clusters (referentie)

~100 functies; grofweg:

| Regelbereik (ca.) | Domein |
|-------------------|--------|
| 1–110 | DOM refs, modals shell, rules |
| 261–430 | Board render, mystery cell FX |
| 446–820 | **Tokens / animatie** |
| 822–1200 | Players, combat rail, turn UI |
| 1271–1570 | **Log / describeEvents** |
| 1633–2400 | **Combat modal + flow** |
| 2400–3600 | Event/mystery/boss/path modals |
| 3550–4100 | Flow + **bootstrap listeners** |

---

## Risico's & mitigatie

| Risico | Mitigatie |
|--------|-----------|
| Script-volgorde fout | Vaste lijst in `ARCHITECTURE.md`; comment in `index.html` |
| Dubbele constanten | Settings-first; grep op `DEFAULT_HP` / `PATH_RATIO` na migratie |
| Circular deps | UI mag game aanroepen, niet omgekeerd |
| Multiplayer break | Na elke split: host + gast, modal sync |
| Vergeten global | Backwards-compat aliases op `window` houden tot alles gemigreerd is |

---

## Handmatige testchecklist (na elke stap)

Minimaal dit pad doorlopen:

1. [ ] Speler toevoegen, 2×D6 bewegen
2. [ ] Normaal event (DC-check)
3. [ ] ❓ mystery → pad of ambush
4. [ ] Ambush attack-roll (hit + miss + vijand-fase)
5. [ ] Genezer vak **56** → vol HP
6. [ ] Boss D12 → minion(s) → boss → win op 63
7. [ ] Death (overflow-fix: respawn vol `DEFAULT_HP`)
8. [ ] *(optioneel)* Multiplayer: host zet, gast ziet modal + tokens

---

## Bewust buiten scope (sessie 11)

- ES modules / Vite bundler
- TypeScript
- Unit tests / test runner
- Herschrijven combat-regels
- `events-data.js` content opsplitsen (pool blijft één bestand tenzij later gewenst)

---

## Gerelateerd

- Architectuur (levend): `MD/ARCHITECTURE.md`
- Combat (recent): `MD/sessie-10-attack-roll-combat.md`
- Tokens: `MD/sessie-9-token-animatie.md`
- Multiplayer sync: `MD/sessie-6-multiplayer.md`

---

## Voortgang

| Stap | Status | Datum |
|------|--------|-------|
| 1 ARCHITECTURE skelet | ✅ | 2025-06 |
| 2 settings.js | ✅ | 2025-06 |
| 3 ui/log.js | ✅ | 2025-06 |
| 3b ui/state.js | ✅ | 2025-06 |
| 4 ui/tokens.js | ✅ | 2025-06 |
| 5 ui/modals/combat.js | ✅ | 2025-06 |
| 6 overige UI splits | ⬜ | |
| 7 game splits | ⬜ | |
