# Sessie 4 — Ambush: de put

**Status:** geïmplementeerd (naslag)

## Doel
Ambush-vakjes zijn **de put** van dit ganzenbord: je valt erin en komt er niet uit door verder te lopen. Je vecht de **ambusher** uit met één worp per beurt (succes of faal) tot de **gedeelde vijand-HP** op 0 is of jij op 0 HP valt (death). Pas daarna mag die speler weer normaal spelen (2× D6, events, enz.).

Dit is géén snelle one-shot check met movement — het is een **vastgezette gevechtsmodus**, vergelijkbaar met de boss (sessie 3), maar per vak (`ambushPits`) en op willekeurige vakjes 2–61.

---

## Spelregels (zoals gebouwd)

### Per vak: één put
State: `game.ambushPits[spaceNum]` = `{ config, hp, maxHp, playerIds[] }`.

| Situatie | Wat gebeurt |
|----------|-------------|
| Eerste landing op ambush-vak, geen actieve put | Nieuwe put: `pickRandomAmbush()` → `hp` / `maxHp` uit `ambushHp` |
| Landing terwijl put op dat vak nog actief (`hp > 0`) | Speler voegt zich toe (`ambush-join`), **zelfde** vijand + HP |
| Iemand staat al op het vak | `syncColocatedPlayersInPit()` — iedereen op dat vak in `playerIds` |
| Vijand op 0 HP | `clearPitAt(spaceNum)` — **iedereen** in `playerIds` vrij |
| Speler 0 HP in put | Death-flow (sessie 1); speler uit `playerIds` (via vaknummer put, niet `player.position`); put blijft alleen als er nog anderen in zitten, anders `clearPitAt` |
| Later opnieuw landen op zelfde vak (na kill) | **Nieuwe** put met weer `pickRandomAmbush()` |

Het bord toont per ambush-vak een tegel uit `AMBUSH_POOL` (bij generatie). De **actieve vijand in de put** komt uit `pickRandomAmbush()` bij een **nieuwe** put — die kan afwijken van de tegelkleur/naam op het bord.

### Elke beurt van een speler in de put
- Geen 2× D6, geen normaal vak-event.
- Event-modal (put-styling): **één D20-check** vs `config.dc` (`getEffectiveDc`).
- **Succes:** gedeelde `pit.hp -= 1` (Nat 20: **−2 HP**).
- **Falen:** `mutateHp(player, -1)` (Nat 1: **−2 HP** via `applyCombatCheckFail`).
- Geen beweging (geen sessie 2-overshoot).
- **Beurt direct voorbij** na de worp (`advanceTurn()`); modal sluit daarna.

### Nat 20 / Nat 1 in de put
| | Gedrag |
|---|--------|
| **Nat 20** | Gegarandeerd slagen → ambusher **−2 HP**. Geen speler-heal, geen movement. |
| **Nat 1** | Mislukt (−1 HP speler) **plus** kritieke mislukking (−1 HP extra, `nat1`-event). Totaal −2 HP. Geen `skipNextTurn`. Alleen via checkbox (totale worp = 1 telt niet automatisch). |

Geen DC-streak **+5** bij combat-treffer. Bij **miss of Nat 1** op speler-aanval: streak reset (zelfde als mislukte event-check) — zie `resolveCombatPlayerAttack` in `js/game/combat.js`.

### Meerdere spelers, één put
- Zelfde `pit.hp` voor alle deelnemers op dat vak.
- Per beurt vecht **elke** vastzittende speler één keer als hij/zij aan de beurt is.
- Andere spelers (niet in put) spelen normaal verder (dobbelsteen niet geblokkeerd).

### Prioriteit
- Put-check vóór normale events op ambush-vak.
- Ambush vs boss op hetzelfde vak komt niet voor (ambush = 2–61, boss = 62/63).
- In beurt-flow: `isCurrentPlayerInAmbush()` vóór boss-arena-modal.

---

## Bord & data (`events-data.js`)

**`AMBUSH_RATIO`** = `0.08` (~8% van event-slots 2–61, minimaal 1).

**6 ambush-events** in `EVENT_POOL` (`category: 'ambush'`, `ambushHp` 2–4, DC 9–11):

| Naam | DC | HP |
|------|-----|-----|
| Goblin in de struiken | 9 | 2 |
| Sluipmoordenaar | 10 | 3 |
| Grotspin | 10 | 3 |
| Bandieten uit de kuil | 11 | 3 |
| Schaduwwolf | 9 | 2 |
| Orc-patrouille | 11 | 4 |

