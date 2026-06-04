# Events & bordgeneratie — content toevoegen

Handleiding voor **nieuwe tegels** in `events-data.js`. Spelregels (put, boss, Nat 1, HP, …) staan in `MD/` — hier alleen wat je moet weten om data correct toe te voegen.

| Meer detail over… | Zie |
|-------------------|-----|
| HP / death | `MD/hp-systeem.md` |
| Normale D20-events | `MD/sessie-2-nat-overshoot.md` |
| Boss | `MD/sessie-3-boss-win.md` |
| Ambush / put | `MD/sessie-4-ambush.md` |

---

## Waar staat wat

| Bestand | Jij wijzigt hier… |
|---------|------------------|
| `events-data.js` | `EVENT_POOL`, `PATH_TILES`, optioneel `PATH_RATIO` / `AMBUSH_RATIO` |
| `game.js` | Alleen als je **nieuw gedrag** wilt (niet voor een extra kaart in de pool) |
| `ui.js` | Alleen bij nieuwe `category` (nieuwe bordkleur in `EVENT_CATEGORY_CLASS`) |

Na **Nieuw avontuur** draait `rebuildBoard()` → `buildSpecialSpaces()` opnieuw.

---

## Normaal D20-event

Object in `EVENT_POOL`:

```javascript
{
  name: 'Naam op kaart',
  icon: '🕳️',
  ability: 'Stealth',
  dc: 12,
  category: 'trap',
  flavor: 'Tekst bij landen.',
  successText: 'Bij slagen.',
  failText: 'Bij falen.',
}
```

**Verplicht voor generatie:** `category` is **niet** `boss` of `ambush`. DC bepaalt op welk deel van het bord het kan landen:

- vak 2–21 → DC ≤ 10
- vak 22–42 → DC 11–12
- vak 43–61 → DC ≥ 13

Filter: `eventsExceptBosses()` → `eventsByDc(...)`.

**Categories (bordkleur):** `trap`, `combat`, `magic`, `social`, `loot`, `mystery`, `wild`, `fey` → `cell--*` in `ui.js`.

---

## Nieuwe ambusher

Zelfde velden als een event, plus:

```javascript
{
  // …
  category: 'ambush',
  ambushHp: 3,
}
```

**Checklist**

1. Object toevoegen aan `EVENT_POOL` met `category: 'ambush'` en `ambushHp` (gedeelde vijand-HP in de put).
2. Niets extra’s: `AMBUSH_POOL` = filter op `category === 'ambush'`.
3. Bord: een deel van de event-slots wordt na de shuffle overschreven (`AMBUSH_RATIO`, default `0.08`, min. 1 slot).
4. Pas **Nieuw avontuur** toe om het bord te verversen.

**Gedrag in het spel** (niet in deze file): put-modus, `pickRandomAmbush()`, tegel vs actieve vijand → `MD/sessie-4-ambush.md`.

`flavor` / `successText` / `failText` worden in de put-modal gebruikt zoals bij events.

---

## Nieuwe eindbaas

```javascript
{
  // …
  category: 'boss',
  // geen ambushHp
}
```

**Checklist**

1. Toevoegen aan `EVENT_POOL` met `category: 'boss'`.
2. `BOSS_POOL` volgt automatisch; vak **62** krijgt bij build `pickRandomBoss()`.
3. Spelregels boss-fight → `MD/sessie-3-boss-win.md`.

---

## Rustig pad

In `PATH_TILES` — alleen `name`, `icon`, `flavor`. Geen `dc` / `category`.

---

## Vaste vakjes (niet uit de pool)

| Vak | Bron in `events-data.js` |
|-----|---------------------------|
| 1, 63 | In `buildSpecialSpaces()` ingebakken |
| 56 | `ENCAMPMENT_TILE` (kamp, rustig pad) |
| 62 | Random uit `BOSS_POOL` |

Vak 56 zit **niet** in de shuffle van 2–61.

---

## Bord vullen (kort)

1. 2–61 (excl. 56) schudden → ~`PATH_RATIO` pad, rest events uit DC-decks (uniek per ronde zolang de pool groot genoeg is).
2. Daarna: random event-slots → ambush uit `AMBUSH_POOL`.

Boss en ambush komen **niet** in de easy/mid/late decks.

---

## Icoon & teksten

- `icon` = emoji op bord **en** in de modal (`SPECIAL_SPACES[n]`).
- Liever **uniek** icoon per kaart; dubbele emoji’s verwarren op het bord.
- Bij ambush: tegel op het vak kan een **andere** vijand tonen dan de actieve put (random bij nieuwe put) — dat is normaal.

---

## Pool vergroten

Meer objecten in `EVENT_POOL` (of `PATH_TILES`). Geen code-change nodig tenzij je ratio’s wilt tunen:

| Constante | Effect |
|-----------|--------|
| `PATH_RATIO` | Meer/minder rustige vakjes |
| `AMBUSH_RATIO` | Meer/minder ambush-tegels op het bord |

Optioneel later: JSON + `fetch()` i.p.v. één groot bestand.

---

## Wanneer wél `game.js` / `ui.js`

- Nieuwe `category` → kleur/class in `ui.js`.
- Andere DC-verdeling op het bord → `buildSpecialSpaces()` / `eventsByDc`.
- Ander spelmechaniek (geen D20-put meer, tier 2, …) → aparte feature + `MD/`-doc.
