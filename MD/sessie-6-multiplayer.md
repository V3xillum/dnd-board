# Sessie 6 — Echte multiplayer (iedereen speelt zelf)

**Status:** nog te bouwen — plan bijgewerkt na sessie 11 (UI-split) en 11b (`game/*`-split).

**Voorganger:** [sessie-5-multiplayer.md](sessie-5-multiplayer.md) (spectator mode — ✅ geïmplementeerd).

## Doel

Upgrade van spectator mode (sessie 5) naar **echte multiplayer**: elke gast maakt **zelf** een speler aan en voert **zelf** worpen in op **eigen beurt**. Anderen kijken live mee tot het hun beurt is.

De host is niet langer de enige die het bord bedient — hij is spelleider (game aanmaken, link delen, optioneel spelers verwijderen / nieuw avontuur).

---

## Verschil met sessie 5 (huidige situatie)

| | Sessie 5 (nu) | Sessie 6 |
|---|---------------|----------|
| Wie speelt | Alleen host | Iedereen met eigen speler |
| Spelers toevoegen | Host via sidebar | Gast maakt zichzelf aan (lobby) |
| Worpen | Host voert alles in | Alleen speler aan beurt |
| Firebase writes | Alleen host | Speler aan beurt (+ host voor meta/lobby) |
| UI | `app--spectator` voor alle guests | Turn-based invoer per client |
| Schrijfrecht-check | `isMultiplayerHost()` | `isMyTurn()` (+ host in lobby) |

---

## Hoe het werkt (spelerflow)

```
1. Host opent URL        → lobby, is host + spelleider
2. Host deelt link
3. Gast opent URL        → lobby, kiest naam, "Meedoen"
4. Gast krijgt playerId  → gekoppeld aan sessionId in Firebase
5. Host start spel       → phase: 'playing' (min. 2 spelers?)
6. Speler X aan beurt     → alleen X's tab heeft invoer + mag syncen
7. Anderen               → read-only + "Wacht op [naam]..."
```

---

## Firebase data structuur (uitbreiding)

```
games/{gameId}/
  state/              ← ongewijzigd (game snapshot)
  activeModal/        ← ongewijzigd
  lastEvent/          ← ongewijzigd
  meta/
    hostSessionId     ← spelleider-tab (bestaat al)
    hostLastSeen      ← heartbeat (bestaat al, sessie 5)
    phase             ← 'lobby' | 'playing' | 'finished'
    startedAt         ← optioneel
  sessions/           ← NIEUW
    {sessionId}/
      playerId        ← gekoppelde Game-player.id
      name            ← display naam (kopie)
      joinedAt
```

**Geen apart `activePlayer`-pad nodig** — beurt zit al in `state.currentIndex` + `state.players`.

### `meta.phase` — belangrijke wijziging t.o.v. nu

In `firebase.js` zet `claimHost` vandaag `phase: meta.phase ?? "playing"`. Nieuwe games starten daardoor meteen als *playing*.

Voor sessie 6:
- **Nieuwe game** (geen bestaande `meta`) → `phase: 'lobby'`
- **`startGame()`** (host only) → `phase: 'playing'`, `startedAt`
- Bestaande games zonder lobby (sessie-5-spellen) → blijven `playing` (backward compat)

---

## Architectuurkeuze (behoud sessie 5)

- **Optie B1 blijft:** `firebase.js` = ES module + window-bridge; rest klassieke scripts + `window.*`
- **`renderSpectatorModal()` blijft** in `js/ui/modals/core.js` — voor clients die niet interactief mogen spelen
- **Host `show*Modal()` niet dupliceren voor read-only** — turn-owner roept dezelfde `showEventModal()` etc. aan; anderen krijgen spectator-render
- **Turn-gating via UI-state**, niet via aparte modal-flow

### UI-states (vervangt simpele host/guest-toggle)

Sessie 5 gebruikt één class `app--spectator` voor alle guests. Sessie 6 heeft drie modi:

