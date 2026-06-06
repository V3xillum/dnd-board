# Events & bordgeneratie — content toevoegen

Handleiding voor **nieuwe tegels** in `events-data.js`. Spelregels (put, boss, Nat 1, HP, …) staan in `MD/` — hier alleen wat je moet weten om data correct toe te voegen.

| Meer detail over… | Zie |
|-------------------|-----|
| HP / death | `MD/hp-systeem.md` |
| Normale D20-events | `MD/sessie-2-nat-overshoot.md` |
| Boss | `MD/sessie-3-boss-win.md` |
| Ambush / put | `MD/sessie-4-ambush.md` |
| Attack-roll combat | `MD/sessie-10-attack-roll-combat.md` |
| Mystery `?`-vakjes | `MD/sessie-7-mystery-vakjes.md` |

---

## Waar staat wat

| Bestand | Jij wijzigt hier… |
|---------|------------------|
| `events-data.js` | `EVENT_POOL_RAW`, `PATH_TILES`, optioneel `PATH_RATIO` / `AMBUSH_RATIO` |
| `game.js` | Alleen als je **nieuw gedrag** wilt (niet voor een extra kaart in de pool) |
| `ui/dom.js` | Alleen bij nieuwe `category` (nieuwe bordkleur in `EVENT_CATEGORY_CLASS`) |

Na **Nieuw avontuur** draait `rebuildBoard()` → `buildSpecialSpaces()` opnieuw.

---

## Pool-structuur

Events staan genest in **`EVENT_POOL_RAW`**: `category → ability → [events]`.

```javascript
const EVENT_POOL_RAW = {
  trap: {
    Acrobatics: [
      {
        name: 'Valput',
        icon: '🕳️',
        dc: 10,
        flavor: 'Tekst bij landen.',
        successText: 'Bij slagen.',
        failText: 'Bij falen.',
      },
    ],
  },
  ambush: {
    Perception: [
      {
        name: 'Goblin in de struiken',
        icon: '👺',
        dc: 9,
        ambushHp: 2,
        flavor: '…',
        successText: '…',
        failText: '…',
      },
    ],
  },
  boss: {
    Combat: [
      {
        name: GUARDIAN_EVENT_NAME, // of een vaste string
        icon: '🛡️',
        dc: 14,
        flavor: '…',
        successText: '…',
        failText: '…',
      },
    ],
  },
};

const EVENT_POOL = flattenEventPool(EVENT_POOL_RAW);
```

**Belangrijk:**

- **`category`** = top-level key (`trap`, `combat`, `ambush`, `boss`, …)
- **`ability`** = key onder die category (`Acrobatics`, `Combat`, …)
- Zet **`category` en `ability` niet** op het event-object zelf — `flattenEventPool()` voegt die toe
- Abilities met spaties of `OR` (bijv. `"Athletics OR Acrobatics"`) als quoted key schrijven

De engine (`game.js`, bordgeneratie, UI) gebruikt de platte **`EVENT_POOL`**. Die hoef je niet handmatig aan te passen.

---

## Normaal D20-event

Voeg een object toe in de juiste bucket van `EVENT_POOL_RAW`:

```javascript
// EVENT_POOL_RAW.trap.Investigation
{
  name: 'Mimic-kist',
  icon: '🗃️',
  dc: 11,
  flavor: 'Tekst bij landen.',
  successText: 'Bij slagen.',
  failText: 'Bij falen.',
}
```

**Verplicht voor generatie:** category is **niet** `boss` of `ambush`. DC bepaalt op welk deel van het bord het kan landen:

- vak 2–21 → DC ≤ 10
- vak 22–42 → DC 11–12
- vak 43–61 → DC ≥ 13

Filter: `eventsExceptBosses()` → `eventsByDc(...)`.

**Categories (bordkleur):** `trap`, `combat`, `magic`, `social`, `loot`, `mystery`, `wild`, `fey` → `cell--*` in `ui/dom.js`.

---

## Nieuwe ambusher

Zelfde velden als een normaal event, plus `ambushHp`, `attackBonus` en `dmg`. Plaats onder `EVENT_POOL_RAW.ambush.<ability>`:

```javascript
// EVENT_POOL_RAW.ambush.Combat
{
  name: 'Orc Patrol',
  icon: '⚔️',
  dc: 11,
  ambushHp: 4,
  attackBonus: 3,
  dmg: 2,
  flavor: '…',
  successText: '…',
  failText: '…',
}
```

`attackBonus` en `dmg` worden automatisch afgeleid van `dc` via `enrichCombatEvent()` als je ze weglaat. In combat-modals telt alleen attack-roll (host Hit/Miss), niet de `dc`.

**Checklist**

