# Sessie 11b — Refactor: `game.js` splits

**Status:** ✅ compleet (sub-stappen A, B, C).

**Voorganger:** [sessie-11-refactor-architecture.md](./sessie-11-refactor-architecture.md) stap 7.

---

## Doel

`js/game.js` (~1800 regels) is de **regels-engine**: één `Game`-class met gedeelde state (putten, boss, mystery, HP). Sessie 11b maakt dit **leesbaarder** zonder gedrag te wijzigen.

| Wat | Verwacht resultaat |
|-----|-------------------|
| `js/game/board-layout.js` | ~80 regels — puur bord-geometrie |
| `js/game/dc.js` *(optioneel)* | ~55 regels — DC / event-stappen helpers |
| `js/game/combat.js` | ~450 regels — attack-roll resolve + finalize |
| `js/game.js` | ~1100–1200 regels — orchestratie blijft hier |

**Geen big-bang.** Na **elke** sub-stap handmatig testen (zelfde checklist als sessie 11).

**Geen bundler** — Optie A: `<script>`-volgorde + `window.*` + `Game.prototype`-mixin voor class-methods.

**Satellite-bestanden (`js/game/*`):** wrap in **IIFE** — klassieke scripts delen één global lexical scope; dubbele `const FINISH_SPACE` etc. geven `SyntaxError`.

---

## Waarom apart van sessie 11?

Sessie 11 richtte zich op **UI** (~4200 regels → `js/ui/*`). Dat leverde de grootste winst op: losse functies, duidelijke domeinen.

`game.js` is anders:

- **Eén class** met mutable state (`ambushPits`, `bossHp`, `revealedSpaces`, …).
- Combat-methods zijn **geen losse functies** — ze lezen/schrijven `this`.
- `resolveSpace` is de centrale router; verder splitsen levert weinig op.

Sessie 11b is daarom **optioneel** en **incrementeel**: eerst makkelijke pure helpers, daarna combat via prototype-mixin.

---

## Principes (zelfde als sessie 11)

| Principe | Toelichting |
|----------|-------------|
| Gedrag first | Refactor = verplaatsen, niet herschrijven |
| Settings blijft leidend | Constanten blijven in `settings.js`; game leest `GAME_SETTINGS` |
| Backwards compat | Alle bestaande `window.*` exports uit `game.js` blijven werken |
| Eén richting | UI → game; game ↛ UI |
| ARCHITECTURE bijwerken | Elke sub-stap: `MD/ARCHITECTURE.md` changelog + laadvolgorde |
| Prototype na class | `game/combat.js` laadt **ná** `game.js` en hangt methods aan `Game.prototype` |

---

## Huidige structuur `game.js` (referentie)

| Regels (ca.) | Domein | Naar |
|--------------|--------|------|
| 1–17 | Settings-destructuring + movement-aliases | blijft in `game.js` (of alleen re-export) |
| 8–10 | `isOnBossArena` | `game.js` (combat + resolveSpace) |
| 19–81 | Spiral, posities, richting | **`game/board-layout.js`** |
| 83–136 | DC / event-stappen helpers | **`game/dc.js`** *(optioneel)* |
| 138–142 | `isCenterCovered` | `board-layout.js` |
| 146–170 | `Game` constructor + state | `game.js` |
| 172–306 | Ambush pit + config copy | `game.js` *(pit ↔ combat)* |
| 308–717 | Combat resolve + finalize | **`game/combat.js`** |
| 719–895 | Boss activate, minions, reveal | `game.js` |
| 897–1079 | Mystery, path, ambush start | `game.js` |
| 1082–1193 | HP: combat fail, repeated dmg, heal, mutate | `applyRepeatedHpDamage` → combat; rest `game.js` |
| 1210–1726 | `move`, `resolveSpace`, `resolveEvent` | `game.js` |
| 1731–1774 | `nextTurn`, `reset` | `game.js` |
| 1777–1796 | `window.*` exports | `game.js` (+ layout/dc exports vanuit satellite-bestanden) |

### Externe afhankelijkheden (buiten `game.js`)

**Game leest (geen UI):**

- `window.GAME_SETTINGS`
- `SPECIAL_SPACES`, `BOSS_POOL`, `pickRandomAmbush`, `pickRandomPath`, `getDefaultBoss`, …

**UI / multiplayer lezen game:**

| Consumer | Gebruikt |
|----------|----------|
| `ui/board.js` | `getPathDirection`, `game.layout`, `game.spacePositions` |
| `ui/players.js` | `getEffectiveDc`, `isOnBossArena`, `game.mutateHp` |
| `ui/modals/combat.js` | `game.buildCombatContext`, `resolveCombat*`, `finalizeCombatRound` |
| `ui/modals/events.js` | `game.resolveEvent`, `resolveMysteryRoll`, `resolveBossReveal` |
| `ui/flow.js`, `ui/tokens.js` | `isOnBossArena`, `game.move` (indirect) |
| `ui/bootstrap.js` | `new Game()`, `game.move` |
| `multiplayer.js` | serialiseert `Game`-state (geen directe combat-imports) |

