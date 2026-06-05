# Sessie 9 — Token-animatie op het bord

**Status:** nog te bouwen

## Doel
Speler-tokens krijgen **visuele feedback** op het bord:

1. **Actieve speler** — token wordt iets groter (en optioneel subtiel benadrukt) zolang die speler aan beurt is.
2. **Verplaatsing** — bij een zet schuift de token **rustig vak voor vak** naar de nieuwe positie, in de juiste richting (links/rechts/omhoog/omlaag), inclusief hoeken.

Geen gameplay-wijziging — puur UI/polish. Game state (`player.position`) blijft leidend; animatie volgt de al bestaande events (`from` / `to`).

---

## Huidige situatie

Tokens zitten **in elke cel** (`.tokens` in `[data-space="N"]`) en worden bij elke update **gewist en opnieuw geplaatst**:

```javascript
// ui.js — renderTokens()
document.querySelectorAll('.tokens').forEach((t) => { t.innerHTML = ''; });
// → nieuw <span class="token"> per speler op p.position
```

Gevolg: elke verplaatsing is een **teleport**, geen animatie.

De spelerlijst heeft al `player-item--active` voor de huidige beurt; tokens niet.

---

## Wat al bestaat (hergebruiken)

| Onderdeel | Locatie | Gebruik voor animatie |
|-----------|---------|------------------------|
| Grid-posities per vak | `game.spacePositions` (`buildSpacePositions`) | Bepalen welke cel bij welk vak hoort |
| Richting per segment | `getPathDirection(positions, fromSpace)` | `right` / `left` / `down` / `up` tussen opeenvolgende vakjes |
| Pijltjes op bord | `renderBoard()` | Zelfde richtingslogica als animatie |
| Move-events | `game.move()`, `moveAfterEvent()` | `{ type: 'move' \| 'event-move', from, to, direction? }` |
| Actieve speler | `game.currentIndex` | `.token--active` class |

**Hoeken hoeven niet handmatig berekend te worden.** Animatie loopt vak voor vak (`from+1 … to` of omgekeerd); per segment geeft `getPathDirection` de juiste as.

Voorbeeld spiraal:
- Vak 1→9: horizontaal (→)
- Vak 9→17: verticaal langs de rand (↓ of ↑ afhankelijk van grid)
- Elke hoek = nieuw segment met andere richting

---

## Verschil met andere sessies

| | Sessie 5–8 | Sessie 9 |
|---|------------|----------|
| Game logic | Nieuwe regels / state | **Geen** wijziging in `game.js` (tenzij optionele helper) |
| Firebase | Nieuwe velden | **Geen** sync van animatie-intent |
| Multiplayer | Host voert in | Toeschouwer ziet **snap** of lokale animatie op state-diff |
| Scope | Feature | **Polish / UX** |

---

## Architectuurkeuze

**Gekozen aanpak: optie A — segment-animatie binnen bestaande DOM (MVP).**

Tokens blijven in `.tokens`-containers per cel. Bij verplaatsing:

1. Bestaand token-element behouden (`data-player-id`).
2. Loop over tussenliggende vakjes.
3. Per segment: `transform: translate(...)` animeren in richting uit `getPathDirection`.
4. Na segment: token DOM-verplaatsen naar volgende cel, transform resetten.
5. Na laatste segment: `renderTokens()` sync voor eindstaat (stacking, active class).

**Waarom niet meteen overlay (optie B):** minder refactor; finish-vak (3×3 grid) en meerdere tokens per cel blijven werken zoals nu. Overlay kan later als polish-fase.

### Alternatief (fase 3, optioneel)

`#token-layer` absoluut boven `#board`: tokens gepositioneerd via cel-`getBoundingClientRect()` + `spacePositions`. Vloeiender over celgrenzen, meer werk bij resize en finish-centrum.

---

## Animatie-triggers

| Situatie | Bron | `from` → `to` | Richting |
|----------|------|---------------|----------|
| Dobbelsteen-zet | `type: 'move'` | `ev.from`, `ev.to` | vooruit |
| Event-succes | `type: 'event-move'` | `ev.from`, `ev.to` | `ev.direction` (`forward` / `back`) |
| Finish-bounce | `type: 'bounce'` na move | overshoot → terug | eerst vooruit, dan terug (2 animaties of 1 gecombineerde) |
| Dood (0 HP) | `type: 'death'` | huidige vak → `0` | fade/teleport naar start (positie `0` heeft **geen cel**) |
| Boss-retreat | boss-flow | `62` → `56` (of `63` → `56`) | acht stappen terug of korte “whoosh” |
| Speler toevoegen | `addPlayer()` | — | verschijnen op vak `1` bij eerste zet, of geen token bij `0` |
| Remote state (MP) | `refreshGameUI()` | diff oude vs nieuwe `position` | optioneel: korte animatie of direct snap |

