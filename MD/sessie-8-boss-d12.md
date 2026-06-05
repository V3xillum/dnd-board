# Sessie 8 — Eindbaas D12 & moeilijkheidsgraad

**Status:** geïmplementeerd (naslag)

## Doel

Bij **eerste activatie** van de eindbaas (landing op vak **62** of **63** terwijl `bossActive === false`) gooit de speler een **D12**. De uitkomst bepaalt hoe zwaar het eindgevecht wordt — vergelijkbaar met mystery (sessie 7), maar een **apart systeem**:

- Geen pad-uitkomst
- Geen speler-jackpot (`dmgBonus` via D12)
- **Geen reset** — D12 één keer per boss-fight; na boss-kill of `reset()` opnieuw

De preview-tegel op vak 62 blijft bestaan; de D12 bepaalt pas bij activatie de werkelijke moeilijkheidsgraad (HP, fail-dmg, eventueel minions).

---

## Verschil met sessie 7 (mystery)

| | Mystery `❓` (sessie 7) | Eindbaas D12 (sessie 8) |
|---|------------------------|-------------------------|
| Wanneer | Elke landing op `❓` | **Eén keer** bij eerste boss-activatie |
| Pad-uitkomst | Ja (roll 1–2) | **Nee** |
| Speler `dmgBonus` als jackpot | Ja (roll 12) | **Nee** — bestaande `dmgBonus` telt wel mee op hits |
| Reset na afloop | Ja → weer `❓` | **Nee** — boss-state blijft tot boss dood |
| State | `revealedSpaces[spaceNum]` | `bossMultiplier`, `bossDmgPerHit`, `bossRevealRoll`, `bossMinions` |
| Vijand-pool | `pickRandomAmbush()` | Boss uit `BOSS_POOL` / vak 62 + minions uit `pickRandomAmbush()` |

---

## Spelregels (zoals gebouwd)

### D12 eindbaas-tabel

| Roll | Tier | Effect |
|------|------|--------|
| 1–8 | Standaard | `bossMultiplier = 1`, `bossDmgPerHit = 1` |
| 9–11 | Versterkt | `bossMultiplier = 1.5`, `bossDmgPerHit = 1.5` |
| 12 | Episch | `bossMultiplier = 2`, `bossDmgPerHit = 2` + **2 minions** |

Boss-HP na D12:

```javascript
bossMaxHp = Math.ceil(BOSS_HP_PER_PLAYER * playerCount * bossMultiplier)
// BOSS_HP_PER_PLAYER = 3
```

### Fail-damage naar speler

Bij mislukte boss- **of** minion-check:

```javascript
failHits = Math.ceil(bossDmgPerHit)  // 1, 2 of 2 bij epic (1.5 → 2)
// per failHit: mutateHp(-1); Nat 1 = +1 extra HP-verlies (zoals overal)
```

### Schade naar boss/minion (speler-hit)

Zelfde als sessie 7 — `dmgBonus` uit mystery-jackpot telt mee, maar D12 geeft **geen** nieuwe bonus:

| Worp | Schade |
|------|--------|
| Normaal succes | `1 + dmgBonus` |
| Nat 20 | `2 + dmgBonus` |

### Levenscyclus (geen refresh)

```
Eerste landing op 62 of 63 (boss nog niet actief)
  → needsBossReveal
  → D12-modal (#boss-reveal-modal)
  → resolveBossReveal(roll)
       → bossMultiplier, bossDmgPerHit, bossRevealRoll gezet
       → activateBoss() — boss is nu actief in state
       → bij tier epic: spawnBossMinions() (2× pickRandomAmbush)
  → onthullingsfase (tier-badge, HP, eventueel minion-preview)
  → knop "Gevecht beginnen"
  → showBossFightModal()
       → minions leven? showBossMinionModal()
       → anders showBossModal()

Tijdens de fight (sessie 3-regels blijven):
  → landing op 62/63: eerst minion als hasBossMinions(), anders boss
  → na aanval: retreat naar vak 56 (minion én boss)
  → gedeelde boss-HP over alle spelers

Na boss-kill:
  → bossActive = false, bossMinions = []
  → win op vak 63 via checkWinAfterBoss() (sessie 3)

Nieuw avontuur / reset():
  → alle boss-velden leeg; volgende activatie opnieuw D12
```

**Geen tweede D12** zolang dezelfde boss-fight loopt.

---

## Minions (roll 12)

### Architectuur

Minions zitten op **`game.bossMinions`** — **niet** als ambush-putten op het bord. Reden: vak 62/63 is boss-arena; putten elders zouden extra movement forceren.

