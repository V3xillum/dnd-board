# Sessie 2 — Event movement, Nat 1/20

**Status:** geïmplementeerd (naslagwerk voor de huidige werking in code).

## Doel

Beweging na een **event-check** (D20) is voorspelbaar en beloont hoge rolls. Critieken (Nat 1/20) en falen gedragen zich anders dan vóór sessie 2.

**Niet van toepassing:** dobbelsteen-beweging op je normale beurt (`move()` met 2×D6, totaal 2–12) — dat systeem is ongewijzigd. Alleen **event-checks** (`resolveEvent`) gebruiken de regels hieronder.

---

## Invoer in de UI

In het event-modal (`index.html` + `ui.js`):

| Invoer | ID | Gedrag |
|--------|-----|--------|
| Totaal worp | `#event-dice-input` | Geheel getal ≥ 1 (D20 + modifiers). Optioneel als Nat 1/20-checkbox aan staat. |
| Nat 20 | `#event-nat20` | Gegarandeerd slagen; overshoot-roll = ingevuld getal, of **20** als alleen checkbox. |
| Nat 1 | `#event-nat1` | Kritieke mislukking; ook als totaal ≠ 1 (bijv. D20=1 + modifier). |

- Minstens **één** van: getal ingevuld, Nat 20, of Nat 1 — anders geen submit.
- Nat 1 en Nat 20 **sluiten elkaar uit** (één vinkje zet het andere uit).
- Nat 1 wordt ook herkend zonder checkbox als **totaal = 1** en Nat 20 uit staat.

`game.resolveEvent(roll, config, { nat20, nat1 })` krijgt de checkbox-waarden mee vanuit `handleEventSubmit`.

---

## Volgorde in `resolveEvent()` (`game.js`)

1. `nextDcMod` van de speler wordt **één keer** toegepast op deze check en daarna op 0 gezet.
2. `effectiveDc = max(1, config.dc + dcStreak + nextDcMod)` — dit is de DC waar je tegen gooit.
3. **Nat 1?** → apart pad (zie hieronder), geen gewone succes/fail.
4. **Succes?** `nat20` **of** `roll >= effectiveDc` → overshoot-beweging + DC-streak +1.
5. **Anders mislukt** → geen beweging, DC-streak reset, beurt voorbij.

---

## Kernregel: beweging na event-check

### Mislukken (geen Nat 1)

- Geen beweging (geen `moveAfterEvent`).
- `dcStreak` → 0.
- Events: `dc-streak-reset`, `pass-turn`.
- Return: `passTurn: true`, `moveSteps: 0`.

Het oude gedrag (random 1–3 achteruit bij fail) is **verwijderd** uit `resolveEvent`. `randomSteps1to3()` bestaat nog voor andere doeleinden (dobbelsteen), niet voor events.

### Slagen

Formule in `calcEventSuccessSteps(roll, effectiveDc, { nat20 })`:

```
overshootRoll = roll ?? (nat20 ? 20 : 0)
base          = nat20 ? BASE_SUCCESS_STEPS * 2 : BASE_SUCCESS_STEPS
overshoot     = max(0, overshootRoll - effectiveDc)
extra         = floor(overshoot / OVERSHOOT_DIVISOR)
totaal        = base + extra
```

**Constants** (bovenaan `game.js`, alleen in code tunen):

```js
const BASE_SUCCESS_STEPS = 1;
const OVERSHOOT_DIVISOR = 2;  // 3 = strenger (+1 extra stap per 3 boven DC)
```

**Daarna:** `moveAfterEvent(player, totaal, …, chainEvents: true)` roept intern `applyMovementBonus()` aan (death catch-up +1, zie `MD/hp-systeem.md`). Finish-overshoot-bounce werkt zoals bij normale `move()`.

**Voorbeelden** (`OVERSHOOT_DIVISOR = 2`, geen movement bonus, geen Nat 20):

| Roll | effectiveDc | Overshoot | Extra | Totaal |
|------|-------------|-----------|-------|--------|
| 11 | 11 | 0 | 0 | **1** |
| 13 | 11 | 2 | 1 | **2** |
| 15 | 11 | 4 | 2 | **3** |
| 23 | 11 | 12 | 6 | **7** |

**Met Nat 20**, roll 23 vs DC 11: base **2** (dubbel) + extra 6 = **8** vakjes.

Geen aparte bonussen voor “DC+5” / “DC+10” — alleen basis + overshoot-floor.

### Event chain

- **Succes:** `moveAfterEvent(..., chainEvents: true)` — nieuw event-vak opent direct de volgende check (ongewijzigd patroon).
- **Fail / Nat 1:** geen chain, geen beweging.

---

## Nat 20

