# Sessie 9 — Token-animatie & modal-entrance

**Status:** geïmplementeerd (naslag)

## Doel
Visuele feedback op het bord en bij modals — zonder gameplay-wijziging. `player.position` in `game.js` blijft leidend; animatie is puur UI.

1. **Actieve speler** — grotere token met gouden rand.
2. **Wacht op worp** — subtiele bounce-animatie zolang de speler aan beurt is en mag dobbelen.
3. **Verplaatsing** — token schuift vak voor vak naar de nieuwe positie, inclusief hoeken.
4. **Multiplayer** — gasten zien dezelfde beweging (via position-diff), gesynchroniseerd direct na `syncAfterAction`.
5. **Modal-kaarten** — subtiele scale-in bij openen; combat-modals iets intenser.

---

## Wat is gebouwd (overzicht)

| Feature | Class / mechanisme |
|---------|------------------|
| Token-overlay | `#token-layer` absoluut boven `#board` |
| Actieve speler | `.token--active` — scale 1.22, gouden rand |
| Mag gooien | `.token--waiting` — bounce-loop |
| Onderweg | `.token--moving` — slide per vak |
| Dood (0 HP) | `.token--dying` — fade + shrink |
| Meerdere tokens op 1 vak | cirkel-offset via `getTokenStackOffset()` |
| Reduced motion | geen slide/bounce; lichte active scale |
| Mystery onthulling | `cell--mystery-pulse-reveal` — gouden glow + icon-pop |
| Mystery reset | `cell--mystery-pulse-reset` — paarse glow terug naar ❓ |
| Modal calm | `event-card--enter-calm` / `event-modal__stack--enter-calm` — scale 0.88 → 1 |
| Modal combat | `event-card--enter-combat` / `event-modal__stack--enter-combat` — scale 0.82 → 1.04 → 1 |
| Modal win | `event-card--enter-win` — scale 0.85 → 1.02 → 1 |

---

## Modal-kaart animatie

Kaarten schuiven niet meer via oude `slideUp`; ze **zoomen subtiel naar voren** bij openen. Backdrop blijft `fadeIn` op `.event-modal`.

| Tier | Modals | Effect |
|------|--------|--------|
| **calm** | path, mystery (D12), gewone events | scale 0.88 → 1, ~380ms |
| **combat** | ambush, boss, minion, boss-reveal, mystery-ambush onthulling, events `category: combat/trap` | scale 0.82 → 1.04 → 1, ~420ms |
| **win** | win-modal | lichte overshoot, ~450ms |

### Triggers (host)

| Functie | Tier |
|---------|------|
| `showPathModal` | calm |
| `showEventModal` | `getEventModalEnterTier(config)` |
| `showMysteryModal` | calm |
| `showMysteryRevealPhase` | calm (pad) / combat (ambush) |
| `showBossRevealModal` / `showBossRevealRevealPhase` | combat |
| `showAmbushModal` / `showBossModal` / `showBossMinionModal` | combat (hele `event-modal__stack` incl. turn-banner) |
| `showWinModal` | win |

### Helpers (`ui.js`)

- `playModalCardEnter(modalEl, tier)` — class togglen + reflow zodat animatie opnieuw triggert (ook bij fase-wissel mystery/boss-reveal)
- `getEventModalEnterTier(config)` — `combat` voor `category` combat/trap, anders `calm`
- `playSpectatorModalEnter(modalEl, tier, activeModal)` — zelfde voor MP-gasten; alleen bij wijziging `type|phase|spaceNum` (geen herhaalde animatie bij elke Firebase-tick)

### Multiplayer (gast)

`renderSpectatorModal()` roept `playSpectatorModalEnter()` aan per modal-type. Mystery outcome: combat-tier als `config.revealType === 'ambush'`.

### CSS

Keyframes: `modal-enter-calm`, `modal-enter-combat`, `modal-enter-win` in `css/styles.css` (+ `scss/styles.scss`).  
`prefers-reduced-motion`: geen scale-animatie op kaarten.

**Let op:** tegel-pulse bij mystery-onthulling valt visueel weg zodra de modal direct opent — de modal-entrance levert het zichtbare effect.

---

## Mystery-tegel animatie