```javascript
game.bossMinions = [
  { config, hp, maxHp },  // pickRandomAmbush() × 2
  { config, hp, maxHp },
]
```

Geen `bossMinionIndex` — actieve minion = **eerste levende** entry (`getActiveBossMinion()`).

### Gevechtsregels minions

| Situatie | Gedrag |
|----------|--------|
| `hasBossMinions()` + speler op 62/63 | `needsBossMinion` → minion-modal vóór boss |
| Succesvolle hit | Minion-HP omlaag (`1 + dmgBonus` / `2 + dmgBonus`) |
| Mislukte check | `Math.ceil(bossDmgPerHit)` × HP-verlies |
| Minion op 0 HP | `boss-minion-end`; volgende landing → volgende minion of boss |
| Alle minions weg | `resolveBoss()` werkt normaal; `hasBossMinions()` blokkeert boss-aanvallen |
| Na aanval (niet dood) | Retreat naar vak 56 — zelfde als boss-fight |

Minion-config: DC, ability, `ambushHp` uit `pickRandomAmbush()` — **zonder** mystery-multiplier op HP (standaard ambush-HP).

---

## Code-overzicht

### `game.js`

| Onderdeel | Functie |
|-----------|---------|
| State | `bossMultiplier`, `bossDmgPerHit`, `bossRevealRoll`, `bossMinions` |
| D12-tabel | `getBossRevealFromRoll(roll)` → `{ roll, multiplier, tier }` |
| Onthulling | `resolveBossReveal(landedSpace, roll)` → `activateBoss()` + optioneel `spawnBossMinions()` |
| Minions | `spawnBossMinions()`, `getActiveBossMinion()`, `hasBossMinions()` |
| Landing | `resolveSpace()` → `needsBossReveal` (eerste keer) of `needsBossMinion` / `needsBoss` (arena) |
| Minion-gevecht | `resolveBossMinionRoll()` — ambush-achtige D20, `bossDmgPerHit`, retreat, `dmgBonus` |
| Boss-gevecht | `resolveBoss()` — faalt als `hasBossMinions()`; fail via `bossDmgPerHit` |
| Boss-HP | `activateBoss()` — `ceil(BOSS_HP_PER_PLAYER × spelers × bossMultiplier)` |
| Einde | Bij boss-kill: `bossMinions = []`; bij `reset()`: alle boss-velden gewist |

**Chain-flags** (doorgegeven via `moveAfterEvent` / event-success):  
`needsBossReveal`, `bossRevealSpaceNum`, `needsBossMinion`, `needsBoss`

**Events (log):**  
`boss-reveal-pending`, `boss-reveal`, `boss-start`, `boss-minion-start`, `boss-minion-engage`, `boss-minion-d20`, `boss-minion-hit`, `boss-minion-end`, `boss-engage`, `boss-guard`, plus bestaande `boss-d20`, `boss-hit`, `boss-retreat`, `boss-defeated`

### `ui.js`

| Onderdeel | Beschrijving |
|-----------|--------------|
| **Boss-reveal-modal** | `#boss-reveal-modal` — `event-card--boss-reveal` |
| Fase 1 | D12 (1–12), knop **Onthullen** |
| Fase 2 | Tier-badge, boss-HP, fail-dmg, minion-preview bij epic; knop **Gevecht beginnen** |
| Minion-modal | Hergebruikt `#event-modal` met `event-card--ambush`-styling |
| Boss-modal | Bestaande boss-flow in `#event-modal` |
| Router | `showBossFightModal()` → minion of boss |
| Combat-rail | Boss-kaart + sectie **Beschermers** (`#combat-rail-minions-section`) |
| Flow | `continueAfterLand()` — volgorde: mystery → ambush → **bossReveal** → **bossMinion** → boss → event/path |
| Sync | `activeModal` types `boss-reveal`, `boss-minion`; `serializeModalConfig()` zonder `undefined` |
| Spectator | `renderSpectatorModal()` — boss-reveal input/outcome |

### `multiplayer.js`

| Onderdeel | Beschrijving |
|-----------|--------------|
| Serialize | `bossMultiplier`, `bossDmgPerHit`, `bossRevealRoll`, `bossMinions` (config + hp + maxHp) |
| Firebase | `stripUndefined()` op alle writes |

### `index.html` + `css/styles.css`