1. Object toevoegen onder `ambush` in `EVENT_POOL_RAW` met `ambushHp` (gedeelde vijand-HP in de put).
2. Optioneel: `attackBonus` (vijand D20-modifier) en `dmg` (basis schade bij hit).
3. Niets extra’s: `AMBUSH_POOL` = filter op `category === 'ambush'` na flatten.
4. Bord: een deel van de event-slots wordt na de shuffle **`?`-mystery-vakjes** (`AMBUSH_RATIO`, default `0.08`, min. 1 slot). Bij D12-onthulling komt de vijand uit `pickRandomAmbush()`.
5. Pas **Nieuw avontuur** toe om het bord te verversen.

**Gedrag in het spel** (niet in deze file): put-modus, mystery-D12, multiplier → `MD/sessie-4-ambush.md`, `MD/sessie-7-mystery-vakjes.md` en `MD/sessie-10-attack-roll-combat.md`.

`flavor` / `successText` / `failText` worden in de put-modal gebruikt zoals bij events.

---

## Nieuwe eindbaas

Plaats onder `EVENT_POOL_RAW.boss.<ability>` — **geen** `ambushHp`:

```javascript
// EVENT_POOL_RAW.boss.Intimidation
{
  name: 'Ancient Red Dragon',
  icon: '🐲',
  dc: 15,
  attackBonus: 5,
  dmg: 2,
  specialAttack: {
    name: 'Fire Breath',
    saveAbility: 'Dexterity',
    dc: 15,
    dmgFail: 2,
    dmgSuccess: 1,
  },
  flavor: '…',
  successText: '…',
  failText: '…',
}
```

`specialAttack`, `attackBonus` en `dmg` worden automatisch ingevuld via `enrichCombatEvent()` / `BOSS_SPECIAL_ATTACKS` als je ze weglaat.

**Checklist**

1. Toevoegen onder `boss` in `EVENT_POOL_RAW`.
2. `BOSS_POOL` volgt automatisch; vak **62** krijgt bij build `pickRandomBoss()`.
3. Spelregels boss-fight → `MD/sessie-3-boss-win.md` en `MD/sessie-10-attack-roll-combat.md`.

---

## Rustig pad

In `PATH_TILES` — alleen `name`, `icon`, `flavor`. Geen `dc` / `category`.

Bij sluiten van de path-modal (**Rust even uit**) reset `closePathModal()` → `resetDcStreakOnRest()` de opgebouwde DC-streak van successen. Mystery-pad (D12 → 1–2) gebruikt dezelfde modal en dezelfde reset.

---

## Vaste vakjes (niet uit de pool)

| Vak | Bron in `events-data.js` |
|-----|---------------------------|
| 1, 63 | In `buildSpecialSpaces()` ingebakken |
| 56 | `HEALER_TILE` (genezerhutje — vol HP bij landing; DC-streak reset bij **Bedankt, zuster**) |
| 62 | Random uit `BOSS_POOL` |

Vak 56 zit **niet** in de shuffle van 2–61.

---

## Bord vullen (kort)

1. 2–61 (excl. 56) schudden → ~`PATH_RATIO` pad, rest events uit DC-decks (uniek per ronde zolang de pool groot genoeg is).
2. Daarna: een deel van de event-slots → **`?`-mystery-vakjes** (niet vaste ambush-tegels). Ambush-inhoud komt pas bij D12-onthulling uit `AMBUSH_POOL`.

Boss en ambush komen **niet** in de easy/mid/late decks.

---

## Icoon & teksten

- `icon` = emoji op bord **en** in de modal (`SPECIAL_SPACES[n]`).
- Liever **uniek** icoon per kaart; dubbele emoji’s verwarren op het bord.
- Mystery-ambush: de onthulde vijand komt uit `pickRandomAmbush()` bij een **nieuwe** D12-roll — kan afwijken van eerdere onthullingen op hetzelfde vak.

---

## Pool vergroten

Meer objecten in `EVENT_POOL_RAW` (of `PATH_TILES`). Geen code-change nodig tenzij je ratio’s wilt tunen:

| Constante | Effect |
|-----------|--------|
| `PATH_RATIO` | Meer/minder rustige vakjes |
| `AMBUSH_RATIO` | Meer/minder mystery-`?`-vakjes op het bord |

Optioneel later: JSON + `fetch()` i.p.v. één groot bestand.

---

## Wanneer wél `game.js` / `ui/dom.js`

- Nieuwe `category` → kleur/class in `ui/dom.js`.
- Andere DC-verdeling op het bord → `buildSpecialSpaces()` / `eventsByDc`.
- Ander spelmechaniek (geen D20-put meer, tier 2, …) → aparte feature + `MD/`-doc.