| Modus | Wanneer | UI |
|-------|---------|-----|
| **Lobby** | `phase === 'lobby'` | Lobby-overlay; geen worpen; host ziet Start |
| **Mijn beurt** | `isMyTurn()` | Volledige sidebar-invoer (dice, HP, rest, modals) |
| **Wachten** | speler geclaimd, niet aan beurt | Dice/HP/rest **hidden**; status *"Wacht op [naam]…"* |
| **Spectator** | geen `playerId` claim | Zelfde als sessie 5: `app--spectator`, read-only meekijken |

**Patroon uit sessie 5 + 11 (hergebruiken):**

- **Hidden** (`display: none`) voor secties die een guest/wachtende nooit mag gebruiken: `.add-player`, `.dice-controls`, `.hp-controls`, `.btn-remove`, `.btn--new-adventure` — zie `css/styles.css` onder `.app--spectator`
- **Opacity + pointer-events** voor zichtbaar maar read-only: `.difficulty-control`
- **Disabled** op inputs/knoppen waar nodig (modals, rest-knoppen) — aanvullend op CSS, niet in plaats van

`setMultiplayerReadOnly()` in `js/ui/bootstrap.js` wordt **`updateInputAccess()`** — coördineert bovenstaande modi + roept `updateTurnUI()` aan.

---

## Huidige codebase (referentie na sessie 11/11b)

| Bestand | Rol voor sessie 6 |
|---------|-------------------|
| `js/multiplayer.js` | Serialize, host/guest, sync guards — **hoofdwijzigingen hier** |
| `js/firebase.js` | `writeSession`, `onSessions`, `writeMeta`; `phase: 'lobby'` bij nieuwe game |
| `js/ui/bootstrap.js` | `setMultiplayerReadOnly` → `updateInputAccess`, lobby listeners, `refreshGameUIFromRemote` |
| `js/ui/players.js` | `updateTurnUI`, HP/rest controls, auto-open ambush/boss |
| `js/ui/flow.js` | `advanceTurn`, `continueAfterLand` — modal auto-open alleen turn-owner |
| `js/ui/modals/core.js` | `renderSpectatorModal`, sync modal, spectator CSS classes |
| `js/ui/modals/events.js` | Modal close → clear sync (nu host-only) |
| `js/ui/modals/combat.js` | Combat flow + spectator-wachtteksten |
| `index.html` | Lobby-overlay markup, multiplayer-bar |
| `css/styles.css` | `.app--spectator`, `.app--waiting` (nieuw), lobby styles |

**Niet meer van toepassing:** `js/ui.js` (opgesplitst in `js/ui/*`).

**Al aanwezig uit sessie 5 (niet opnieuw bouwen):**
- Host heartbeat (`touchHostPresence`, 15s interval)
- Host takeover bij stale host (45s, `claimHost`)
- Token-animatie bij remote refresh (`refreshGameUIFromRemote` in `bootstrap.js`)
- Echo-preventie via `updatedBy` / `pendingLocalWrite`

---

## Fases — bouwvolgorde

### Fase 1 — Lobby & speler aanmaken

**Doel:** gasten kunnen joinen en een poppetje claimen vóór het spel start.

**UI (overlay of panel):**
- Game ID + copy-knop (bestaat al in `#multiplayer-bar`)
- Naam invoeren + knop **Meedoen**
- Lijst van joined spelers (uit `sessions/`)
- Host: knop **Start avontuur** (disabled tot min. 2 spelers?)
- Gast na join: lobby sluit, wacht op start

**Logica:**
- `joinGame(name)` → `game.addPlayer(name, color)` + schrijf `sessions/{sessionId}`
- Host in lobby mag ook zichzelf toevoegen via sidebar (bestaande flow) of via lobby
- `phase === 'lobby'`: geen beweging, geen worpen
- `startGame()` (host only) → `phase = 'playing'`, sync state