Pulse-effect bij ❓ → onthuld en bij reset naar ❓ (geen flip-morph). Meest zichtbaar bij **reset** (pad/ambush kill), wanneer geen modal over het vak ligt.

| Trigger | Host | Gast |
|---------|------|------|
| D12 onthulling | `handleMysterySubmit` → `playMysteryCellEffect(reveal)` + vroege `syncAfterAction` | `detectMysteryCellChanges` in `refreshGameUIFromRemote` |
| Pad rusten | `closePathModal` → `playMysteryResetFromEvents` | specialSpaces-diff |
| Ambush verslagen | `handleAmbushSubmit` → `playMysteryResetFromEvents` | specialSpaces-diff |

Helpers: `snapshotSpecialSpaces()`, `detectMysteryCellChanges()`, `playMysteryCellEffect()`, `playMysteryResetFromEvents()`.

Fingerprint per vak: `` `${type}|${category}|${icon}` `` — transition `mystery|mystery|❓` ↔ `path|…` / `event|ambush|…`.

---

## Architectuur

### Token-layer (niet meer in cel-containers)

Tokens zitten **niet** meer in `.tokens` per cel. Die divs blijven in de cel-markup maar zijn leeg.

```javascript
// getOrCreateTokenLayer() — aangemaakt in renderBoard()-flow
// positionTokenElement() — left/top via getSpaceCenter(spaceNum)
// getBoundingClientRect() t.o.v. #board
```

Voordelen t.o.v. oorspronkelijk plan (animatie binnen cel):
- Geen `overflow: hidden` op cellen die slide clippt
- Finish-vak (3×3) werkt via `[data-space="63"]`
- Vloeiende beweging over celgrenzen via `left`/`top` transitions

### Pad & hoeken

Geen handmatige hoek-math. Per segment:

```javascript
// game.js — ongewijzigd, hergebruikt
getPathDirection(game.spacePositions, fromSpace)
// → 'right' | 'left' | 'down' | 'up'
```

`buildMovePath(from, to, forward)` loopt vaknummers (`from+1…to` of omgekeerd). Animatie schuift pixel-voor-pixel tussen celcentra.

### Segmentduur

```javascript
getTokenStepDuration(stepCount)
// min(220, max(100, floor(1600 / stepCount))) ms per vak
// CSS: --token-step-ms op token-element
```

---

## Token-states (CSS)

| Class | Wanneer | Visueel |
|-------|---------|---------|
| *(geen)* | Inactieve speler | Witte rand, normale grootte |
| `token--active` | `p.id === currentPlayer.id` | Scale 1.22, rand `#e8c84a`, donkere outline + gouden gloed |
| `token--waiting` | Actief + mag dobbelen | Bounce (`token-wait-bounce`, 1.15s loop) |
| `token--moving` | Tijdens slide | Geen bounce; hogere z-index |
| `token--dying` | Dood-event | Opacity 0, scale 0.4 |

**Wacht-op-worp** (`isPlayerWaitingToRoll`): actieve speler, niet in put/boss-arena, geen open modal die input vraagt. Bijgewerkt via `updateTokenTurnStates()` — ook bij `syncModalScrollLock()` en `updateTurnUI()`.

**Positie `0`:** geen token zichtbaar (start vóór eerste zet / na death). Eerste zet vanaf `0`: token verschijnt op vak 1 en schuift verder.

---

## Host-flow (animatie via events)

### Dobbelsteen-zet

```
Verplaats
  → game.move()
  → handleMoveResult()
       → describeEvents()          // log + syncLastEvent (direct)
       → syncTokensAfterEvents()
            → syncAfterAction()    // Firebase: positie meteen (gast start parallel)
            → animateFromEvents()  // host slide
            → renderTokens()
       → renderPlayers()
       → continueAfterLand()       // modal; setSyncedActiveModal → extra sync
```

### Events / gevechten

Zelfde patroon via `syncTokensAfterEvents(result.events)` in:
- `handleEventSubmit()` — `resolveEvent`
- `handleAmbushSubmit()` — `resolveAmbushRoll` (+ `renderBoard` bij put-reset)
- `handleBossSubmit()` — `resolveBoss`
- `handleBossMinionSubmit()` — `resolveBossMinionRoll`

