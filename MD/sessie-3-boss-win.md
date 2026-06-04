# Sessie 3 — Boss Fight + Win Conditie

**Status:** geïmplementeerd (naslag voor vervolg-sessies)

## Doel
Een eindbaas blokkeert de overwinning. Alle spelers moeten samen de boss verslaan voordat iemand kan winnen. Geen fases, geen random tabel — één encounter met gedeeld HP. Meerdere bosses voor flavor via `BOSS_POOL`; DC altijd uit `bossConfig`, nooit hardcoded in `game.js`.

---

## Spelregels (zoals gebouwd)

### Activatie
- Eerste landing op **vak 62 of 63** zet `bossActive = true` (één keer per spel).
- **Vak 62:** `bossConfig` = de boss die op vak 62 op het bord staat (preview).
- **Direct op 63:** willekeurige boss uit `BOSS_POOL` (`getDefaultBoss()` als fallback).
- `bossHp` / `bossMaxHp` = **3 × aantal spelers**.
- Geen win op dat moment, ook niet op 63.

### Tijdens de fight
- **Gedeelde boss-HP:** succesvolle aanval → `bossHp -= 1`; mislukt → −1 HP speler via `mutateHp()`.
- Check: D20-totaal vs `getEffectiveDc(player, bossConfig.dc)` (zelfde modifiers als events; geen DC-streak-updates in `resolveBoss`).
- Nat 20 / Nat 1 checkboxes in de boss-modal werken (geen beweging/overshoot). **Nat 1:** −1 HP (mislukt) + −1 HP (kritiek), geen beurt overslaan.
- **Eén aanval per beurt:** na succes of falen → beurt voorbij, speler naar **vak 56** (kamp), tenzij:
  - uitval door HP (death → start), of
  - dezelfde speler wint direct op 63 na de laatste hit (`winner.id === player.id` → geen retreat).

### Beurt-flow
| Positie speler | Wat kan |
|----------------|---------|
| Niet op 62/63 | Normaal **2× D6** verplaatsen (boss-fight loopt door) |
| Op 62 of 63 | Geen dobbelsteen → **boss-modal** (event-modal hergebruikt) |

Na verplaatsing naar 62/63 tijdens actieve fight: `needsBoss` / event `boss-engage` → aanval-modal.

### Win
- Vak **63** telt alleen als `bossActive === false`.
- Bij `bossHp === 0`: `checkWinAfterBoss()` — eerste speler **op vak 63** wint.
- Sta je op 62 na de kill: loop alsnog naar 63 (geen win op 62).

### Vaste vakjes op het bord
| Vak | Inhoud |
|-----|--------|
| **56** | Altijd **Kamp bij de drempel** (`ENCAMPMENT_TILE`) — rustig pad, `encampment: true`, `cell--encampment`. Uitgesloten van shuffle. Boss-retreat + flavor “hergroeperen”. |
| **62** | Willekeurige boss uit `BOSS_POOL` (preview, `cell--boss`). |
| **63** | Draken-schat (finish). |

---

## Boss-pool (`events-data.js`)

`BOSS_POOL = EVENT_POOL.filter((e) => e.category === 'boss')` — **4 bosses:**

| Naam | DC | Ability |
|------|-----|---------|
| Laatste wachter | 14 | Combat |
| Oude rode draak | 15 | Intimidation |
| Stormreus | 14 | Athletics |
| Gevallen paladijn | 13 | Combat |

- Bosses zitten **niet** in easy/mid/late decks (`eventsExceptBosses()` i.p.v. oude `eventsExceptGuardian`).
- Exports: `BOSS_POOL`, `pickRandomBoss()`, `getDefaultBoss()`, `ENCAMPMENT_SPACE`, `ENCAMPMENT_TILE`.

---

## Code-overzicht

### `game.js`
- Constanten: `BOSS_SPACE` (62), `BOSS_RETREAT_SPACE` (56), `BOSS_HP_PER_PLAYER` (3), `isOnBossArena()`.
- State: `bossActive`, `bossHp`, `bossMaxHp`, `bossConfig`.
- Methodes: `activateBoss()`, `resolveBoss()`, `checkWinAfterBoss()`, `copyBossConfig()`.
- `resolveSpace()`: activatie, `boss-guard` op 63, `boss-engage` op 62/63 tijdens fight.
- `reset()` wist boss-state.

### `ui.js`
- Combat-rail rechts: eindbaas-kaart + putten (`updateCombatRail()` / `updateBossPanel()`).
- Boss-modal: titel `⚔️ ${name}`, HP in modal, knop “Aanvallen”.
- `advanceTurn()`: boss-modal alleen als speler op 62/63 staat.
- Log-events: `boss-start`, `boss-guard`, `boss-engage`, `boss-d20`, `boss-hit`, `boss-defeated`, `boss-retreat`.

### `index.html` + `css/styles.css`
- Legenda: eindbaas (62), kamp (56), korte spelregel boss + retreat.
- Classes: `cell--boss`, `cell--encampment`, `--tile-boss`, `--tile-encampment`.

---

## Handmatige testchecklist

- [x] Nieuw avontuur → vak 62 toont willekeurige boss; vak 56 = kamp
- [x] Boss activeert op 62 of 63; DC uit `bossConfig`
- [x] Zelfde `bossConfig` gedurende hele fight
- [x] Speler op 63 terwijl boss leeft → geen win (`boss-guard`)
- [x] `bossHp === 0` + speler op 63 → win
- [x] Dobbelsteen uit op 62/63; wel aan tussen beurten
- [x] Na aanval → vak 56 (tenzij death/win op 63)
- [x] `reset()` / nieuw avontuur → boss weg

---

## Bewust nog niet gebouwd
- Boss-fases (bijv. +1 DC onder 50% boss HP)

## Vervolg (sessie 4)
- Ambush / de put — zie `MD/sessie-4-ambush.md`
- Prioriteit ambush > boss in beurt-flow (`isCurrentPlayerInAmbush` vóór boss-arena)

## Gerelateerd
- HP-mutatie: `MD/hp-systeem.md`
- Nat 20/1 in modals: `MD/sessie-2-nat-overshoot.md`
- Vervolg: `MD/sessie-4-ambush.md`