**Enige UI-lek in game:** `getEffectiveDc` gebruikt `window.getGame?.()?.difficultyLevel` als fallback — blijft zo tot eventueel later refactor.

---

## Uitvoeringsvolgorde

### Sub-stap A — `js/game/board-layout.js` *(laag risico, eerst doen)*

#### Inhoud verplaatsen

- `isCenterCell`, `getCenterAnchor`, `isCenterCovered`
- `buildSpiralLayout`, `buildSpacePositions`, `getPathDirection`

#### Afhankelijkheden

Leest uit `GAME_SETTINGS.board`: `boardSize`, `pathSpaces`, `finishSpace`.

#### Exports (`window`)

```javascript
window.buildSpiralLayout = buildSpiralLayout;
window.buildSpacePositions = buildSpacePositions;
window.getPathDirection = getPathDirection;
window.isCenterCell = isCenterCell;
window.isCenterCovered = isCenterCovered;
window.getCenterAnchor = getCenterAnchor;
```

#### `game.js` na stap A

Constructor blijft:

```javascript
this.layout = buildSpiralLayout();
this.spacePositions = buildSpacePositions(this.layout);
```

Verwijder dubbele functiedefinities; exports onderaan `game.js` kunnen blijven als **doorverwijzing** (backwards compat) of verplaatst naar layout-bestand.

#### Test na stap A

- [ ] Bord rendert identiek (spiral, finish in midden, pijltjes op pad-tegels)
- [ ] Token-animatie richting klopt (`getPathDirection`)

---

### Sub-stap B — `js/game/dc.js` *(optioneel, middelmatige winst)*

#### Inhoud verplaatsen

- `calcEventSuccessSteps`, `applyMovementBonus`
- `getDcBonus`, `getDcModifier`, `getDifficultyDcBonus`, `getEffectiveDc`
- `randomSteps1to3` *(alleen als nog ergens gebruikt)*

#### Blijft in `game.js`

- `isOnBossArena` — combat + `resolveSpace` (niet puur layout/dc)

#### Exports (`window`)

Zelfde set als nu onderaan `game.js` (regels 1783–1794).

#### Test na stap B

- [ ] Event DC-check: difficulty-slider, streak-bonus, `nextDcMod`
- [ ] Geslaagde event → stappen + overshoot in log
- [ ] Combat AC in modal = `getEffectiveDc` (sessie 10)

---

### Sub-stap C — `js/game/combat.js` *(hoogste winst, prototype-mixin)*

#### Inhoud verplaatsen (methods op `Game.prototype`)

| Method | Regels (ca.) |
|--------|--------------|
| `buildCombatContext` | 308–348 |
| `resolveCombatPlayerAttack` | 350–466 |
| `rollCombatEnemyAttack` | 468–479 |
| `resolveCombatEnemyAttack` | 481–566 |
| `resolveCombatSpecialSave` | 568–597 |
| `finalizeCombatRound` | 599–717 |
| `applyCombatCheckFail` | 1082–1089 |
| `applyRepeatedHpDamage` | 1092–1107 |

#### Blijft in `game.js` (pit + boss + orchestratie)

- `copyAmbushConfig`, `copyBossConfig`
- Pit: `getPitAt`, `joinOrStartPit`, `removePlayerFromPit`, …
- Boss: `activateBoss`, `spawnBossMinions`, `resolveBossReveal`, …
- HP-kern: `mutateHp`, `healPlayerToFull`
- `move`, `resolveSpace`, `resolveEvent`, `nextTurn`, `reset`

`finalizeCombatRound` roept methods aan die in `game.js` blijven (`resetMysterySpace`, `checkWinAfterBoss`, `clearPitAt`, …) — dat werkt via `this` op hetzelfde prototype.

#### Patroon (geen bundler)

```javascript
// js/game/combat.js — laadt NA js/game.js
(function () {
  const { getEffectiveDc } = window; // dc.js of game.js

  Object.assign(Game.prototype, {
    buildCombatContext(type, options = {}) { /* … */ },
    resolveCombatPlayerAttack(ctx, roll, options = {}) { /* … */ },
    // …
  });
})();
```

**Niet** combat als losse functies `(game, ctx)` — dat zou ~400 regels `game.` prefix geven zonder voordeel.

#### Test na stap C

Volledige sessie-10 combat-checklist:

- [ ] Ambush: speler hit/miss, vijand hit/miss/nat20/nat1, death stopt overflow
- [ ] Mystery-ambush: na win → vak terug ❓
- [ ] Boss minion one-shot → volgende minion
- [ ] Boss special save (25% kans)
- [ ] Boss verslagen → win-check op 63

---

## Doelstructuur na sessie 11b

```
js/
  settings.js
  events-data.js
  game/
    board-layout.js     ← sub-stap A
    dc.js               ← sub-stap B (optioneel)
    combat.js           ← sub-stap C
  game.js               ← Game class + orchestratie + window exports
  multiplayer.js
  ui/ …
```

---

## Laadvolgorde (`index.html`)

**Na volledige sessie 11b:**