**Voorwaarde:** checkbox `#event-nat20` (wint van fail; telt als slagen).

**Effect:**

- Verdubbelt alleen `BASE_SUCCESS_STEPS` (1→2), daarna normale overshoot op `overshootRoll`.
- +1 HP via `mutateHp(player, 1)` (death-regels uit sessie 1).
- **Geen** DC-streak reset en **geen** `nextDcMod = -2` meer (oud gedrag verwijderd).
- Bij succes: DC-streak **+1** zoals bij een gewone geslaagde check.

**Oud vs nieuw:** vroeger reset Nat 20 streak en gaf −2 DC op de volgende check — dat zit er niet meer in.

---

## Nat 1

**Voorwaarde:** `!nat20 && nat1-checkbox` (totale worp = 1 telt niet automatisch — spelers vullen D20 + modifiers in).

**Effect:**

- Geen beweging.
- −1 HP via `mutateHp(player, -1)`.
- `player.skipNextTurn = true` — bij de **volgende** `nextTurn()` wordt deze speler overgeslagen en het vlagje gereset.
- `dcStreak` reset.
- Events: `nat1`, `hp-change` (indien van toepassing), `pass-turn`.
- Return: `passTurn: true`, `nat1: true`.

**Beurt overslaan:** `Game.nextTurn()` retourneert `{ skippedPlayer: naam | null }`. `ui.js` → `advanceTurn()` logt: *"[speler] slaat een beurt over"*.

`skipNextTurn` staat op het **speler-object** (`addPlayer`), niet meer als globaal veld op `Game`.

---

## DC-streak (kort)

| Uitkomst | dcStreak |
|----------|----------|
| Slagen (incl. Nat 20) | +1 |
| Mislukken / Nat 1 | reset naar 0 |

Streak verhoogt `effectiveDc` op volgende event-checks **en** op speler-AC in combat (`+dcStreak` via `getEffectiveDc`).

Reset bij mislukte event-check **en** bij gemiste speler-aanval in combat (ambush/boss/minion) — zie `MD/sessie-10-attack-roll-combat.md`.

---

## Events & logging

Relevante `type`-waarden in de event-array (voor log + debugging):

| type | Wanneer |
|------|---------|
| `d20` | Altijd; bevat `success`, `nat20`, `nat1`, `effectiveDc`, … |
| `event-steps` | Geslaagd; breakdown: `base`, `extra`, `overshoot`, `total`, `overshootRoll` |
| `nat20` | Nat 20 geslagen |
| `nat1` | Nat 1 |
| `dc-streak` / `dc-streak-reset` | Streak bijwerken |
| `pass-turn` | Beurt voorbij (fail of Nat 1) |
| `event-move` | Daadwerkelijke verplaatsing na succes |
| `hp-change` / `death` | Via `mutateHp` |

**UI-resultaat** (`formatEventMoveResult`): bijv.  
`7 vakje(s) (1 basis + 6 overshoot, roll 23 vs DC 11)`  
Logregel via `describeEvents` → `event-steps` met dezelfde breakdown.

---

## Bestanden

| Bestand | Rol |
|---------|-----|
| `js/game.js` | `calcEventSuccessSteps`, `resolveEvent`, `nextTurn` + `skipNextTurn` op speler |
| `js/ui.js` | Checkboxes, `advanceTurn`, modal/log-teksten |
| `index.html` | Event-modal, legenda (overshoot, Nat 1/20) |
| `css/styles.css` | `.event-card__nat-crits`, `#event-nat1` accent |

Exports op `window`: `calcEventSuccessSteps`, `BASE_SUCCESS_STEPS`, `OVERSHOOT_DIVISOR`.

---

## Tunen & testen

- **`OVERSHOOT_DIVISOR`**: `2` → +1 stap per 2 punten boven DC; `3` merkbaar strenger.
- **`BASE_SUCCESS_STEPS`**: standaard 1 (2 bij Nat 20 vóór overshoot).

**Snel checken in het spel:**

- DC 11, roll 23 → 7 vakjes (zonder catch-up bonus).
- Roll = effectiveDc → 1 vakje.
- Fail → geen beweging, beurt voorbij.
- Nat 20 checkbox + DC 11 → minstens 2 basis + overshoot op 20.
- Nat 1 → −1 HP, beurt voorbij, volgende ronde beurt overslaan.

---

## Nog niet in deze sessie

- Boss (`MD/sessie-3-boss-win.md`)
- Ambush tiles (`MD/sessie-4-ambush.md`) — die sessie moet Nat 1/20 expliciet hergebruiken waar passend
- HP-verlies op **normale** mislukte checks (alleen Nat 1 en event-specifieke effecten later)
