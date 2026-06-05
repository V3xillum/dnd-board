# Sessie 7 — Mystery vakjes & moeilijkheidsgraad

**Status:** geïmplementeerd (naslag)

## Doel
Vaste ambush-tegels op het bord (sessie 4) zijn vervangen door **`?`-vakjes**. De eerste speler die landt gooit een **D12** — de uitkomst bepaalt wat er achter zit én hoe zwaar een ambush is. Niemand weet van tevoren wat er op een `?`-vakje staat.

Boss blijft op **vak 62** (preview-tegel); boss zit **niet** in de D12-tabel.

---

## Spelregels (zoals gebouwd)

### D12 onthullingstabel

| Roll | Uitkomst | Modifier |
|------|----------|----------|
| 1–2 | Rustig pad (`pickRandomPath()` uit `PATH_TILES`) | — |
| 3–8 | Ambush × 1 | normale HP en fail-dmg |
| 9–11 | Ambush × 1.5 | HP en fail-dmg afgerond naar boven |
| 12 | Ambush × 2 + **jackpot** | zware ambush; bij winst permanente +1 `dmgBonus` |

### Levenscyclus van een `?`-vak (belangrijk)

Een onthulling is **tijdelijk** — niet permanent voor het hele spel.

```
❓ onbekend
  → landen → D12-modal
  → onthulling (pad of ambush)
  → afhandelen
  → vak terug naar ❓
  → volgende landing = opnieuw D12
```

| Uitkomst | Afhandeling | Daarna |
|----------|-------------|--------|
| **Rustig pad** | Path-modal → knop **Rust even uit** | `resetMysteryPathAfterRest()` → weer `❓` |
| **Ambush** | Put-flow (sessie 4) → vijand op 0 HP | `resetMysterySpace()` → weer `❓` |

**Tijdens een actieve onthulling** (nog niet afgehandeld):
- Opnieuw landen op hetzelfde vak → **geen D12**, direct pad of ambush uit `revealedSpaces`.
- Bord toont tussentijds de onthulde kleur (pad / ambush).

**Gewone pad-vakjes** (via `PATH_RATIO`, niet via mystery) resetten **niet** — die staan niet in `revealedSpaces`.

### `dmgBonus` (speler)

| Veld | Start | Gedrag |
|------|-------|--------|
| `dmgBonus` | `0` | +1 bij jackpot-ambush winst (D12 = 12, vijand verslagen) |

Schade aan vijand bij succesvolle hit (ambush + boss):

| Worp | Schade |
|------|--------|
| Normaal succes | `1 + dmgBonus` |
| Nat 20 | `2 + dmgBonus` |

Jackpot-bonus: bij `ambushDefeated` check `revealedSpaces[spaceNum]?.jackpot` → `grantDmgBonus()` op de speler die de kill deed (vóór reset van het vak).

Sidebar toont `+N schade` via `formatPlayerDmgHint()`.

### Ambush-multiplier in de put

Bij start put op mystery-ambush (`joinOrStartPit`):

```javascript
hp = maxHp = Math.ceil(config.ambushHp * multiplier)
pit.dmgPerHit = multiplier
```

| Check | Gedrag |
|-------|--------|
| Succes | `pit.hp -= (1 + dmgBonus)` of `-(2 + dmgBonus)` bij Nat 20 |
| Falen | `Math.ceil(dmgPerHit)` × `mutateHp(-1)`; Nat 1 = +1 extra HP-verlies |

Vijand-config komt uit de D12-onthulling (`revealedSpaces`), niet opnieuw `pickRandomAmbush()` tijdens dezelfde onthulling.

---

## Bord & data (`events-data.js`)

- **`AMBUSH_RATIO`** (`0.08`) bepaalt nog steeds het aantal slots — maar die worden **`?`-vakjes**, geen vaste ambush-tegels meer.
- `pickRandomPath()` toegevoegd voor D12-roll 1–2.
- `AMBUSH_POOL` / `pickRandomAmbush()` blijven bestaan voor D12-ambush-onthullingen.

Mystery-tegel bij generatie:

```javascript
{
  type: 'mystery',
  category: 'mystery',
  icon: '❓',
  name: 'Onbekend gevaar',
  flavor: 'Iets loert hier. Je weet nog niet wat.',
}
```

---

## Code-overzicht

### `game.js`

| Onderdeel | Functie |
|-----------|---------|
| State | `revealedSpaces` — tijdelijke onthulling per vak |
| Speler | `dmgBonus` in `addPlayer()`, `grantDmgBonus()` |
| Onthulling | `resolveMysteryRoll(spaceNum, roll)` |
| Bord update | `applyRevealToBoard()`, `getMysteryTile()` |
| Reset | `resetMysterySpace()`, `resetMysteryPathAfterRest()` |
| Landing | `resolveSpace()` → `needsMysteryRoll` of pad/ambush uit `revealedSpaces` |
| Put start | `startRevealedAmbush()` (na mystery-modal fase 2) |
| Put | `joinOrStartPit()` leest `revealedSpaces` voor config + multiplier |
| Gevecht | `resolveAmbushRoll()` — `dmgBonus`, `dmgPerHit`, jackpot, reset na kill |
| Boss | `resolveBoss()` — `dmgBonus` op hit damage |
| Reset spel | `revealedSpaces = {}` in `reset()` |

