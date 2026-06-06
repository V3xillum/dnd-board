# Sessie 1 — HP & Centrale Mutatie

**Status:** geïmplementeerd (naslagwerk)

## Doel
Elk spelerspoppetje heeft HP. Spelers kunnen schade krijgen en doodgaan. Dood = terug naar start; eerste beurt daarna een **D4 second chance** (vervangt de oude catch-up movement bonus).

---

## Speler-object (`addPlayer()`)

| Veld | Startwaarde | Gedrag |
|------|-------------|--------|
| `hp` | `3` (`DEFAULT_HP`) | Huidige HP |
| `maxHp` | `6` (`DEFAULT_MAX_HP`) | Plafond voor heal / genezer vak 56 |
| `pendingDeathReturnRoll` | `false` | `true` na death; gewist na D4 second chance |
| `dmgBonus` | `0` | Permanente +1 schade (o.a. mystery-jackpot, D4-uitkomst 4) |

Constanten: `DEFAULT_HP = 3`, `DEFAULT_MAX_HP = 6` in `settings.js` (via `window.DEFAULT_HP` / `DEFAULT_MAX_HP`).

---

## Centrale HP-mutatie — `Game.mutateHp(player, delta)`

Alle HP-wijzigingen in het project lopen hierdoor (sessie 2+ roept dit aan voor event-schade).

- `delta === 0` of geen speler / `gameOver` → geen events
- HP wordt geklemd tussen `0` en `maxHp`
- Bij `hp <= 0` na mutatie (**death**):
  - `position = 0` (startvak, in UI “vak 0”)
  - `hp = DEFAULT_HP` (3 — niet automatisch `maxHp`)
  - `pendingDeathReturnRoll = true`
  - `shortRestsUsed = 0`

### Meerdere hits in één aanval

Combat/special attack gebruiken `applyRepeatedHpDamage(player, events, hits)` — stopt de loop zodra `death` optreedt, zodat overflow-schade **niet** op respawn-HP wordt toegepast (sessie 10).

**Events** (voor `describeEvents()` in `ui.js`):

| type | Wanneer |
|------|---------|
| `hp-change` | Elke mutatie: `player`, `from`, `to`, `delta` |
| `death` | Na 0 HP: `player`, `hp` |

---

## Second chance (D4 na death)

Vervangt de oude `movementBonus` (+1 catch-up per death).

### Wanneer
Eerste beurt na death (`pendingDeathReturnRoll === true`). Speler gooit fysiek een **D4** en vult in vóór de normale 2× D6.

### Uitkomsten

| D4 | Effect |
|----|--------|
| **1** | Geen effect — start op vak 0, normale beurt |
| **2** | **Catch-up teleport** — zie hieronder |
| **3** | `healPlayerToFull()` — max HP, blijft op vak 0 |
| **4** | `grantDmgBonus()` — permanente +1 schade, blijft op vak 0 |

### Catch-up teleport (D4 = 2)

1. Bepaal het **laagste vak** onder **medespelers** (niet jezelf).
2. **Geen medespelers** → teleport naar **vak 56** (genezer).
3. Laagste vak **≥ 56** → teleport naar **vak 56** (genezer), niet naar het hogere vak.
4. Laagste vak **≤ 55** → teleport naar dat vak.
5. Teleport naar genezer: **geen** heal, **geen** path-modal, **geen** DC-streak reset — alleen positie + log/flavor.
6. Actieve put op bestemming → `joinOrStartPit()` — speler springt meteen in het gevecht (`needsAmbush`).
7. Daarna **normale beurt** (2× D6), tenzij put-gevecht de beurt overneemt.

Helpers: `needsDeathReturnRoll()`, `getDeathReturnTeleportTarget()`, `resolveDeathReturnRoll()`.

**Events:**

| type | Wanneer |
|------|---------|
| `death-return-roll` | D4 ingevuld: `player`, `roll` |
| `death-return-none` | Uitkomst 1 |
| `death-return-teleport` | Uitkomst 2: `from`, `to`, `reason` (`solo` / `catch-up-healer` / `catch-up-player`) |
| `death-return-max-hp` | Uitkomst 3 |
| `death-return-dmg` | Uitkomst 4 (naast `dmg-bonus`) |

---

## UI (`ui.js` + `index.html`)

### Spelerlijst (`renderPlayers()`)

- HP als harten: `❤️` vol, `🖤` leeg (`formatPlayerHp()`)
- Regel onder naam: vak, HP, optioneel DC-hint, optioneel `+N schade` (`formatPlayerDmgHint()`)

### Second chance paneel (beurt)

Zichtbaar als `pendingDeathReturnRoll` en current player. Dobbelsteen- en rust-knoppen verborgen tot D4 is opgelost.

Na D4: **path-modal** met flavor per uitkomst (`DEATH_RETURN_OUTCOMES` in `events-data.js`, `showDeathReturnModal()`). Geen DC-reset of mystery-reset bij sluiten. Multiplayer: `activeModal.type === 'death-return'` via `setSyncedActiveModal`.

### Handmatig HP (tot sessie 2 gameplay-schade)

In paneel **Beurt**: knoppen **−** / **+** voor de **current player** (`adjustCurrentPlayerHp(±1)` → `mutateHp`).

Na death of HP-wijziging: `renderBoard()` + `renderPlayers()` zodat positie direct klopt.

---

## Testen (handmatig)

- [ ] HP zichtbaar in spelerlijst en in beurt-paneel
- [ ] **−** tot death → start, 3 HP, `pendingDeathReturnRoll`, log `death` + `hp-change`
- [ ] Eerste beurt na death → D4-paneel; pas daarna 2× D6
- [ ] D4=1 → blijft op 0, normale worp
- [ ] D4=2 → teleport laagste medespeler; ≥56 → vak 56 zonder heal; solo → vak 56
- [ ] D4=2 + actieve put → join ambush, geen normale worp
- [ ] D4=3 → max HP op start
- [ ] D4=4 → +1 dmg permanent
- [ ] Overshoot voorbij 63 → bounce, geen bonus-mechanic meer
- [ ] Win op 63 → geen bonus-mechanic meer

---

## Bewust niet in deze sessie

- HP-verlies door events of Nat 1 → sessie 2
- Vaste event-succes-stappen + overshoot-formule → sessie 2
- Boss / ambush / put-death → sessie 3–4

---

## Bestanden

| Bestand | Rol |
|---------|-----|
| `js/game.js` | Player-velden, `mutateHp`, `resolveDeathReturnRoll`, bounce |
| `js/ui/players.js` | HP-weergave, second-chance UI, ±-knoppen |
| `js/ui/bootstrap.js` | D4-handler second chance |
| `js/ui/log.js` | Log-cases death / second chance |
| `js/ui/tokens.js` | Teleport-animatie na catch-up |
| `index.html` | Spelregels + second-chance paneel |
