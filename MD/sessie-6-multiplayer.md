# Sessie 6 — Echte multiplayer (iedereen speelt zelf)

**Status:** nog te bouwen

## Doel
Upgrade van spectator mode (sessie 5) naar **echte multiplayer**: elke gast maakt **zelf** een speler aan en voert **zelf** worpen in op **eigen beurt**. Anderen kijken live mee tot het hun beurt is.

De host is niet langer de enige die het bord bedient — hij is spelleider (game aanmaken, link delen, optioneel spelers verwijderen / nieuw avontuur).

---

## Verschil met sessie 5

| | Sessie 5 (nu) | Sessie 6 |
|---|---------------|----------|
| Wie speelt | Alleen host | Iedereen met eigen speler |
| Spelers toevoegen | Host via sidebar | Gast maakt zichzelf aan (lobby) |
| Worpen | Host voert alles in | Alleen speler aan beurt |
| Firebase writes | Alleen host | Speler aan beurt (+ host voor meta/lobby) |
| UI | `app--spectator` overal | Turn-based invoer |

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
    hostSessionId     ← spelleider-tab
    phase             ← 'lobby' | 'playing' | 'finished'
    startedAt         ← optioneel
  sessions/
    {sessionId}/
      playerId        ← gekoppelde Game-player.id
      name            ← display naam (kopie)
      joinedAt
```

**Geen apart `activePlayer`-pad nodig** — beurt zit al in `state.currentIndex` + `state.players`.

---

## Architectuurkeuze (behoud sessie 5)

- **Optie B1 blijft:** `firebase.js` = module + window-bridge; rest klassieke scripts
- **`renderSpectatorModal()` blijft** voor clients die niet aan beurt zijn
- **Host `show*Modal()` niet aanpassen voor read-only** — turn-gating via enable/disable, niet via andere render-functie

---

## Fases — bouwvolgorde

### Fase 1 — Lobby & speler aanmaken
**Doel:** gasten kunnen joinen en een poppetje claimen vóór het spel start.

**UI (overlay of panel):**
- Game ID + copy-knop (bestaat al)
- Naam invoeren + knop **Meedoen**
- Lijst van joined spelers (uit `sessions/`)
- Host: knop **Start avontuur** (disabled tot min. 1 speler of 2 totaal?)
- Gast na join: lobby sluit, wacht op start

**Logica:**
- `joinGame(name)` → `game.addPlayer(name, color)` + schrijf `sessions/{sessionId}`
- Host in lobby mag ook zichzelf toevoegen (of host is automatisch eerste speler)
- `phase === 'lobby'`: geen beweging, geen worpen
- `startGame()` (host only) → `phase = 'playing'`, sync state

**Firebase writes in lobby:**
- Host mag spelers toevoegen aan state + sessions schrijven
- Gast mag **alleen eigen** `sessions/{sessionId}` schrijven + state update voor addPlayer (zie conflicts hieronder)

### Fase 2 — Turn-based invoer
**Doel:** alleen de speler aan beurt kan worpen doen.

**Vervang `setMultiplayerReadOnly(!isHost)` door turn-gating:**

```javascript
function isMyTurn() {
  const myPlayerId = getMyPlayerId(); // uit sessions/{sessionId}
  const cp = game.currentPlayer;
  return cp && myPlayerId && cp.id === myPlayerId;
}

function isSpectator() {
  return !getMyPlayerId(); // geen speler gekoppeld
}