Tijdens animatie: `tokensAnimating = true` → `moveBtn` / dice disabled via `updateTurnUI()`.

### Bewegingstypes (host — `buildMovementsFromEvents`)

| Event | Animatie |
|-------|----------|
| `move` | Vooruit over pad |
| `move` + `bounce` | Eerst naar min(`to`, 63), dan terug naar `bounce.position` |
| `event-move` | Vooruit of achteruit (`direction`) |
| `boss-retreat` | *(verwijderd)* Was: achteruit naar vak 56 — boss/minion blijft nu op arena |
| `healer-visit` / `full-heal` | Geen token-beweging; HP-update via `renderPlayers` |
| `death` | Fade-out op `fromSpace` (via `findDeathFromSpace`) |

---

## Multiplayer (gast-flow)

Geen apart Firebase-animatiekanaal. Gasten animeren via **position-diff** na state-update.

```
applyRemoteState (multiplayer.js)
  → snapshotTokenPositions()   // vóór deserialize
  → deserializeGame()
  → refreshGameUIFromRemote({ prevPositions, isGuest: true })
       → renderBoard()
       → repositionTokensToSnapshot(prev)  // visueel terug naar oud
       → animateFromPositionDiff()       // slide naar nieuw
       → renderTokens() + renderPlayers()
```

**Sync-timing (belangrijk):** `syncAfterAction()` wordt aangeroepen **vóór** host-animatie in `syncTokensAfterEvents()`. Gast ontvangt Firebase-state ~gelijk met host-slide (alleen netwerk-latency).

**Queue:** `remoteUiRefresh` in `multiplayer.js` — snelle opeenvolgende updates worden geserialiseerd.

**Eerste join midden in spel:** geen animatie (lege `prevPositions`). **Reset/nieuw avontuur:** `isLikelyGameReset()` → geen massale fade-out.

### Verschil host vs gast bij bounce

| | Host | Gast |
|---|------|------|
| Finish-overshoot | 2 stappen (naar 63, terug) via events | 1 slide (oud → nieuw positie-diff) |
| Overige zetten | Event-based pad | Position-diff pad |

---

## Code-overzicht

### `ui.js`

| Onderdeel | Functie |
|-----------|---------|
| Layer | `getOrCreateTokenLayer()`, `getSpaceCenter()`, `positionTokenElement()` |
| Tokens renderen | `ensureTokenElement()`, `renderTokens()` |
| Pad | `buildMovePath()`, `buildMovementsFromEvents()`, `buildMovementsFromPositionDiff()` |
| Animatie | `animateTokenAlongPath()`, `animateTokenDeath()`, `animateMovements()`, `animateFromEvents()`, `animateFromPositionDiff()` |
| Sync helper | `syncTokensAfterEvents()` — **sync → animate → renderTokens** |
| Beurt-UI | `isPlayerWaitingToRoll()`, `updateTokenTurnStates()` |
| MP gast | `snapshotTokenPositions()`, `hasTokenPositionChanges()`, `isLikelyGameReset()`, `repositionTokensToSnapshot()`, `refreshGameUIFromRemote()` |
| Hooks | `handleMoveResult`, event/ambush/boss submits |
| Modal entrance | `playModalCardEnter()`, `playSpectatorModalEnter()`, `getEventModalEnterTier()` |
| Modal hooks | `showPathModal`, `showEventModal`, `showMysteryModal`, `showMysteryRevealPhase`, `showBossRevealModal`, `showBossRevealRevealPhase`, `showAmbushModal`, `showBossModal`, `showBossMinionModal`, `showWinModal`, `renderSpectatorModal` |

### `multiplayer.js`

| Onderdeel | Gedrag |
|-----------|--------|
| `applyRemoteState` | Snapshot vóór deserialize; `refreshGameUIFromRemote` voor gasten |
| `remoteUiRefresh` | Promise-queue voor opeenvolgende updates |

### `css/styles.css` + `scss/styles.scss`

- `.board { position: relative }`
- `.token-layer`, `.token--active`, `.token--waiting`, `.token--moving`, `.token--dying`
- `@keyframes token-wait-bounce`
- `@keyframes modal-enter-calm`, `modal-enter-combat`, `modal-enter-win`
- `.event-card--enter-*`, `.event-modal__stack--enter-*`
- `@media (prefers-reduced-motion: reduce)`

