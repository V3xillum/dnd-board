# Sessie 12 — Rust mechanic (Short & Long Rest)

**Status:** nog te bouwen

**Voorganger:** sessie 11 + 11b (UI-refactor + `game.js`-splits) — ✅ compleet.

## Doel
Spelers kunnen een beurt opofferen om te rusten en HP te herstellen. Short rest geeft een kleine D4 heal, long rest geeft full heal maar is extreem schaars. Bewust zwakker dan de genezer op vak 56.

---

## Spelregels

### Short Rest
- Speler slaat zijn beurt over (geen dobbelsteen).
- Herstel: speler gooit fysiek een **D4** en vult het resultaat in (1–4) → `mutateHp(player, roll)`.
- **Limiet:** max **2× per leven** (reset bij death naar start).
- Speler kiest zelf of hij rust — geen automatische trigger.

### Long Rest
- Speler slaat zijn beurt over.
- Herstel: terug naar **max HP** via `healPlayerToFull(player, events)` — zelfde helper als genezer vak 56.
- **Limiet:** max **1× per run** — niet per death, over het hele spel.
- Beschikbaar zolang `player.longRestUsed === false`.

### Dobbelsteen-conventie
| Wie rolt | Wie vult in |
|----------|-------------|
| Speler (D6, D4, D20, D12, …) | Speler — handmatige invoer in UI |
| Vijand (attack roll, saving throw) | Systeem — host adjudiceert of app rolt |

Short rest valt in de eerste categorie: **eigen D4-invoer**, geen auto-roll.

### Heal-niveaus (overzicht)

| Mechanic | Herstel | Limiet | Kost beurt? |
|----------|---------|--------|-------------|
| Short rest | D4 | 2× per leven | Ja |
| Long rest | Max HP | 1× per run | Ja |
| Genezer (vak 56) | Max HP | Onbeperkt (vak bereiken) | Nee (landing) |

---

## Nieuwe speler-velden

Toevoegen aan `addPlayer()` in `js/game.js`:

| Veld | Startwaarde | Reset bij death | Reset bij nieuw spel |
|------|-------------|-----------------|----------------------|
| `shortRestsUsed` | `0` | Ja → `0` | Ja |
| `longRestUsed` | `false` | **Nee** | Ja |

- `shortRestsUsed` reset in de death-flow (`mutateHp` bij `hp <= 0`) — geldt ook voor handmatige HP-minus via sidebar.
- `longRestUsed` blijft `true` na death; reset alleen bij **nieuw avontuur** (`reset()` → `players = []` → nieuwe spelers via `addPlayer()` met defaults).

---

## Bestanden (post-refactor 11b)

| Bestand | Wat |
|---------|-----|
| `js/game.js` | `addPlayer()`, `mutateHp` (death-reset), `healPlayerToFull()`, `takeShortRest()`, `takeLongRest()` |
| `index.html` | Rust-knoppen + D4-invoerveld in beurt-paneel |
| `js/ui/players.js` | `updateTurnUI()` — disable-logica, labels ("nog 1×") |
| `js/ui/bootstrap.js` | Click-handlers, D4-validatie, `setMultiplayerReadOnly` |
| `js/ui/flow.js` | `advanceTurn()` na rust |
| `js/ui/log.js` | `describeEvents()` — cases `short-rest` / `long-rest` |
| `js/multiplayer.js` | `serializeGame()` — velden gaan automatisch mee via player-object |

Geen apart `js/game/rest.js` — te klein voor een satellite-bestand.

---

## UI

### Beurt-paneel (sidebar)

Voeg toe onder de dobbelsteen-sectie in `index.html`:

```
[ Short Rest (D4) — nog 2× ]    [ Long Rest (vol HP) ]
<label>D4 worp <input min="1" max="4"> </label>   ← zichtbaar/actief bij short rest
```

- **Short rest knop:** disabled als `shortRestsUsed >= 2` of `hp >= maxHp`
- **Long rest knop:** disabled als `longRestUsed === true` of `hp >= maxHp`
- **Beide knoppen** ook disabled als:
  - Niet jouw beurt / spel afgelopen
  - In put (`isCurrentPlayerInAmbush()`)
  - Boss arena (`isOnBossArena()`)
  - Open modal (`modalNeedsInput` — zelfde patroon als dobbelsteen in `updateTurnUI`)
  - Token-animatie (`tokensAnimating`)
  - **Bonus worp actief** (`game.pendingEventBonusMove`)
- Label toont resterende uses: `Short Rest (nog 1×)`

D4-invoer: inline in sidebar (niet modal), zelfde patroon als 2×D6. Speler klikt Short Rest → valideert D4 → bevestigt.

### Multiplayer guest
In `setMultiplayerReadOnly()` (`bootstrap.js`): rust-knoppen + D4-input disablen voor guests — zelfde als move/dice/hp-knoppen.

---

## Log — aparte events, geen dubbele HP-regels

Short rest en long rest krijgen **elk hun eigen logregel**. Geen extra `hp-change`-regel in het avonturenlog.

| Event type | Wanneer | Bericht |
|------------|---------|---------|
| `short-rest` | Na short rest | `[naam] neemt een korte rust — herstelt X HP (D4: Y)` |
| `long-rest` | Na long rest | `[naam] neemt een lange rust — volledig hersteld (X → Y HP)` |

**Geen dubbele logging:** `mutateHp` / `healPlayerToFull` pushen intern nog steeds `hp-change` (en bij long rest `full-heal`) voor consistentie in de event-batch, maar in `describeEvents()` (`log.js`):