```html
<script src="js/settings.js"></script>
<script src="js/events-data.js"></script>
<script src="js/game/board-layout.js"></script>
<script src="js/game/dc.js"></script>          <!-- optioneel -->
<script src="js/game.js"></script>
<script src="js/game/combat.js"></script>      <!-- ná Game class -->
<script src="js/multiplayer.js"></script>
<!-- ui/* ongewijzigd -->
```

Comment boven script-blok bijwerken (zoals nu regel 450 in `index.html`).

**Minimaal (alleen A):**

```
settings → events-data → game/board-layout.js → game.js → multiplayer → ui/*
```

---

## Wat bewust **niet** splitsen

| Onderdeel | Reden |
|-----------|--------|
| `resolveSpace` | Centrale router; raakt mystery, boss, ambush, healer, events |
| Pit-logica (`joinOrStartPit`, …) | Verweven met mystery + combat context |
| Mystery / `revealedSpaces` | Muteren `SPECIAL_SPACES` + board sync |
| `mutateHp` | Kruispunt HP/death — combat én events |
| `events-data.js` content | Buiten scope (zelfde als sessie 11) |

Verder splitsen → veel parameters, weinig leesbaarheidswinst.

---

## Risico's & mitigatie

| Risico | Mitigatie |
|--------|-----------|
| Dubbele `const` in script-scope | Satellite-bestanden (`game/*`) in **IIFE** — anders `SyntaxError: already been declared` |
| Script-volgorde: combat vóór `Game` | `combat.js` altijd ná `game.js`; comment in `index.html` |
| Vergeten prototype-method | Na split: grep `game\.(buildCombat\|resolveCombat\|finalizeCombat)` — moet nog werken |
| Dubbele exports | Eén bron per global; `game.js` mag doorverwijzen |
| `getEffectiveDc` / layout undefined | Satellite-bestanden vóór `game.js` |
| Multiplayer break | Host + gast test na sub-stap C |
| Prototype + `instanceof Game` | Geen wijziging — zelfde class, methods alleen verplaatst |

---

## Handmatige testchecklist (na elke sub-stap)

Minimaal (sessie 11):

1. [ ] Speler toevoegen, 2×D6 bewegen
2. [ ] Normaal event (DC-check)
3. [ ] ❓ mystery → pad of ambush
4. [ ] Ambush attack-roll (hit + miss + vijand-fase)
5. [ ] Genezer vak **56** → vol HP
6. [ ] Boss D12 → minion(s) → boss → win op 63
7. [ ] Death (respawn vol `DEFAULT_HP`, geen HP-overflow)
8. [ ] *(optioneel)* Multiplayer: host zet, gast ziet modal + tokens

Extra na sub-stap A:

- [ ] Pad-pijltjes op bord kloppen op bochten

Extra na sub-stap C:

- [ ] Volledige sessie-10 combat-flow (zie [sessie-10-attack-roll-combat.md](./sessie-10-attack-roll-combat.md))

---

## Agent-checklist (per sub-stap)

1. Code **kopiëren** (niet herschrijven), imports via bestaande globals
2. `index.html` laadvolgorde + comment
3. `MD/ARCHITECTURE.md` — bestanden, laadvolgorde, changelog
4. `MD/sessie-11-refactor-architecture.md` voortgangstabel stap 7
5. Grep op verplaatste functienamen — geen dangling references
6. Gebruiker vraagt om handmatige test vóór volgende sub-stap

---

## Bewust buiten scope (sessie 11b)

- ES modules / Vite bundler
- TypeScript
- Unit tests / test runner
- Herschrijven combat- of movement-regels
- `events-data.js` opsplitsen
- `window.Ganzenbord` namespace (tenzij globals echt storend worden)
- Oplossen van `getEffectiveDc` → `window.getGame` UI-lek

---

## ROI-inschatting

| Sub-stap | Regels uit `game.js` | Risico | Aanbeveling |
|----------|----------------------|--------|-------------|
| A board-layout | ~80 | Laag | **Doen** |
| B dc | ~55 | Laag | Optioneel; nette groepering |
| C combat | ~450 | Medium | Doen als je combat vaak aanpast |
| Orchestratie in `game.js` | ~1100 blijft | — | Acceptabel |

---

## Gerelateerd

| Onderwerp | MD |
|-----------|-----|
| Hoofd-refactor (sessie 11) | [sessie-11-refactor-architecture.md](./sessie-11-refactor-architecture.md) |
| Architectuur (levend) | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| Attack-roll combat | [sessie-10-attack-roll-combat.md](./sessie-10-attack-roll-combat.md) |
| Ambush / putten | [sessie-4-ambush.md](./sessie-4-ambush.md) |
| Boss D12 / minions | [sessie-8-boss-d12.md](./sessie-8-boss-d12.md) |

---

## Voortgang

| Sub-stap | Status | Datum |
|----------|--------|-------|
| A `game/board-layout.js` | ✅ | 2025-06 |
| B `game/dc.js` *(optioneel)* | ✅ | 2025-06 |
| C `game/combat.js` | ✅ | 2025-06 |
| ARCHITECTURE + sessie-11 stap 7 afgevinkt | ✅ | 2025-06 |