**Firebase writes in lobby:**
- Host mag spelers toevoegen aan state + sessions schrijven
- Gast mag **alleen eigen** `sessions/{sessionId}` schrijven + state update voor addPlayer (zie conflicts)

### Fase 2 — Turn-based invoer

**Doel:** alleen de speler aan beurt kan worpen doen.

**Vervang host-gating door turn-gating:**

```javascript
function getMyPlayerId() {
  // uit sessions/{sessionId} — lokaal gecached + Firebase listener
}

function isMyTurn() {
  const myPlayerId = getMyPlayerId();
  const cp = game.currentPlayer;
  return cp && myPlayerId && cp.id === myPlayerId;
}

function isSpectator() {
  return !getMyPlayerId(); // geen speler gekoppeld
}

function isHostInLobby() {
  return window.isMultiplayerHost?.() && getMetaPhase?.() === 'lobby';
}

function canSyncGame() {
  return isMyTurn() || isHostInLobby();
}

function canPlayInteractively() {
  return isMyTurn() && getMetaPhase?.() === 'playing';
}

function updateInputAccess() {
  const phase = getMetaPhase?.() ?? 'playing';
  const canPlay = canPlayInteractively();
  const waiting = getMyPlayerId() && !canPlay && phase === 'playing';
  const spectate = isSpectator() && phase === 'playing';

  document.querySelector('.app')?.classList.toggle('app--spectator', spectate || phase === 'lobby' && !window.isMultiplayerHost?.());
  document.querySelector('.app')?.classList.toggle('app--waiting', waiting);

  // Dice/HP/rest: hidden via CSS classes; modals via canPlayInteractively
  updateTurnUI();
}
```

**Sync-rechten (`multiplayer.js`):**
- `syncAfterAction()` / `syncActiveModal()` / `syncLastEvent()` → guard met `canSyncGame()` i.p.v. `isHost`
- Host **niet** meer automatisch sole writer tijdens `playing`

**Statusbalk (`#mp-role` of apart element):**
- *"Jij bent aan de beurt"*
- *"Wacht op [naam]…"*
- *"Kies een speler om mee te doen"* (lobby, geen claim)
- *"Je kijkt mee"* (spectator zonder claim — optioneel toestaan)

**Invoer die turn-gating nodig heeft (nu allemaal host-only of altijd actief):**
- Dobbelsteen + Verplaats (`dice-controls`)
- HP handmatig (`hp-controls`)
- Short/long rest (`shortRestBtn`, `longRestBtn`, D4-input)
- Difficulty blijft **host-only** (opacity + pointer-events, zoals nu)

### Fase 3 — Modals op beurt

**Doel:** event/boss/ambush/path-modals: alleen speler aan beurt interactief; anderen via `renderSpectatorModal`.

- Open modal + sync: door **turn-owner** (niet alleen host)
- `renderSpectatorModal` voor clients waar `!canPlayInteractively()`
- Guard in `core.js`: `if (canPlayInteractively()) return;` i.p.v. `if (isMultiplayerHost()) return;`
- Spectator-wachtteksten aanpassen: *"Host beslist…"* → *"[naam] beslist…"* of generiek *"Speler aan beurt…"*

**Kritiek: modal auto-open alleen op turn-owner device**

Nu opent `advanceTurn()` (`flow.js`) en `updateTurnUI()` (`players.js`) ambush/boss modals **lokaal op elke client** als `isMultiplayerHost()`. Dat moet worden:

```javascript
// flow.js — advanceTurn
if (canPlayInteractively() && cp) { /* showAmbushModal / showBossFightModal */ }

// players.js — updateTurnUI (zelfde guard)
if (canPlayInteractively() && inAmbush && ...) showAmbushModal();
```

Remote clients krijgen de modal via `activeModal` sync → `renderSpectatorModal`.

### Fase 4 — Host-only acties (spelleider)