**Events (log):** `mystery-pending`, `mystery-roll`, `mystery-reveal`, `mystery-reset`, `dmg-bonus`

### `ui.js`

| Onderdeel | Beschrijving |
|-----------|--------------|
| **Mystery-modal** | `#mystery-modal` — eigen kaart `event-card--mystery` |
| Fase 1 | D12-invoer (1–12), knop **Onthullen** |
| Fase 2 | Onthulling + badge (Versterkte vijand / Gevaarlijk / jackpot) |
| Pad | Knop **Verder lopen** → `showPathModal()` |
| Ambush | Knop **Gevecht beginnen** → `startRevealedAmbush()` → ambush-modal |
| Path reset | `closePathModal()` → `resetMysteryPathAfterRest()` als mystery-pad |
| Bord | `cell--mystery-unrevealed` voor `type: 'mystery'` |
| Flow | `continueAfterLand()` → `needsMysteryRoll` vóór ambush/boss/event |
| Sync | `activeModal` type `mystery`; `serializeModalConfig()` zonder `undefined` |
| Spectator | `renderSpectatorModal()` — mystery fase input/outcome |

### `multiplayer.js`

| Onderdeel | Beschrijving |
|-----------|--------------|
| Serialize | `revealedSpaces` in `serializeGame()` |
| Firebase | `stripUndefined()` — Firebase weigert `undefined` in writes |

### `index.html` + `css/styles.css`

- Mystery-modal markup
- Legenda: **❓ Onbekend gevaar** (`legend-swatch--mystery-unrevealed`)
- `cell--mystery-unrevealed`, jackpot-gloed (`event-card--jackpot`)
- Globale utility `.hidden { display: none !important; }`

---

## UI-flow mystery-modal

```
Land op ❓
  → showMysteryModal()
  → Fase 1: D12 + "Onthullen"
  → resolveMysteryRoll() + bordkleur update
  → Fase 2: onthulling tonen
       pad   → "Verder lopen" → path-modal → "Rust even uit" → ❓ reset
       ambush → "Gevecht beginnen" → put-modal (sessie 4) → kill → ❓ reset
```

Multiplayer (sessie 5-patroon): host voert in, guests zien modal via `renderSpectatorModal`. `revealedSpaces` + `specialSpaces` syncen via game state.

---

## Verschil met oorspronkelijk plan

| Oorspronkelijk plan | Zoals gebouwd |
|---------------------|---------------|
| Onthulling permanent tot `reset()` | Onthulling **tijdelijk**; na pad-rust of ambush-kill weer `❓` |
| Knop **Onthuld** | Knop **Onthullen** |
| `revealedSpaces` blijft hele spel | Alleen tijdens actief bezoek; daarna gewist |

---

## Handmatige testchecklist

- [x] `?`-vakjes zichtbaar op bord (eigen kleur, `❓` icoon)
- [x] Landing → D12-modal verschijnt
- [x] Roll 1–2 → rustig pad, geen gevecht
- [x] Roll 3–8 → normale ambush (×1 HP)
- [x] Roll 9–11 → ambush met hogere HP (×1.5 afgerond)
- [x] Roll 12 → zware ambush + jackpot-badge; na winst `dmgBonus +1`
- [x] Tijdens actieve onthulling: opnieuw landen → direct pad/ambush, geen D12
- [x] Na pad-rust of ambush-kill: vak weer `❓`, volgende landing = nieuwe D12
- [x] `dmgBonus` verhoogt schade op ambusher en boss
- [x] Bord toont onthuld vakje met juiste kleur tot reset
- [x] Multiplayer: onthulling + reset syncen tussen clients
- [x] `reset()` / nieuw avontuur → `revealedSpaces` leeg, bord opnieuw geschud

---

## Afhankelijkheden

| Sessie | Nodig voor |
|--------|------------|
| 1 | `dmgBonus`, `mutateHp`, death-flow |
| 4 | Ambush put-flow, `resolveAmbushRoll`, `joinOrStartPit` |
| 5 | Multiplayer modal-sync, `revealedSpaces` in serialize |

---

## Bewust buiten scope

- Boss in mystery pool (boss blijft vak 62)
- Zone-gebaseerde D12-tabellen (early/mid/late)
- Animatie bij onthulling
- Scouting (`?` onthullen zonder te landen)
- Sessie 6 (turn-based multiplayer per device)

---

## Bekende beperkingen / polish later

- Geen visuele animatie bij onthulling of reset naar `❓`
- Jackpot-bonus alleen naar speler die de kill deed (niet alle bevrijde spelers)
- Zelfde D12-tabel op elk `?`-vak (geen zone-variatie)

## Gerelateerd

- Ambush put: `MD/sessie-4-ambush.md`
- Multiplayer sync: `MD/sessie-5-multiplayer.md`
- HP / death: `MD/hp-systeem.md`