- `case 'short-rest'` → eigen bericht; **`hp-change` in dezelfde batch overslaan** als er een `short-rest` bij zit
- `case 'long-rest'` → eigen bericht; **`hp-change` en `full-heal` overslaan** als er een `long-rest` bij zit

Zelfde patroon als genezer: `full-heal` is al een lege case; genezer toont alleen `healer-visit`.

---

## `js/game.js`

### `takeShortRest(player, d4Roll)`

```javascript
// Validatie
if (player.shortRestsUsed >= 2) return { events: [], valid: false };
if (player.hp >= player.maxHp) return { events: [], valid: false };
if (d4Roll < 1 || d4Roll > 4) return { events: [], valid: false };

const events = [];
player.shortRestsUsed += 1;
const hpEvents = this.mutateHp(player, d4Roll);
const healed = hpEvents.find((e) => e.type === 'hp-change');

events.push({
  type: 'short-rest',
  player: player.name,
  roll: d4Roll,
  from: healed?.from ?? player.hp,
  to: healed?.to ?? player.hp,
  delta: healed?.delta ?? 0,
  shortRestsUsed: player.shortRestsUsed,
});
events.push(...hpEvents);

return { events, valid: true, passTurn: true };
```

### `takeLongRest(player)`

```javascript
if (player.longRestUsed) return { events: [], valid: false };
if (player.hp >= player.maxHp) return { events: [], valid: false };

const events = [];
player.longRestUsed = true;
const healInfo = this.healPlayerToFull(player, events);

events.push({
  type: 'long-rest',
  player: player.name,
  from: healInfo.from,
  to: healInfo.to,
  longRestUsed: true,
});

return { events, valid: true, passTurn: true };
```

`healPlayerToFull` pusht `hp-change` + `full-heal` in `events` — log.js filtert die weg via `long-rest` case.

### Death-flow aanpassing (`mutateHp`)

Bij death (`hp <= 0`): `player.shortRestsUsed = 0`.
`longRestUsed` blijft ongewijzigd.

### `reset()`

`reset()` doet `this.players = []`. Nieuwe spelers krijgen via `addPlayer()` weer `shortRestsUsed: 0` en `longRestUsed: false`. Geen aparte veld-reset nodig in `reset()` zelf.

---

## Beurt-flow

Rust vervangt de hele beurt — geen dobbelsteen daarna:

```
Speler klikt Short Rest / Long Rest
  → validatie (game + UI disable)
  → D4 invoer (short) of direct (long)
  → game.takeShortRest / takeLongRest
  → describeEvents (alleen short-rest / long-rest zichtbaar)
  → renderPlayers / updateTurnUI
  → advanceTurn()          // js/ui/flow.js
  → syncAfterAction()
```

Handler in `bootstrap.js`; roept `advanceTurn()` aan (definitief in `flow.js`, laadt na `events.js`).

Rust is **niet** mogelijk tijdens:
- Actieve ambush put
- Boss arena
- Open modal
- Token-animatie
- **Bonus worp** (`pendingEventBonusMove`)

---

## Multiplayer

- Rust-knoppen alleen actief voor host (Fase A/B); guests read-only via `setMultiplayerReadOnly`
- `shortRestsUsed` en `longRestUsed` zitten in `serializeGame()` via het player-object — geen extra serialisatie nodig
- `syncAfterAction()` na rust → guests zien bijgewerkte HP, spelerlijst en log

---

## Handmatige testchecklist

- [ ] Short rest knop actief als `shortRestsUsed < 2` en `hp < maxHp`
- [ ] Short rest → D4 invoer (1–4) → HP omhoog → **één** logregel (`short-rest`) → beurt voorbij
- [ ] Short rest 2× gebruikt → knop disabled voor rest van leven
- [ ] Death → `shortRestsUsed` reset naar 0 → knop weer actief
- [ ] Long rest actief als `!longRestUsed` en `hp < maxHp`
- [ ] Long rest → full heal → `longRestUsed = true` → **één** logregel (`long-rest`)
- [ ] Death → `longRestUsed` blijft `true`
- [ ] Nieuw avontuur → beide tellers reset (via nieuwe spelers)
- [ ] In put, boss-arena, open modal, token-animatie → knoppen disabled
- [ ] **Bonus worp actief** → rust-knoppen disabled
- [ ] Multiplayer guest: rust-knoppen disabled; guest ziet HP/log na host-actie

---

## Balans-notities

- D4 heal op max HP 6 = gemiddeld 2.5 HP per short rest — bewust bescheiden
- Long rest 1× per run maakt het een echt strategisch moment
- Genezer (vak 56) blijft sterker: geen beurt kosten, onbeperkt gebruik zolang je het vak bereikt
- Als spelers te vaak doodgaan: overweeg short rest limiet 3× of D4 → D6

---

## Afhankelijkheden

| Sessie / module | Nodig voor |
|-----------------|------------|
| Sessie 1 | `mutateHp`, death-flow, player-object — `js/game.js` |
| Sessie 3 | Genezer vak 56, `healPlayerToFull()` — `js/game.js` |
| Sessie 5 | `serializeGame`, `syncAfterAction` — `js/multiplayer.js` |
| Sessie 11 + 11b | UI-modules (`js/ui/*`), `updateTurnUI`, `advanceTurn` in `flow.js` |

## Gerelateerd
- HP systeem: `MD/hp-systeem.md` *(maxHp in code = 6 via `settings.js`)*
- Genezer vak 56: `MD/sessie-3-boss-win.md`
- Multiplayer sync: `MD/sessie-5-multiplayer.md`
- Architectuur: `MD/ARCHITECTURE.md`