function updateInputAccess() {
  const canPlay = isMyTurn();
  const spectate = isSpectator();
  // sidebar: canPlay → enabled; spectate → read-only; wacht → read-only + status
}
```

**Sync-rechten:**
- `syncAfterAction()` / `syncActiveModal()` alleen als `isMyTurn()` **of** host in lobby voor setup
- Host **niet** meer automatisch sole writer tijdens `playing`

**Statusbalk:**
- *"Jij bent aan de beurt"*
- *"Wacht op [naam]…"*
- *"Kies een speler om mee te doen"* (lobby, geen claim)
- *"Je kijkt mee"* (spectator zonder claim — optioneel toestaan)

### Fase 3 — Modals op beurt
**Doel:** event/boss/ambush/path-modals: alleen speler aan beurt interactief; anderen via `renderSpectatorModal`.

- Open modal + sync: door client aan beurt (niet alleen host)
- `renderSpectatorModal` blijft voor alle niet-actieve clients
- **Geen** wijziging aan host-only modal-flow — turn-owner roept dezelfde `showEventModal()` etc. aan

### Fase 4 — Host-only acties (spelleider)
Blijven bij host (`meta.hostSessionId`):
- Speler **verwijderen** (andere spelers)
- **Nieuw avontuur** / reset
- **Start avontuur** vanuit lobby
- Optioneel: spel beëindigen

Niet host-only:
- Eigen worp op eigen beurt
- Eigen HP handmatig? (afspraak: alleen aan beurt of iedereen eigen HP — kies één)

---

## Conflicts & schrijfrechten

**Probleem:** meerdere clients schrijven naar `state/` — wie wint?

**Aanpak voor avondje D&D (simpel, geen CRDT):**
1. **Alleen speler aan beurt mag `state` en `activeModal` schrijven** tijdens `playing`
2. **Host mag schrijven** in lobby + host-only acties
3. Clients valideren lokaal vóór write: `isMyTurn()` + `phase === 'playing'`
4. Firebase Rules (optioneel later): `.write` alleen met custom token — voor nu vertrouwen + client-side guard (zelfde als sessie 5)

**Race:** twee tabszelfde speler (duplicate session) → voorkomen: één `playerId` per `sessionId`, geen dubbele claim opzelfde `playerId`.

---

## Wat de agent concreet moet bouwen

### `js/multiplayer.js`
- `getMyPlayerId()` / `getMySession()` — lees `sessions/{sessionId}`
- `joinGame(name)` — lobby join
- `startGame()` — host only, `phase → playing`
- `isMyTurn()` — export op `window`
- Pas `syncAfterAction` aan: `isMyTurn() || isHostInLobby()`
- Listener op `sessions/` voor lobby-lijst
- Pas echo-preventie aan: skip eigen writes, apply remote van andere spelers

### `js/ui.js`
- Lobby-overlay (HTML in `index.html` of dynamisch)
- Vervang `setMultiplayerReadOnly` door `updateInputAccess()` (turn + lobby + spectator)
- Sidebar **speler toevoegen** verbergen voor guests (zij gebruiken lobby)
- Sync-hooks blijven op dezelfde plekken — guard in `syncAfterAction` doet de rest
- `advanceTurn` → volgende speler op andere device krijgt invoer

### `index.html` + `css/styles.css`
- Lobby-overlay markup
- Statusregels voor beurt / wachten / lobby

### `js/firebase.js` (klein)
- `writeSession`, `onSessions`, `writeMeta` helpers indien nodig

---

## Serialisatie

Geen wijziging t.o.v. sessie 5 — `serializeGame` / `deserializeGame` blijven. Wel:
- Bij join: nieuwe speler in `state.players` syncen
- `sessions` apart pad (niet in game state snapshot)

---

## Edge cases (testen!)

| Scenario | Verwacht gedrag |
|----------|-----------------|
| Gast joint, host start | Iedereen ziet spelers, beurt 0 |
| Speler A aan beurt, B wacht | B geen invoer, ziet modal mee |
| A doet event → Doorgaan | B ziet outcome, daarna beurt wissel |
| A sterft in put, B in zelfde put | B aan beurt, eigen gevechtsmodal |
| Host refresh | Herclaim host via `hostSessionId`, session behouden |
| Gast refresh | `sessionId` uit sessionStorage →zelfde speler |
| Gast zonder join (spectator) | Read-only, geen worpen (optioneel) |
| 2 spelers, 1 tab each | Beurt wisselt invoer tussen tabs |

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
| 5 | Spectator sync, modals, firebase bridge |
| 1–4 | Spellogica |

---

## Definition of done

- [ ] Gast kan naam invoeren en speler aanmaken in lobby
- [ ] Host start spel; minstens 2 spelers kunnen om beurt spelen op **eigen device**
- [ ] Alleen speler aan beurt heeft actieve invoer (dobbelsteen, modals)
- [ ] Andere spelers zien live bord + modals + log
- [ ] Beurt wissel werkt cross-device zonder host als proxy
- [ ] Host kan nieuw avontuur starten; speler-claim blijft behouden of wordt gereset (documenteer keuze)