- `AMBUSH_POOL`, `pickRandomAmbush()`, `AMBUSH_RATIO`
- Ambush uitgesloten van easy/mid/late decks (`eventsExceptBosses()` filtert `boss` + `ambush`)
- Na normale event-verdeling: willekeurige slots overschrijven met ambush-tegel

---

## Code-overzicht

### `game.js`
| Onderdeel | Functie |
|-----------|---------|
| State | `ambushPits` |
| Pit helpers | `getPitAt`, `getPlayerPit`, `isPlayerInPit`, `isCurrentPlayerInAmbush`, `getCurrentPlayerPit` |
| Start/join | `joinOrStartPit`, `syncColocatedPlayersInPit` |
| Worstelen | `resolveAmbushRoll` |
| Opruimen | `clearPitAt`, `removePlayerFromPit` |
| Landing | `resolveSpace()` → `needsAmbush: true` |
| Chain | `moveAfterEvent` → `needsAmbush` doorgeven |
| Reset | `ambushPits = {}` in `reset()` |

**Events (log):** `ambush-start`, `ambush-join`, `ambush-d20`, `ambush-hit`, `ambush-end`, `pass-turn`

### `ui.js`
| Onderdeel | Beschrijving |
|-----------|--------------|
| **Combat-rail** (rechts) | `#combat-rail` — eindbaas bovenaan, putten eronder; verborgen als niets actief |
| Put-kaarten rail | Per put: vak, vijand, HP-balk, spelers; highlight + “Jij bent aan de beurt” |
| **Ambush-modal** | Hergebruik `#event-modal`, class `event-card--ambush` |
| Fighter-blok modal | Naam, HP (harten), spelerkleur, “Aan de beurt”, bondgenoten in put |
| Vijand in modal | Gedeelde ambusher-HP-balk onder ability check |
| Beurt | Na worp: modal dicht → `advanceTurn()` → bij volgende speler in put opnieuw modal |
| Dobbelsteen | Uit tijdens put (`inAmbush`) of open modal (`modalNeedsInput`) |
| `updateCombatRail()` | Vult boss + putten; `updateAmbushPanel()` / `updateBossPanel()` delegaten hiernaar |

### `index.html` + `css/styles.css`
- `play-area`: bord links, `combat-rail` rechts
- Legenda: `cell--ambush` / `--tile-ambush` (oranje/geel)
- Styling: `.combat-card--pit`, `.ambush-modal__fighter`, spelerkleur via CSS vars

---

## UI-schets

```
┌─────────────────────────────────────────────────────────┐
│  [Sidebar: spelers, beurt, 2×D6]  │  Bord  │ Gevechten │
│                                   │        │ ┌ Boss ─┐ │
│                                   │        │ └───────┘ │
│                                   │        │ ┌ Put 5 ┤ │
│                                   │        │ │ Orlion│ │
│                                   │        │ └───────┘ │
└─────────────────────────────────────────────────────────┘

Put-modal (centrum):
  [Aan de beurt] Orlion · ❤️❤️❤️ 3/3 HP  (spelerkleur)
  Ook in de put: Speler2 · HP
  Vijand: Orc-patrouille · HP-balk
  Ability check + worp
```

---

## Handmatige testchecklist

- [x] Land op ambush → put start, geen dobbelsteen
- [x] Succes → gedeelde ambusher HP omlaag, positie ongewijzigd
- [x] Falen → speler HP omlaag, geen achteruitbeweging
- [x] Ambusher op 0 HP → put weg, iedereen in put vrij
- [x] Speler 0 HP in put → death; anderen blijven vechten indien nog in put
- [x] Twee spelers, zelfde vak → zelfde vijand, gedeelde HP
- [x] Speler 1 vecht → speler 2 → speler 1: modal opent weer automatisch
- [x] Na kill: nieuwe landing = nieuwe random ambush
- [x] Combat-rail: alle actieve putten + spelers; alleen “jouw beurt” op actieve speler
- [x] Andere spelers (niet in put) kunnen dobbelstenen
- [x] `reset()` / nieuw avontuur → `ambushPits` leeg

---

## Bekende beperkingen / polish later
- Bordtegel-naam kan afwijken van vijand in actieve put (random bij nieuwe put)
- Geen animatie “val in de put”
- Zwaardere ambushers op late vakjes (nu gelijk verdeeld via ratio)
- Boss-fases (sessie 3) nog niet

## Gerelateerd
- HP-mutatie: `MD/hp-systeem.md`
- Nat 20/1 in modals: `MD/sessie-2-nat-overshoot.md`
- Boss + combat-rail: `MD/sessie-3-boss-win.md`
