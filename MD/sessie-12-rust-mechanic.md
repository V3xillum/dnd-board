# Sessie 11c — Rust mechanic (Short & Long Rest)

**Status:** nog te bouwen

## Doel
Spelers kunnen een beurt opofferen om te rusten en HP te herstellen. Short rest geeft een kleine D4 heal, long rest geeft full heal maar is extreem schaars. Bewust zwakker dan de healer cabin op vak 56.

---

## Spelregels

### Short Rest
- Speler slaat zijn beurt over (geen dobbelsteen).
- Herstel: gooi een **D4** → `mutateHp(player, roll)`.
- **Limiet:** max **2× per leven** (reset bij death naar start).
- Speler kiest zelf of hij rust — geen automatische trigger.

### Long Rest
- Speler slaat zijn beurt over.
- Herstel: terug naar **max HP** (`mutateHp(player, player.maxHp - player.hp)`).
- **Limiet:** max **1× per run** — niet per death, over het hele spel.
- Beschikbaar zolang `player.longRestUsed === false`.

### Heal-niveaus (overzicht)

| Mechanic | Herstel | Limiet |
|----------|---------|--------|
| Short rest | D4 | 2× per leven |
| Long rest | Max HP | 1× per run |
| Healer cabin (vak 56) | Max HP | Altijd (vak moet bereikt worden) |

---

## Nieuwe speler-velden

Toevoegen aan `addPlayer()`:

| Veld | Startwaarde | Reset bij death | Reset bij nieuw spel |
|------|-------------|-----------------|----------------------|
| `shortRestsUsed` | `0` | Ja → `0` | Ja |
| `longRestUsed` | `false` | **Nee** | Ja |

`shortRestsUsed` reset in de death-flow (`mutateHp` bij `hp <= 0`).
`longRestUsed` reset alleen in `game.reset()`.

---

## UI

### Beurt-paneel (sidebar)

Voeg twee knoppen toe onder de dobbelsteen-sectie:

```
[ Short Rest (D4) — nog 2× ]    [ Long Rest (vol HP) ]
```

- **Short rest knop:** disabled als `shortRestsUsed >= 2` of `hp >= maxHp`
- **Long rest knop:** disabled als `longRestUsed === true` of `hp >= maxHp`
- Beide knoppen: disabled als niet jouw beurt, spel afgelopen, in put, of in boss-arena
- Label toont resterende uses: "Short Rest (nog 1×)"

### D4-invoer

Bij short rest: toon een kleine modal of inline invoer voor de D4 worp (1–4). Speler gooit fysiek en vult in — zelfde patroon als dobbelsteen.

Alternatief: app rolt automatisch D4 (geen fysieke dobbelsteenworp nodig voor heal). **Kies één aanpak en documenteer.**

### Log

| Event type | Bericht |
|------------|---------|
| `short-rest` | `[naam] neemt een korte rust — herstelt X HP (D4: Y)` |
| `long-rest` | `[naam] neemt een lange rust — volledig hersteld` |

---

## `game.js`

### `takeShortRest(player, d4Roll)`

```javascript
// Validatie
if (player.shortRestsUsed >= 2) return { events: [], valid: false };
if (player.hp >= player.maxHp) return { events: [], valid: false };

// Uitvoering
player.shortRestsUsed += 1;
mutateHp(player, d4Roll);  // centrale mutatie
events.push({ type: 'short-rest', player: player.name, roll: d4Roll, shortRestsUsed: player.shortRestsUsed });

// Beurt voorbij
passTurn = true;
```

### `takeLongRest(player)`

```javascript
if (player.longRestUsed) return { events: [], valid: false };
if (player.hp >= player.maxHp) return { events: [], valid: false };

player.longRestUsed = true;
const delta = player.maxHp - player.hp;
mutateHp(player, delta);
events.push({ type: 'long-rest', player: player.name, longRestUsed: true });

passTurn = true;
```

### Death-flow aanpassing (`mutateHp`)

Bij death: `player.shortRestsUsed = 0` (reset short rest teller).
`longRestUsed` blijft `true` na death — niet resetbaar binnen een run.

### `reset()`

`shortRestsUsed = 0`, `longRestUsed = false` voor alle spelers.

---

## Beurt-flow

Rust vervangt de hele beurt — geen dobbelsteen daarna:

```
Speler klikt Short/Long Rest
  → validatie
  → D4 invoer (short) of direct (long)
  → mutateHp
  → log
  → advanceTurn()
  → syncAfterAction()
```

Rust is **niet** mogelijk tijdens:
- Actieve ambush put (`isCurrentPlayerInAmbush()`)
- Boss arena (`isOnBossArena()`)
- Open modal

---

## Multiplayer

- Rust-knoppen alleen zichtbaar/actief voor speler aan beurt (host in Fase A/B)
- `shortRestsUsed` en `longRestUsed` zitten al in `serializeGame()` via player-object
- `syncAfterAction()` na rust → guests zien bijgewerkte HP en log

---

## Handmatige testchecklist

- [ ] Short rest knop zichtbaar en actief als `shortRestsUsed < 2` en `hp < maxHp`
- [ ] Short rest → D4 invoer → HP omhoog → beurt voorbij
- [ ] Short rest 2× gebruikt → knop disabled voor rest van leven
- [ ] Death → `shortRestsUsed` reset naar 0 → knop weer actief
- [ ] Long rest knop actief als `!longRestUsed` en `hp < maxHp`
- [ ] Long rest → full heal → `longRestUsed = true`
- [ ] Death → `longRestUsed` blijft `true`
- [ ] Nieuw avontuur → beide knoppen reset
- [ ] In put of boss-arena → beide knoppen disabled
- [ ] Multiplayer: guest ziet HP-update na rust van host

---

## Balans-notities

- D4 heal op max HP 6 = gemiddeld 2.5 HP per short rest — bewust bescheiden
- Long rest 1× per run maakt het een echt strategisch moment
- Als uit speelervaring blijkt dat spelers te veel doodgaan: overweeg short rest limiet verhogen naar 3× of D4 naar D6
- Healer cabin (vak 56) blijft de sterkste heal-optie omdat die altijd beschikbaar is maar bereikt moet worden

---

## Afhankelijkheden

| Sessie | Nodig voor |
|--------|------------|
| 1 | `mutateHp`, death-flow, player-object |
| Refactor | Player-velden in `serializeGame` (settings.js / game.js) |

## Gerelateerd
- HP systeem: `MD/hp-systeem.md`
- Healer cabin: vak 56 in `MD/sessie-3-boss-win.md` (omgebouwd van kamp)
- Multiplayer sync: `MD/sessie-5-multiplayer.md`