Blijven bij host (`meta.hostSessionId`):
- Speler **verwijderen** (andere spelers)
- **Nieuw avontuur** / reset
- **Start avontuur** vanuit lobby
- **Difficulty** wijzigen
- Optioneel: spel beëindigen

Niet host-only:
- Eigen worp op eigen beurt
- Eigen HP handmatig — **alleen aan beurt** (aanbevolen; anders chaos bij meerdere spelers)

---

## Migratie: `isMultiplayerHost()` → turn/host checks

Expliciete inventaris — elke plek moet aangepast worden:

| Bestand | Regel (ca.) | Huidig | Sessie 6 |
|---------|-------------|--------|----------|
| `multiplayer.js` | sync guards | `!isHost` → skip write | `!canSyncGame()` |
| `multiplayer.js` | `setHostState` | `setMultiplayerReadOnly(!isHost)` | `updateInputAccess()` |
| `multiplayer.js` | `applyRemoteState` | `renderSpectatorModal` als `!isHost` | als `!canPlayInteractively()` |
| `ui/modals/core.js` | `renderSpectatorModal` | return als host | return als `canPlayInteractively()` |
| `ui/modals/core.js` | `showNewAdventureConfirm` | block `app--spectator` | block non-host |
| `ui/modals/events.js` | modal close | clear sync als host | clear sync als turn-owner |
| `ui/players.js` | `updateTurnUI` | auto-open ambush/boss als host | als `canPlayInteractively()` |
| `ui/flow.js` | `advanceTurn` | auto-open modals altijd lokaal | als `canPlayInteractively()` |
| `ui/bootstrap.js` | `resyncActiveModalIfOpen` | sync als host | als `canSyncGame()` |

**Behouden:** `window.isMultiplayerHost()` voor spelleider-acties (lobby start, nieuw avontuur, speler verwijderen). Optioneel alias: `window.canSyncGame()` voor writes.

---

## Conflicts & schrijfrechten

**Probleem:** meerdere clients schrijven naar `state/` — wie wint?

**Aanpak voor avondje D&D (simpel, geen CRDT):**
1. **Alleen speler aan beurt mag `state` en `activeModal` schrijven** tijdens `playing`
2. **Host mag schrijven** in lobby + host-only acties (reset, speler verwijderen)
3. Clients valideren lokaal vóór write: `canSyncGame()`
4. Firebase Rules (optioneel later): `.write` alleen met custom token — voor nu vertrouwen + client-side guard (zelfde als sessie 5)

**Race:** twee tabs, zelfde speler (duplicate session) → voorkomen: één `playerId` per `sessionId`, geen dubbele claim op dezelfde `playerId`.

**Join + addPlayer:** gast schrijft session + state in één logische actie; host valideert unieke naam. Bij conflict: tweede write verliest (Firebase last-write-wins) — acceptable voor avondje-spel.

---

## Wat de agent concreet moet bouwen

### `js/multiplayer.js`
- `getMyPlayerId()` / `getMySession()` / `getMetaPhase()` — lees `sessions/{sessionId}` + meta
- `joinGame(name)` — lobby join
- `startGame()` — host only, `phase → playing`
- `isMyTurn()`, `canSyncGame()`, `canPlayInteractively()` — export op `window`
- Pas `syncAfterAction`, `syncActiveModal`, `syncLastEvent` aan: guard met `canSyncGame()`
- Listener op `sessions/` voor lobby-lijst
- Pas echo-preventie aan: skip eigen writes, apply remote van andere spelers
- Vervang `setMultiplayerReadOnly(!isHost)` door `updateInputAccess()`

### `js/ui/bootstrap.js`
- `updateInputAccess()` — vervangt `setMultiplayerReadOnly` (turn + lobby + spectator + waiting)
- Lobby event listeners (Meedoen, Start avontuur)
- `refreshGameUIFromRemote` blijft hier (canonical export); dood code in `flow.js` opruimen