- `#boss-reveal-modal` — eigen boss-D12-kaart
- `#combat-rail-minions-section` / `#boss-minions-list` — minion-kaarten in rail
- `event-card--boss-reveal`, `event-card--epic` (roll 12)
- `combat-card--minion`, `combat-card--defeated`, `boss-reveal-minions` (onthulling-preview)
- `boss-reveal-modal--spectator` — geen input voor guests

---

## UI-flow boss D12

```
Land op 62/63 (boss nog niet actief)
  → showBossRevealModal()
  → Fase 1: D12 + "Onthullen"
  → resolveBossReveal() — boss staat al actief in game state
  → Fase 2: onthulling (tier, HP, minions bij epic)
  → "Gevecht beginnen"
  → showBossFightModal()
       minions? → showBossMinionModal() → resolveBossMinionRoll → retreat 56
       geen minions / alle minions weg → showBossModal() → resolveBoss → retreat 56

Volgende beurten op 62/63:
  → needsBossMinion of needsBoss (geen tweede D12)
```

Multiplayer (sessie 5-patroon): host voert D12 en gevechten in; guests zien modals via `renderSpectatorModal`. Boss-state + `activeModal` syncen via Firebase.

---

## Verschil met oorspronkelijk bouwplan

| Oorspronkelijk plan | Zoals gebouwd |
|---------------------|---------------|
| `bossMinionIndex` voor actieve minion | Eerste levende minion in array (`getActiveBossMinion()`) |
| Fase 1 zonder minions; roll 12 alleen ×2 | Fase 1 + 2 samen gebouwd; roll 12 inclusief minions |
| Aparte minion-modal markup | Hergebruik `#event-modal` met ambush-styling (`boss-minion` sync-type) |
| `bossReveal` apart object | Alleen `bossRevealRoll` + multiplier-velden op game state |
| Minion zonder retreat | Retreat naar vak 56 na elke minion-aanval (zoals boss) |

---

## Handmatige testchecklist

### D12 & multipliers
- [x] Eerste landing 62/63 → D12-modal (geen directe boss-start)
- [x] Roll 1–8 → standaard boss-HP (`3 × spelers`)
- [x] Roll 9–11 → hogere boss-HP (`ceil(3 × spelers × 1.5)`)
- [x] Roll 12 → dubbele boss-HP (`6 × spelers`) + zwaardere fail-dmg + 2 minions
- [x] Geen tweede D12 tijdens dezelfde boss-fight
- [x] Na boss-kill: normale win-flow op 63
- [x] `reset()` / nieuw avontuur → weer D12 bij volgende activatie
- [x] Multiplayer: reveal + boss-state syncen

### Minions
- [x] Roll 12 → 2 minions zichtbaar in combat-rail + D12-onthulling
- [x] Op 62/63: eerst minion vechten, dan boss
- [x] Minion gebruikt ambush DC/HP uit `pickRandomAmbush()`
- [x] Alle minions dood → boss-modal werkt normaal
- [x] `dmgBonus` speler telt mee op minion-hits (niet als D12-jackpot)

---

## Afhankelijkheden

| Sessie | Nodig voor |
|--------|------------|
| 3 | Boss-activatie, `resolveBoss`, retreat naar 56, win op 63 |
| 4 | Ambush D20-flow als inspiratie voor minion-checks |
| 5 | Modal-sync, `serializeGame`, spectator-modals |
| 7 | D12-modal-patroon (0.5), multiplier/fail-dmg, `dmgBonus` op hits, Firebase-sanitize |

---

## Bewust buiten scope

- Mystery `❓`-vakjes aanpassen
- Boss reset / opnieuw D12 na mislukte poging (alleen bij nieuw spel)
- Pad-uitkomst op boss-D12
- Speler `dmgBonus` als beloning voor boss-D12 roll 12
- Minions als fysieke putten op het bord
- Speler kiest welke minion (altijd eerste levende)
- Zone-gebaseerde boss-tabellen
- Aparte minion-pool (nu:zelfde `pickRandomAmbush()` als mystery-ambushes)

---

## Bekende beperkingen / polish later

- Geen visuele animatie bij D12-onthulling
- Minion-volgorde niet kiesbaar (MVP: eerste levende)
- Spelregels-modal verder uitbreiden (meer detail multiplayer / edge cases)
- Minion-kaarten en boss-kaart visueel verder uitwerken

## Gerelateerd

- Boss fight basis: `MD/sessie-3-boss-win.md`
- D12-patroon: `MD/sessie-7-mystery-vakjes.md`
- Ambush mechanics: `MD/sessie-4-ambush.md`
- Multiplayer sync: `MD/sessie-5-multiplayer.md`