**Positie `0`:** spelers vóór eerste zet / na death staan op `0`; `[data-space="0"]` bestaat niet → token **onzichtbaar** tot eerste landing op vak ≥ 1. Dood-animatie: fade-out op huidige cel → na reset fade-in op vak `1` (of direct op `1` als state al gezet is).

---

## Timing & flow

Game state wordt **direct** gezet in `game.move()` / `moveAfterEvent()` — vóór UI-update. Animatie is **puur visueel** achteraf:

```
handleMoveResult(result)
  → describeEvents(result.events)
  → animateFromEvents(result.events)   // nieuw — async
  → daarna renderTokens() + continueAfterLand()
```

Tijdens animatie:
- **Invoer blokkeren** (`moveBtn` disabled, zelfde patroon als modal open).
- **Geen** `renderBoard()` tussendoor (vernietigt tokens) — bij move wordt nu al alleen `renderTokens()` aangeroepen ✓

Modals (event, mystery, boss): animatie **vóór** modal openen, of token al op eindpositie terwijl modal opent — kies één consistent patroon (voorstel: animatie eerst, dan modal).

---

## CSS (voorstel)

```css
.token {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  will-change: transform;
}

.token--active {
  transform: scale(1.2);
  z-index: 2;
  box-shadow: 0 0 0 2px white, 0 2px 8px rgba(0, 0, 0, 0.45);
}

.token--moving {
  transition: transform var(--token-step-ms, 180ms) ease-in-out;
  z-index: 3;
}

@media (prefers-reduced-motion: reduce) {
  .token--moving { transition: none; }
  .token--active { transform: none; }
}
```

Duur per segment: ~150–250 ms; totale zet bij 12 stappen ≈ 2–3 s — eventueel versnellen bij lange zetten (`min(200, 1200 / steps)`).

---

## Fases — bouwvolgorde

### Fase 1 — Actieve token + token-behoud
**Doel:** visuele beurt-indicator; tokens niet meer elke keer from scratch.

1. `renderTokens()`: token hergebruiken via `data-player-id` i.p.v. altijd `innerHTML = ''` op alle `.tokens`.
2. Class `token--active` als `players[i].id === currentPlayer.id`.
3. CSS scale + shadow voor actieve token.
4. `updateTurnUI()` / `renderPlayers()` roept ook token active-state bij (of `renderTokens({ activeOnly: true })`).

### Fase 2 — Segment-animatie (dobbelsteen-zet)
**Doel:** normale `game.move()` vloeiend tonen.

1. `buildMovePath(from, to, direction)` → array van vaknummers (vooruit of achteruit).
2. `animateTokenAlongPath(playerId, path)` — async, returns Promise.
3. `getSegmentTransform(direction, cellSize)` — translate % binnen cel.
4. Hook in `handleMoveResult()` vóór `continueAfterLand()`.
5. UI lock tijdens animatie.

### Fase 3 — Overige bewegingstypes
**Doel:** events, bounce, death, boss-retreat.

1. `animateFromEvents(events)` — scan op `move`, `event-move`, `bounce`, `death`.
2. Event-flow na `resolveEvent`: animatie vóór volgende modal.
3. Dood: fade + verschijnen op startvak `1`.
4. Bounce: animeren tot overshoot-positie, dan terug (of alleen eindpositie tonen met korte “terugslag”-easing).

### Fase 4 — Multiplayer & edge cases
**Doel:** geen glitches voor gasten; meerdere tokens op één vak.

1. **Host:** volledige animatie zoals singleplayer.
2. **Gast (spectator):** bij `applyRemoteState` optioneel korte animatie als `position` gewijzigd, anders snap (MVP: snap is OK).
3. Meerdere tokens op één cel: offset behouden in `.tokens` flex; animatie per speler onafhankelijk.
4. Finish-vak (3×3): token in `.tokens` van `data-space="63"` — geen extra werk in fase 2.
5. `prefers-reduced-motion`: direct `renderTokens()`.