### `js/ui/players.js`
- `updateTurnUI` — auto-open ambush/boss alleen bij `canPlayInteractively()`
- HP/rest controls respecteren waiting-state (hidden via CSS)

### `js/ui/flow.js`
- `advanceTurn` — modal auto-open alleen turn-owner
- Verwijder duplicate `refreshGameUIFromRemote` (niet geëxporteerd, bootstrap-versie telt)

### `js/ui/modals/core.js` + `events.js` + `combat.js`
- Spectator guard → `canPlayInteractively()`
- Modal close / clear sync → turn-owner
- Wachtteksten host-neutral

### `index.html` + `css/styles.css`
- Lobby-overlay markup
- `.app--waiting` styles (dice/hp/rest hidden, statusregel zichtbaar)
- Statusregels voor beurt / wachten / lobby

### `js/firebase.js` (klein)
- `writeSession`, `onSessions`, `writeMeta` helpers
- Nieuwe game: `phase: 'lobby'` i.p.v. default `'playing'`

---

## Serialisatie

Geen wijziging t.o.v. sessie 5 — `serializeGame` / `deserializeGame` in `multiplayer.js` blijven. Wel:
- Bij join: nieuwe speler in `state.players` syncen
- `sessions` apart pad (niet in game state snapshot)
- Speler-velden uit latere sessies (bijv. `shortRestsUsed`, `longRestUsed`) worden automatisch meegenomen zodra ze in `Game.addPlayer` / serialize staan

---

## Edge cases (testen!)

| Scenario | Verwacht gedrag |
|----------|-----------------|
| Gast joint, host start | Iedereen ziet spelers, beurt 0 |
| Speler A aan beurt, B wacht | B geen invoer, ziet modal mee |
| A doet event → Doorgaan | B ziet outcome, daarna beurt wissel |
| A sterft in put, B in zelfde put | B aan beurt, eigen gevechtsmodal op B's device |
| Host refresh | Herclaim host via `hostSessionId` + heartbeat; session + playerId behouden |
| Gast refresh | `sessionId` uit sessionStorage →zelfde speler |
| Gast zonder join (spectator) | Read-only, geen worpen (optioneel) |
| 2 spelers, 1 tab each | Beurt wisselt invoer tussen tabs |
| Beurt wissel mid-modal | Remote sluit spectator modal; turn-owner opent interactief |
| A doet short rest | Alleen A's tab: D4 invoer + sync; B wacht |

---

## Bewust buiten scope (sessie 6)

- Async spelen (dagen later verder) — sessie 7?
- Firebase Auth / invite codes
- Chat
- Board seed kiezen
- Volledige log-history op Firebase

---

## Afhankelijkheden

| Sessie | Nodig |
|--------|-------|
| 5 | Spectator sync, modals, firebase bridge, host heartbeat |
| 11 | UI-split (`js/ui/*`) — geen monolith `ui.js` |
| 11b | `game/*`-split — geen wijziging aan serialize-pad |
| 1–4 | Spellogica |

---

## Definition of done

- [ ] Nieuwe game start in `phase: 'lobby'`
- [ ] Gast kan naam invoeren en speler aanmaken in lobby
- [ ] Host start spel; minstens 2 spelers kunnen om beurt spelen op **eigen device**
- [ ] Alleen speler aan beurt heeft actieve invoer (dobbelsteen, HP, rest, modals)
- [ ] Wachtende speler ziet hidden controls + status *"Wacht op [naam]…"*
- [ ] Andere spelers zien live bord + modals + log (spectator mode)
- [ ] Beurt wissel werkt cross-device zonder host als proxy
- [ ] Modal auto-open alleen op turn-owner device (geen dubbele modals)
- [ ] Alle `isMultiplayerHost`-sync guards gemigreerd naar `canSyncGame` / `canPlayInteractively`
- [ ] Host kan nieuw avontuur starten; speler-claim blijft behouden of wordt gereset (**documenteer keuze**)
