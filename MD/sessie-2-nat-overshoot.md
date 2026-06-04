# Sessie 2 — Event movement, Nat 1/20

## Doel
Beweging na een event-check is voorspelbaar en beloont hoge rolls. Critieken (Nat 1/20) en falen gedragen zich anders dan nu. **Dobbelsteen-beweging** (gooi 1–3 op je beurt) blijft zoals hij is — alleen **event-checks** veranderen.

---

## Kernregel: movement na een event-check

### Falen
- De beurt is **voorbij** — geen beweging (vooruit noch achteruit).
- **Verwijder** het huidige gedrag: `randomSteps1to3()` achteruit + `moveAfterEvent(..., -steps)`.
- Alleen `pass-turn` loggen en `passTurn: true` teruggeven (zoals de UI al suggereert: “beurt voorbij”).

### Slagen
- **Geen** `randomSteps1to3()` meer bij succes.
- Stappen = vaste formule op basis van je worp en de DC die je moest halen.

```
overshoot     = max(0, roll - effectiveDc)
extraStappen  = floor(overshoot / OVERSHOOT_DIVISOR)
totaal        = BASE_SUCCESS_STEPS + extraStappen
```

Constants bovenaan `game.js` (alleen in code tunen, geen UI-setting):

```js
const BASE_SUCCESS_STEPS = 1;   // basis bij elke geslaagde check
const OVERSHOOT_DIVISOR = 2;    // 2 = +1 stap per 2 punten boven DC; zet op 3 om strenger te maken
```

Gebruik **`effectiveDc`** (inclusief `dcStreak` en `nextDcMod`), niet alleen `config.dc` — dat is de DC waar je werkelijk tegen gooit.

**Voorbeeld:** event-DC 11, `effectiveDc` 11, roll **23**
→ overshoot 12 → `floor(12 / 2)` = **6 extra** → totaal **7** stappen vooruit.

**Kleinere voorbeelden** (`OVERSHOOT_DIVISOR = 2`):

| Roll | DC (effective) | Overshoot | Extra | Totaal |
|------|----------------|-----------|-------|--------|
| 11 | 11 | 0 | 0 | **1** |
| 13 | 11 | 2 | 1 | **2** |
| 15 | 11 | 4 | 2 | **3** |
| 23 | 11 | 12 | 6 | **7** |

Daarna `applyMovementBonus()` uit sessie 1 (death catch-up +1).

### Event chain (ongewijzigd)
- Bij succes: `moveAfterEvent(..., totaal, events, chainEvents: true)` — land je op een nieuw event-vak, opent de volgende check zoals nu.
- Bij falen: geen chain, geen beweging.

### Wat níet in deze formule zit
- Geen extra bonussen bij “DC+5” of “DC+10” — alleen basis + `floor(overshoot / divisor)`.
- Dobbelsteen-`move()` blijft 1–3 random (andere systeem).

---

## Speelbaar wanneer
- Geslaagde check op DC 11 met roll 23 → **7** vakjes vooruit (zonder movement bonus)
- Geslaagde check met roll = DC → **1** vakje vooruit
- Gefaalde check → geen beweging, beurt voorbij
- Nat 20: ×2 op basis-successtap + +1 HP (zie hieronder)
- Nat 1: geen movement, -1 HP, volgende beurt overslaan
- `OVERSHOOT_DIVISOR` aanpassen in JS verandert het aantal extra stappen merkbaar

---

## Wat er moet gebeuren

### game.js

**Nieuwe helper** (bijv. `calcEventSuccessSteps(roll, effectiveDc, options)`):
- Implementeert de formule hierboven
- Bij Nat 20: verdubbel alleen `BASE_SUCCESS_STEPS` (1→2), **daarna** overshoot op basis van de ingevoerde roll (of 20 als alleen checkbox, geen getal)
- Retourneer ook breakdown voor events/log: `{ base, extra, overshoot, divisor, total }`

**`resolveEvent()` refactoren:**
- Succes: `steps = calcEventSuccessSteps(...)` → `applyMovementBonus` → `moveAfterEvent` met chain
- Falen: geen steps, geen `moveAfterEvent`, wel `dcStreak` reset + `pass-turn` (HP-verlies via events komt later waar nodig; standaard fail = alleen beurt voorbij tenzij event-specifiek anders)

**Verwijder** `randomSteps1to3()` uit het succes- en fail-pad van `resolveEvent` (functie mag blijven voor dobbelsteen als die het elders gebruikt).

**Nat 20** (vervang oud gedrag):
- **Verwijder:** DC-streak reset en `nextDcMod = -2` bij Nat 20
- **Behoud/toevoeg:** ×2 op `BASE_SUCCESS_STEPS`, daarna overshoot; +1 HP via centrale mutatiefunctie (sessie 1)
- Legenda in `index.html` bijwerken

**Nat 1** (nieuw):
- Roll === 1 én Nat 20-checkbox uit
- Geen movement, -1 HP via centrale mutatiefunctie, `skipNextTurn = true`
- `nextTurn()`: speler met `skipNextTurn` wordt overgeslagen, veld reset

### ui.js

Toon in modal en log het **totaal** én de breakdown, bijv.:
`7 vakjes (1 basis + 6 overshoot, roll 23 vs DC 11)`
Spelers moeten snappen waarom ze ver bewegen.

---

## Wat je nog niet doet in deze sessie
- Boss (sessie 3)
- Ambush tiles (sessie 4)
