# Sessie 1 — HP & Centrale Mutatie

**Status:** geïmplementeerd (naslagwerk)

## Doel
Elk spelerspoppetje heeft HP. Spelers kunnen schade krijgen en doodgaan. Dood = terug naar start met een catch-up movement bonus (+1 per death, stapelt).

---

## Speler-object (`addPlayer()`)

| Veld | Startwaarde | Gedrag |
|------|-------------|--------|
| `hp` | `3` (`DEFAULT_HP`) | Huidige HP |
| `maxHp` | `5` (`DEFAULT_MAX_HP`) | Plafond voor heal / genezer vak 56 |
| `movementBonus` | `0` | +1 bij elke death; verbruikt bij finish of overshoot-bounce |

Constanten: `DEFAULT_HP = 3`, `DEFAULT_MAX_HP = 5` in `game.js` (ook op `window` geëxporteerd).

---

## Centrale HP-mutatie — `Game.mutateHp(player, delta)`

Alle HP-wijzigingen in het project lopen hierdoor (sessie 2+ roept dit aan voor event-schade).

- `delta === 0` of geen speler / `gameOver` → geen events
- HP wordt geklemd tussen `0` en `maxHp`
- Bij `hp <= 0` na mutatie (**death**):
  - `position = 0` (startvak, in UI “vak 0”)
  - `hp = DEFAULT_HP` (3 — niet automatisch `maxHp`)
  - `movementBonus += 1`

### Meerdere hits in één aanval

Combat/special attack gebruiken `applyRepeatedHpDamage(player, events, hits)` — stopt de loop zodra `death` optreedt, zodat overflow-schade **niet** op respawn-HP wordt toegepast (sessie 10).

**Events** (voor `describeEvents()` in `ui.js`):

| type | Wanneer |
|------|---------|
| `hp-change` | Elke mutatie: `player`, `from`, `to`, `delta` |
| `death` | Na 0 HP: `player`, `hp`, `movementBonus` |

---

## Movement bonus

### `applyMovementBonus(player, steps)` (module-level, `window.applyMovementBonus`)

- Alleen bij **vooruit** (`steps > 0`): `steps + movementBonus`
- Bij achteruit (mislukte event-check): geen bonus op de straf-stappen

Gebruikt in:

- `move()` — dobbelsteen
- `moveAfterEvent()` — beweging na event-check

Move-events bevatten `baseSteps` en `movementBonus` zodat het log catch-up kan tonen, bv. `4 (3+1 catch-up)`.

### Bonus verbruiken (reset naar 0)

`clearMovementBonusOnFinish(player)` wordt aangeroepen bij:

1. **Win** — speler landt op vak 63 (`FINISH_SPACE`) via `resolveSpace` of `moveAfterEvent`
2. **Overshoot-bounce** — worp/event-beweging gaat voorbij 63; speler kaatst terug (`pos = 63 - overshoot`)

Centrale helper: `applyFinishOvershootBounce(player, pos)` in `move()` en `moveAfterEvent()`.

Bounce-event: `type: 'bounce'`, `position`, `overshoot`, `player`, `movementBonusCleared` (boolean).

> **Designkeuze:** “De schat bereikt” = bonus kwijt, ook als je er net voorbij schiet en terugkaatst — niet alleen bij daadwerkelijke overwinning.

---

## UI (`ui.js` + `index.html`)

### Spelerlijst (`renderPlayers()`)

- HP als harten: `❤️` vol, `🖤` leeg (`formatPlayerHp()`)
- Regel onder naam: vak, HP, optioneel DC-hint, optioneel `+N beweging` (`formatPlayerMovementHint()`)

### Handmatig HP (tot sessie 2 gameplay-schade)

In paneel **Beurt**: knoppen **−** / **+** voor de **current player** (`adjustCurrentPlayerHp(±1)` → `mutateHp`).

- Label: “HP (handmatig)”
- **+** uitgeschakeld bij `hp >= maxHp`
- Verborgen als geen speler of spel afgelopen

Na death of HP-wijziging: `renderBoard()` + `renderPlayers()` zodat positie en bonus direct kloppen.

---

## Testen (handmatig)

- [ ] HP zichtbaar in spelerlijst en in beurt-paneel
- [ ] **−** tot death → start, 3 HP, `movementBonus` +1, log `death` + `hp-change`
- [ ] Met bonus: dobbelsteen **en** event-succes → één extra stap vooruit; log toont catch-up
- [ ] Met bonus: overshoot voorbij 63 → bounce, bonus weg (ook zonder win)
- [ ] Win op 63 → bonus weg
- [ ] Achteruit na mislukte check → geen catch-up op straf-stappen

HP-verlies via events / Nat 1 volgt in **sessie 2** (dan via `mutateHp`, niet via de knoppen).

---

## Bewust niet in deze sessie

- HP-verlies door events of Nat 1 → sessie 2
- Vaste event-succes-stappen + overshoot-formule → sessie 2
- Boss / ambush / put-death → sessie 3–4

---

## Bestanden

| Bestand | Wijzigingen |
|---------|-------------|
| `js/game.js` | Player-velden, `mutateHp`, `applyMovementBonus`, bounce/finish bonus-reset |
| `js/ui.js` | HP-weergave, ±-knoppen, log-cases `hp-change` / `death` / bounce catch-up |
| `index.html` | `#hp-controls` in beurt-paneel |
| `css/styles.css` / `scss/styles.scss` | Styling HP-controls |