---

## Nieuwe / uitgebreide UI-functies

| Functie | Bestand | Beschrijving |
|---------|---------|--------------|
| `ensureTokenElement(player)` | `ui.js` | Maak of vind token DOM node |
| `buildMovePath(from, to, forward)` | `ui.js` | Vaknummers langs pad |
| `animateTokenSegment(token, direction)` | `ui.js` | Eén segment, returns Promise |
| `animateTokenAlongPath(playerId, path)` | `ui.js` | Volledige route |
| `animateFromEvents(events, playerId)` | `ui.js` | Dispatcher voor event-types |
| `setTokensAnimating(locked)` | `ui.js` | Disable move/dice tijdens animatie |

Optioneel in `game.js` (niet verplicht):

| Functie | Beschrijving |
|---------|--------------|
| `getPathBetween(from, to)` | Pure helper; kan ook in `ui.js` |

---

## Wat de agent concreet moet doen

| Bestand | Wijziging |
|---------|-----------|
| `js/ui.js` | `renderTokens()` refactor; animatie-helpers; hooks in `handleMoveResult`, event-resolve, `refreshGameUI` |
| `css/styles.css` | `.token--active`, `.token--moving`, reduced-motion; eventueel `--token-step-ms` |
| `scss/styles.scss` | Zelfde tokens-styling als CSS (bron van waarheid) |
| `index.html` | Geen wijziging verwacht (tenzij `#token-layer` in fase 3+) |

**Geen wijziging:** `game.js` logica, `multiplayer.js` serialize, Firebase schema.

---

## Handmatige testchecklist

### Fase 1
- [ ] Speler aan beurt: token groter dan andere tokens
- [ ] Beurt wisselt: active class springt mee
- [ ] Meerdere spelers: elk token behoudt kleur/letter
- [ ] Speler op positie `0`: geen token op bord

### Fase 2
- [ ] Dobbelsteen 2–12: token schuift vak voor vak
- [ ] Richting klopt op rechte stukken (bijv. 1→9 horizontaal)
- [ ] Hoeken (bijv. 8→9→10): segment wisselt van richting zonder diagonalen
- [ ] Tijdens animatie: geen dubbele zet mogelijk
- [ ] Na animatie: token op juiste vak, sidebar klopt

### Fase 3
- [ ] Event-vooruit: zelfde animatie als dobbelsteen
- [ ] Event-terug: animatie loopt achteruit over vakjes
- [ ] Finish overshoot: visueel begrijpelijk (bounce)
- [ ] Dood: token verdwijnt/verschijnt bij start
- [ ] Boss-retreat naar 56: animatie of geaccepteerde shortcut

### Fase 4
- [ ] 2+ tokens opzelfde vak: stapelen blijft leesbaar
- [ ] Multiplayer gast: geen broken state na remote update
- [ ] `prefers-reduced-motion`: geen slide, wel active scale mag uit
- [ ] Window resize mid-game: tokens nog op juiste plek na `renderBoard()`

---

## Afhankelijkheden

| Sessie | Nodig voor |
|--------|------------|
| 1 | Bord-layout, `spacePositions`, tokens in cellen |
| 2 | Event-move (`event-move` events, forward/back) |
| 3 | Boss-retreat positie 56 |
| 5 | `refreshGameUI()` bij remote state — animatie-gedrag afstemmen |

---

## Bewust buiten scope

- Token-overlay laag (tenzij fase 3+ polish)
- Animatie sync via Firebase (intent channel)
- Diagonale / curved paths tussen vakjes
- Particles, trail, bounce physics
- Animatie bij mystery-onthulling (sessie 7 polish)
- Sessie 6 turn-based per device (invloed op wanneer animatie draait)

---

## Na sessie 9 (polish)

- `#token-layer` voor vloeiendere cross-cell beweging
- Versnel lange zetten automatisch
- Subtle idle pulse op actieve token
- Geluid (optioneel, user setting)
- Spectator: replay-animatie op basis van `lastEvent` seq

---

## Gerelateerd

- Bord & richting: `js/game.js` — `getPathDirection`, `buildSpacePositions`
- Huidige render: `js/ui.js` — `renderBoard()`, `renderTokens()`
- Multiplayer UI refresh: `js/multiplayer.js` — `applyRemoteState` → `refreshGameUI()`
- Mystery polish (ook animatie genoemd): `MD/sessie-7-mystery-vakjes.md`
