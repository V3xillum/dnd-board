# Sessie 2 — Event movement, Nat 1/20

**Status:** geïmplementeerd (naslagwerk voor de huidige werking in code).

## Doel

Critieken (Nat 1/20) en falen/succes bij **event-checks** (D20). Na succes geen automatische verplaatsing meer — de speler gooit **bonus 2× D6** in dezelfde beurt.

**Niet van toepassing:** combat (ambush/boss), normale beurt (`move()` met 2× D6). Alleen **event-checks** (`resolveEvent`).

---

## Invoer in de UI

In het event-modal (`index.html` + `ui.js`):

| Invoer | ID | Gedrag |
|--------|-----|--------|
| Totaal worp | `#event-dice-input` | Geheel getal ≥ 1 (D20 + modifiers). Optioneel als Nat 1/20-checkbox aan staat. |
| Nat 20 | `#event-nat20` | Gegarandeerd slagen; bonus-2× D6 wordt **verdubbeld**. |
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
4. **Succes?** `nat20` **of** `roll >= effectiveDc` → DC-streak +5, **bonus 2× D6** (`pendingEventBonusMove`).
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

- Geen automatische stappen (overshoot **verwijderd**).
- `pendingEventBonusMove = { nat20 }` — speler gooit **2× D6** via sidebar (`moveAfterEventBonus`).
- Normale bonus: worp 2–12 (+ movement bonus).
- **Nat 20 op check:** bonus-worp **verdubbeld** (8 → 16 vakjes).
- Daarna `move()` + `resolveSpace` — event chain via `continueAfterLand` (nieuw event op landingsvak).
- Beurt eindigt pas na bonus-worp (of na ketting-modals).

### Event chain

- **Succes → bonus 2× D6 →** landen op event opent volgende check (zelfde beurt).
- **Fail / Nat 1:** geen chain, geen bonus-worp.

---

## Nat 20

**Voorwaarde:** checkbox `#event-nat20` (wint van fail; telt als slagen).

**Effect:**

- Bonus-2× D6 **verdubbeld** (`moveAfterEventBonus`: `steps * 2`).
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
| `event-success` | Geslaagde check; bonus 2× D6 volgt |
| `event-bonus-move` | Bonus-worp na succes (incl. Nat 20-verdubbeling) |
| `nat20` | Nat 20 geslagen |
| `nat1` | Nat 1 |
| `dc-streak` / `dc-streak-reset` | Streak bijwerken |
| `pass-turn` | Beurt voorbij (fail of Nat 1) |
| `move` | Verplaatsing na bonus-2× D6 (zelfde als normale beurt) |
| `hp-change` / `death` | Via `mutateHp` |

**UI-resultaat** (`formatEventMoveResult`): bijv.  
`Geslaagd — gooi 2× D6 om verder te bewegen (Nat 20: worp verdubbeld!)`

---

## Bestanden

| Bestand | Rol |
|---------|-----|
| `js/game.js` | `resolveEvent`, `moveAfterEventBonus`, `pendingEventBonusMove` |
| `js/game/dc.js` | `getEffectiveDc`, `applyMovementBonus` |
| `js/ui/modals/events.js` | Modal, `needsBonusMove`, `formatEventMoveResult` |
| `index.html` | Event-modal, spelregels |

---

## Tunen & testen

**Snel checken in het spel:**

- Succes → modal sluit → sidebar “Bonus worp”, 2× D6.
- Nat 20 op check → bonus-worp verdubbeld (8 → 16).
- Fail → geen beweging, beurt voorbij.
- Nat 1 → −1 HP, beurt voorbij, volgende ronde beurt overslaan.
- Bonus-worp landt op event → ketting zonder beurtwissel.

---

## Nog niet in deze sessie

- Boss (`MD/sessie-3-boss-win.md`)
- Ambush tiles (`MD/sessie-4-ambush.md`) — die sessie moet Nat 1/20 expliciet hergebruiken waar passend
- HP-verlies op **normale** mislukte checks (alleen Nat 1 en event-specifieke effecten later)