### Ongewijzigd

- `game.js` — geen animatie-logica
- Firebase schema — geen `lastAnimation`-veld

---

## Verschil met oorspronkelijk plan

| Oorspronkelijk plan | Zoals gebouwd |
|---------------------|---------------|
| Tokens in `.tokens` per cel | **`#token-layer` overlay** (pixel-positionering) |
| Sync na host-animatie | **Sync vóór animatie** (`syncAfterAction` in `syncTokensAfterEvents`) |
| Gast: snap of korte animatie | **Volledige position-diff animatie** |
| Witte ring actief | **Gouden rand** (`#e8c84a`) + bounce bij wachten |
| `setTokensAnimating()` helper | `tokensAnimating` flag + `updateTurnUI()` |

---

## Handmatige testchecklist

### Basis
- [x] Actieve speler: groter + gouden rand
- [x] Mag dobbelen: bounce; stopt bij modal/put/boss
- [x] Inactieve spelers: witte rand, normale grootte
- [x] Positie `0`: geen token
- [x] Meerdere spelers opzelfde vak: leesbare stapel

### Beweging (host)
- [x] Dobbelsteen 2–12: vak voor vak
- [x] Hoeken: richting wisselt per segment
- [x] Event vooruit/terug
- [x] Finish-bounce: heen + terug (host)
- [x] Dood: fade-out
- [x] ~~Boss-retreat naar 56~~ — verwijderd (sessie 10); genezer op 56 i.p.v. retreat
- [x] Geen dubbele zet tijdens animatie

### Multiplayer
- [x] Gast: token beweegt ~gelijk met host (na sync-fix)
- [x] Gast: geen glitch bij snelle updates (queue)
- [x] Eerste join: snap, geen valse animatie
- [x] Log (`lastEvent`) kan vóór token komen — verwacht gedrag

### Accessibility
- [x] `prefers-reduced-motion`: geen slide/bounce
- [x] `prefers-reduced-motion`: geen modal scale-in

### Modal-entrance
- [x] Path: calm scale-in
- [x] Event: calm/combat op category
- [x] Mystery: calm bij openen, opnieuw bij onthulling (combat bij ambush)
- [x] Boss-reveal: combat (roll + reveal-fase)
- [x] Ambush/boss/minion: combat (stack + banner)
- [x] Win: win-tier
- [x] MP-gast: zelfde animatie via `renderSpectatorModal`

---

## Afhankelijkheden

| Sessie | Nodig voor |
|--------|------------|
| 1 | Bord-layout, `spacePositions` |
| 2 | `event-move`, forward/back |
| 3 | ~~Boss-retreat vak 56~~ → genezer vak 56 (sessie 10) |
| 5 | `syncAfterAction`, `applyRemoteState`, `refreshGameUI` |
| 7 | Mystery-modals (bounce stopt tijdens modal) |

---

## Bewust buiten scope

- Apart Firebase `lastAnimation`-kanaal (bounce-overshoot 1:1 voor gast)
- Diagonale / curved paths
- Particles, geluid, trail
- Mystery flip-morph op tegel (pulse wel gebouwd; modal-entrance dekt onthulling visueel)
- Landing-pause tussen token-slide en modal (~350ms) — nog niet gebouwd
- Sessie 6 turn-based per device
- Window-resize: tokens corrigeren pas bij volgende `renderTokens()`

---

## Polish later

- `lastAnimation` in Firebase voor gast-bounce identiek aan host
- Snellere animatie bij lange zetten (optionele versnelling)
- Resize-listener voor token-layer
- Flip-animatie mystery-tegel (kaart omdraaien) i.p.v. pulse
- Landing-pause vóór modal na token-animatie
- Finetune modal scale/timing als calm/combat/win te veel of te weinig voelt

---

## Gerelateerd

- Bord & richting: `js/game.js` — `getPathDirection`, `buildSpacePositions`
- Multiplayer sync: `MD/sessie-5-multiplayer.md`
- Mystery (geen token-animatie bij onthulling): `MD/sessie-7-mystery-vakjes.md`
