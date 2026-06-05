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
- **Gedeelde boss-HP:** succesvolle aanval → schade op boss; mislukt → vijand-aanvalsfase (attack rolls, zie `MD/sessie-10-attack-roll-combat.md`).
- **Eén gevechtsronde per beurt:** na succes of falen → `pass-turn`; speler **blijft op 62/63** (zelfde patroon als ambush — **geen retreat** naar vak 56 meer).
- Uitval door HP → death → start met `DEFAULT_HP`.

### Beurt-flow
| Positie speler | Wat kan |
|----------------|---------|
| Niet op 62/63 | Normaal **2× D6** verplaatsen (boss-fight loopt door) |
| Op 62 of 63 | Geen dobbelsteen → **boss/minion combat-modal** |

Na verplaatsing naar 62/63 tijdens actieve fight: `needsBossMinion` / `needsBoss` → gevecht-modal.

### Win
- Vak **63** telt alleen als `bossActive === false`.
- Bij `bossHp === 0`: `checkWinAfterBoss()` — eerste speler **op vak 63** wint.
- Sta je op 62 na de kill: loop alsnog naar 63 (geen win op 62). Geen tweede D12 (`hasBossReveal()`).

### Vaste vakjes op het bord
| Vak | Inhoud |
|-----|--------|
| **56** | **Genezerhutje** (`HEALER_TILE`, `type: 'healer'`) — landing herstelt naar `player.maxHp`. Uitgesloten van shuffle. `cell--healer`. |
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
- Exports: `BOSS_POOL`, `pickRandomBoss()`, `getDefaultBoss()`, `HEALER_SPACE`, `HEALER_TILE` (aliases `ENCAMPMENT_*` deprecated).

---

## Code-overzicht

### `game.js`
- Constanten: `BOSS_SPACE` (62), `BOSS_HP_PER_PLAYER` (3), `isOnBossArena()`, `HEALER_SPACE` (56).
- State: `bossActive`, `bossHp`, `bossMaxHp`, `bossConfig`, `bossRevealRoll`, `bossMinions`.
- Methodes: `activateBoss()`, `resolveBossReveal()`, `finalizeCombatRound()`, `checkWinAfterBoss()`, `healPlayerToFull()`, `copyBossConfig()`.
- `resolveSpace()`: D12-reveal (`hasBossReveal()`), `boss-guard` op 63, `boss-engage` / minion op 62/63, `healer` op 56, `boss-cleared` na boss-kill op 62.
- `reset()` wist boss-state.

### `ui.js`
- Combat-rail rechts: eindbaas-kaart + putten + beschermers (`updateCombatRail()` / `updateBossPanel()`).
- Boss/minion-modal: attack-roll flow (sessie 10).
- `advanceTurn()`: combat-modal als speler op 62/63 of in put.
- Log-events: `boss-start`, `boss-guard`, `boss-engage`, `boss-defeated`, `healer-visit`, `boss-cleared`, …

### `index.html` + `css/styles.css`
- Legenda: eindbaas (62), genezer (56).
- Classes: `cell--boss`, `cell--healer`, `--tile-boss`, `--tile-healer`.

---

## Handmatige testchecklist

- [x] Nieuw avontuur → vak 62 toont willekeurige boss; vak 56 = genezer
- [x] Boss activeert via D12 op 62/63 (sessie 8)
- [x] Speler op 63 terwijl boss leeft → geen win (`boss-guard`)
- [x] `bossHp === 0` + speler op 63 → win
- [x] Dobbelsteen uit op 62/63; wel aan tussen beurten
- [x] Na gevechtsronde op arena → **blijf op 62/63** (geen retreat)
- [x] Genezer 56 → vol HP
- [x] `reset()` / nieuw avontuur → boss weg

---

## Bewust nog niet gebouwd
- Boss-fases (bijv. +1 DC onder 50% boss HP)

## Vervolg (sessie 4)
- Ambush / de put — zie `MD/sessie-4-ambush.md`
- Prioriteit ambush > boss in beurt-flow (`isCurrentPlayerInAmbush` vóór boss-arena)

## Gerelateerd
- HP-mutatie: `MD/hp-systeem.md`
- Attack-roll combat: `MD/sessie-10-attack-roll-combat.md`
- Boss D12: `MD/sessie-8-boss-d12.md`
- Nat 20/1 in modals: `MD/sessie-2-nat-overshoot.md`
- Vervolg: `MD/sessie-4-ambush.md`
