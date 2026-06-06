# Sessie 6 — Echte multiplayer (iedereen speelt zelf)

**Status:** nog te bouwen — plan bijgewerkt na sessie 11 (UI-split), 11b (`game/*`-split) en host-fallback/re-claim keuzes.

**Voorganger:** [sessie-5-multiplayer.md](sessie-5-multiplayer.md) (spectator mode — ✅ geïmplementeerd).

## Doel

Upgrade van spectator mode (sessie 5) naar **echte multiplayer**: elke gast maakt **zelf** een speler aan en voert **zelf** worpen in op **eigen beurt**. Anderen kijken live mee tot het hun beurt is.

De host is niet langer de enige die het bord bedient — hij is **spelleider/DM** (game aanmaken, link delen, spelers verwijderen, nieuw avontuur). Normaal speelt iedereen zelf; de host kan **altijd** als fallback ieders beurt bedienen als iemand offline is (telefoon leeg, tab dicht, even weg).

---

## Verschil met sessie 5 (huidige situatie)

| | Sessie 5 (nu) | Sessie 6 |
|---|---------------|----------|
| Wie speelt | Alleen host | Iedereen met eigen speler; host als DM-fallback |
| Spelers toevoegen | Host via sidebar | Gast maakt zichzelf aan (lobby) of claimt offline slot |
| Worpen | Host voert alles in | Speler aan beurt; host mag altijd invallen |
| Firebase writes | Alleen host | Turn-owner + host altijd (+ meta/lobby) |
| UI | `app--spectator` voor alle guests | Turn-based invoer per client |
| Schrijfrecht-check | `isMultiplayerHost()` | `isMyTurn()` **of** `isMultiplayerHost()` |
| Reconnect | — | Claim in spelerslijst; geen aparte reclaim-link |

---

## Hoe het werkt (spelerflow)

```
1. Host opent URL        → lobby, is host + spelleider
2. Host deelt link
3. Gast opent URL        → lobby: nieuwe speler ("Meedoen") of claim offline slot
4. Gast krijgt playerId  → gekoppeld aan sessionId in Firebase (+ session heartbeat)
5. Host start spel       → phase: 'playing' (min. 2 spelers?)
6. Speler X aan beurt     → X's tab heeft invoer; host mag altijd invallen (DM-fallback)
7. Anderen               → read-only + "Wacht op [naam]..."
8. X gaat offline        → spelerslijst toont offline; host speelt verder OF iemand claimt X
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
      lastSeen        ← session heartbeat (15s interval, zelfde patroon als host)
```

**Online/offline per speler:** speler is *online* als minstens één session met die `playerId` een `lastSeen` heeft binnen 45s (`SESSION_STALE_MS`, gelijk aan host). Geen session gekoppeld → slot is *vrij* (claimbaar).

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

Sessie 5 gebruikt één class `app--spectator` voor alle guests. Sessie 6 heeft vier modi:

| Modus | Wanneer | UI |
|-------|---------|-----|
| **Lobby** | `phase === 'lobby'` | Lobby-overlay; geen worpen; host ziet Start |
| **Mijn beurt** | `isMyTurn()` | Volledige sidebar-invoer (dice, HP, rest, modals) |
| **Host (DM)** | `isHostProxy()` — host speelt voor huidige beurtspeler | Zelfde invoer als mijn beurt; status *"Je speelt als DM voor [naam]…"* |
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
| `js/ui/players.js` | `updateTurnUI`, HP/rest controls, auto-open ambush/boss, **claim-knop + online-status** |
| `js/ui/flow.js` | `advanceTurn`, `continueAfterLand` — modal auto-open alleen turn-owner |
| `js/ui/modals/core.js` | `renderSpectatorModal`, sync modal, spectator CSS classes |
| `js/ui/modals/events.js` | Modal close → clear sync (nu host-only) |
| `js/ui/modals/combat.js` | Combat flow + spectator-wachtteksten |
| `index.html` | Lobby-overlay markup, multiplayer-bar |
| `css/styles.css` | `.app--spectator`, `.app--waiting`, `.app--host-proxy` (nieuw), lobby + claim styles |

**Niet meer van toepassing:** `js/ui.js` (opgesplitst in `js/ui/*`).

**Al aanwezig uit sessie 5 (niet opnieuw bouwen):**
- Host heartbeat (`touchHostPresence`, 15s interval)
- Host takeover bij stale host (45s, `claimHost`)
- Token-animatie bij remote refresh (`refreshGameUIFromRemote` in `bootstrap.js`)
- Echo-preventie via `updatedBy` / `pendingLocalWrite`

**Nieuw in sessie 6 (disconnect/re-claim):**
- Session heartbeat per gekoppelde speler (`lastSeen` in `sessions/`)
- Online/offline indicator + **Claim**-knop in spelerslijst
- Host DM-fallback: host mag altijd beurt van huidige speler bedienen

---

## Fases — bouwvolgorde

### Fase 1 — Lobby & speler aanmaken

**Doel:** gasten kunnen joinen en een poppetje claimen vóór het spel start.

**UI (overlay of panel):**
- Game ID + copy-knop (bestaat al in `#multiplayer-bar`)
- Naam invoeren + knop **Meedoen** (nieuwe speler)
- Of: **Claim** op bestaande speler in sidebar/lijst (offline slot of host-added speler)
- Lijst van joined spelers (uit `sessions/`) met online-status
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

### Fase 2 — Turn-based invoer + host DM-fallback

**Doel:** speler aan beurt speelt zelf; host kan **altijd** invallen (spel loopt nooit vast).

**Turn-gating + host-fallback:**

```javascript
const SESSION_STALE_MS = 45_000; // zelfde drempel als host

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

/** Host speelt voor huidige beurtspeler (niet eigen beurt). */
function isHostProxy() {
  if (!window.isMultiplayerHost?.() || getMetaPhase?.() !== 'playing') return false;
  if (isMyTurn()) return false; // eigen beurt = normaal, geen proxy-label
  return Boolean(game.currentPlayer);
}

function canSyncGame() {
  return isMyTurn() || isHostProxy() || isHostInLobby();
}

function canPlayInteractively() {
  return (isMyTurn() || isHostProxy()) && getMetaPhase?.() === 'playing';
}

function isPlayerOnline(playerId, sessions) {
  const now = Date.now();
  return Object.values(sessions ?? {}).some(
    (s) => s.playerId === playerId && now - (s.lastSeen ?? 0) <= SESSION_STALE_MS,
  );
}

function isPlayerClaimable(playerId, sessions) {
  return !isPlayerOnline(playerId, sessions);
}

function updateInputAccess() {
  const phase = getMetaPhase?.() ?? 'playing';
  const canPlay = canPlayInteractively();
  const waiting = getMyPlayerId() && !canPlay && phase === 'playing';
  const spectate = isSpectator() && phase === 'playing';

  document.querySelector('.app')?.classList.toggle('app--spectator', spectate || phase === 'lobby' && !window.isMultiplayerHost?.());
  document.querySelector('.app')?.classList.toggle('app--waiting', waiting);
  document.querySelector('.app')?.classList.toggle('app--host-proxy', isHostProxy());

  // Dice/HP/rest: hidden via CSS classes; modals via canPlayInteractively
  updateTurnUI();
}
```

**Sync-rechten (`multiplayer.js`):**
- `syncAfterAction()` / `syncActiveModal()` / `syncLastEvent()` → guard met `canSyncGame()` i.p.v. `isHost`
- Host mag **altijd** syncen tijdens `playing` (DM-fallback); turn-owner ook

**Statusbalk (`#mp-role` of apart element):**
- *"Jij bent aan de beurt"*
- *"Je speelt als DM voor [naam]…"* (host-fallback)
- *"Wacht op [naam]…"*
- *"Kies een speler om mee te doen"* (lobby, geen claim)
- *"Je kijkt mee"* (spectator zonder claim — optioneel toestaan)

**Invoer die turn-gating nodig heeft (nu allemaal host-only of altijd actief):**
- Dobbelsteen + Verplaats (`dice-controls`)
- HP handmatig (`hp-controls`)
- Short/long rest (`shortRestBtn`, `longRestBtn`, D4-input)
- Difficulty blijft **host-only** (opacity + pointer-events, zoals nu)

### Fase 3 — Modals op beurt (+ host DM-fallback)

**Doel:** event/boss/ambush/path-modals: speler aan beurt **of host (DM)** interactief; anderen via `renderSpectatorModal`.

- Open modal + sync: door **`canPlayInteractively()`** client (turn-owner of host-proxy)
- `renderSpectatorModal` voor clients waar `!canPlayInteractively()`
- Guard in `core.js`: `if (canPlayInteractively()) return;` i.p.v. `if (isMultiplayerHost()) return;`
- Spectator-wachtteksten aanpassen: *"Host beslist…"* → *"[naam] beslist…"* of generiek *"Speler aan beurt…"*
- Bij verlies van beurt (`updateInputAccess` → `!canPlayInteractively()`): interactieve modal lokaal sluiten — vangnet naast `activeModal: null` (zie edge case mid-modal)

**Kritiek: modal auto-open alleen op interactieve client**

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
- **Nieuw avontuur** / reset (zie keuze hieronder)
- **Start avontuur** vanuit lobby
- **Difficulty** wijzigen
- Optioneel: spel beëindigen

**Nieuw avontuur — claim-keuze (vastgelegd):**
- Game state reset (nieuw bord), `phase` terug naar `'lobby'`
- **Sessions blijven gekoppeld** aan dezelfde `playerId`s — spelers hoeven niet opnieuw te claimen als hun tab nog open is
- Offline spelers (stale session) tonen **Claim** in lijst tot iemand terugkomt

Niet host-only:
- Worpen op **eigen beurt** (`isMyTurn()`)
- Worpen voor **andere speler** als host DM-fallback (`isHostProxy()`)
- HP/rest handmatig — **alleen** via `canPlayInteractively()` (eigen beurt of host-proxy)

### Fase 5 — Disconnect & re-claim

**Doel:** speler gaat weg → spel gaat door; zelfde of nieuwe gast kan poppetje overnemen.

**Session heartbeat:**
- Elke client met `playerId`-claim stuurt `lastSeen` elke 15s naar `sessions/{sessionId}` (zelfde interval als host)
- Bij tab sluiten stopt heartbeat → na 45s `isPlayerOnline()` = false

**Spelerslijst (`renderPlayers` in `players.js`):**

| Speler | Indicator | Actie (niet-eigen speler) |
|--------|-----------|---------------------------|
| Online | 🟢 of "online" | — |
| Offline / geen session | ⚪ "offline" | **Claim** (gast/spectator) |
| Jij | 🟢 "jij" | — |

- **Claim** roept `claimPlayer(playerId)` → schrijft `sessions/{sessionId}` met bestaande `playerId` + `name` uit game state
- Geen dubbele claim: als speler online is, Claim-knop disabled/verborgen
- Oude stale session blijft in Firebase tot cleanup (optioneel: overschrijven bij nieuwe claim opzelfde `playerId` — laatste claim wint)

**Drie lagen (werken samen, geen aparte reclaim-link nodig):**

```
Normaal     → speler speelt eigen beurt (isMyTurn)
Iemand weg  → host speelt verder (isHostProxy) — spel stopt niet
Terugkeer  → zelfde persoon: refresh (sessionId in sessionStorage) OF Claim in lijst
Overname    → andere gast claimt offline poppetje via lijst
```

**Geen `?claim=playerId` deep link** — claim via spelerslijst is voldoende; deep link bewust buiten scope.

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
| `ui/modals/events.js` | modal close | clear sync als host | clear sync als `canPlayInteractively()` |
| `ui/players.js` | `updateTurnUI` | auto-open ambush/boss als host | als `canPlayInteractively()` |
| `ui/flow.js` | `advanceTurn` | auto-open modals altijd lokaal | als `canPlayInteractively()` |
| `ui/bootstrap.js` | `resyncActiveModalIfOpen` | sync als host | als `canSyncGame()` |

**Behouden:** `window.isMultiplayerHost()` voor spelleider-acties (lobby start, nieuw avontuur, speler verwijderen). Optioneel alias: `window.canSyncGame()` voor writes.

---

## Conflicts & schrijfrechten

**Probleem:** meerdere clients schrijven naar `state/` — wie wint?

**Aanpak voor avondje D&D (simpel, geen CRDT):**
1. **Speler aan beurt óf host mag `state` en `activeModal` schrijven** tijdens `playing`
2. **Host mag schrijven** in lobby + host-only acties (reset, speler verwijderen)
3. Clients valideren lokaal vóór write: `canSyncGame()`
4. Firebase Rules (optioneel later): `.write` alleen met custom token — voor nu vertrouwen + client-side guard (zelfde als sessie 5)

**Race:** twee tabs, zelfde speler → voorkomen: één actieve session per `playerId` (laatste claim wint; oude session wordt orphan).

**Race:** host-proxy en turn-owner tegelijk → acceptabel voor avondje-spel: host wint praktisch als hij klikt; turn-owner heeft voorrang als online. Geen lock-mechanisme nodig.

**Join + addPlayer:** gast schrijft session + state in één logische actie; host valideert unieke naam. Bij conflict: tweede write verliest (Firebase last-write-wins) — acceptable voor avondje-spel.

**Re-claim:** `claimPlayer(playerId)` schrijft alleen eigen `sessions/{sessionId}`; geen `state`-mutatie. Host-proxy blijft werken tot nieuwe claim online is.

---

## Wat de agent concreet moet bouwen

### `js/multiplayer.js`
- `getMyPlayerId()` / `getMySession()` / `getMetaPhase()` — lees `sessions/{sessionId}` + meta
- `joinGame(name)` — lobby join (nieuwe speler)
- `claimPlayer(playerId)` — re-claim bestaand poppetje
- `startGame()` — host only, `phase → playing`
- `isMyTurn()`, `isHostProxy()`, `canSyncGame()`, `canPlayInteractively()` — export op `window`
- `isPlayerOnline()` / `isPlayerClaimable()` — helper voor spelerslijst
- Session heartbeat: `touchSessionPresence()` elke 15s voor eigen session
- Pas `syncAfterAction`, `syncActiveModal`, `syncLastEvent` aan: guard met `canSyncGame()`
- Listener op `sessions/` voor lobby-lijst + online-status
- Pas echo-preventie aan: skip eigen writes, apply remote van andere spelers
- Vervang `setMultiplayerReadOnly(!isHost)` door `updateInputAccess()`

### `js/ui/bootstrap.js`
- `updateInputAccess()` — vervangt `setMultiplayerReadOnly` (turn + lobby + spectator + waiting)
- Lobby event listeners (Meedoen, Start avontuur)
- `refreshGameUIFromRemote` blijft hier (canonical export); dood code in `flow.js` opruimen

### `js/ui/players.js`
- `updateTurnUI` — auto-open ambush/boss alleen bij `canPlayInteractively()`
- HP/rest controls respecteren waiting-state (hidden via CSS)
- Spelerslijst: online/offline indicator + **Claim**-knop voor claimbare spelers
- Claim-knop listener → `window.claimPlayer?.(playerId)`

### `js/ui/flow.js`
- `advanceTurn` — modal auto-open alleen op `canPlayInteractively()` client
- Verwijder duplicate `refreshGameUIFromRemote` (niet geëxporteerd, bootstrap-versie telt)

### `js/ui/modals/core.js` + `events.js` + `combat.js`
- Spectator guard → `canPlayInteractively()`
- Modal close / clear sync → `canPlayInteractively()` (turn-owner of host-proxy)
- Wachtteksten host-neutral (*"[naam] beslist…"* / *"Speler aan beurt…"*)

### `index.html` + `css/styles.css`
- Lobby-overlay markup
- `.app--waiting` styles (dice/hp/rest hidden, statusregel zichtbaar)
- `.app--host-proxy` — optioneel visuele hint (statusregel volstaat)
- `.btn-claim` — claim-knop in spelerslijst
- Statusregels voor beurt / wachten / DM-fallback / lobby

### `js/firebase.js` (klein)
- `writeSession`, `onSessions`, `writeMeta` helpers
- `touchSessionPresence(gameId, sessionId)` — update `lastSeen`
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
| Beurt wissel mid-modal | Zie detail hieronder — `activeModal: null` sluit modals op alle clients; nieuwe turn-owner opent fris |
| A doet short rest | Alleen A's tab: D4 invoer + sync; B wacht |
| Speler sluit tab | Na 45s offline in lijst; host kan beurt spelen (DM-fallback) |
| Speler komt terug | Refresh → zelfde sessionId; of **Claim** in spelerslijst |
| Gast claimt offline poppetje | Nieuwe tab krijgt invoer op beurt van die speler; host-proxy stopt voor die speler |
| Beurt van offline speler | Host ziet DM-fallback-invoer; spel loopt door |
| Host speelt terwijl speler online | Beide *kunnen* syncen — avondje-spel vertrouwen; normaal speelt speler zelf |
| Nieuw avontuur | State reset + lobby; sessions blijven aan playerIds gekoppeld |

### Beurt wissel mid-modal (detail)

**Scenario:** A zit halverwege een event-modal (bijv. combat) en verliest de beurt of het spel gaat door — denk aan death → `nextTurn()` springt naar B terwijl A's modal nog open staat.

**Wie sluit wat:**

1. **Client die de beurt afrondt** (meestal nog A, vlak vóór `advanceTurn`) roept `closeEventModal()` / equivalent aan en daarna `clearSyncedActiveModal()` — dat schrijft `activeModal: null` naar Firebase plus een verse `state`-sync met de nieuwe `currentIndex`.
2. **B (wachtend, spectator)** ontvangt `onActiveModal(null)` → `renderSpectatorModal(null)` roept eerst `closeSpectatorModals()` aan (regel 310–311 in `core.js`) en stopt — A's modal verdwijnt op B's scherm. Daarna triggert `applyRemoteState` → `updateInputAccess()`: B krijgt invoer. Indien nodig opent `updateTurnUI()` / `advanceTurn()` op B's device **lokaal** een nieuwe interactieve modal (bijv. ambush voor B).
3. **A (ex turn-owner)** sluit de interactieve modal lokaal in dezelfde flow als stap 1 — A is de writer en krijgt geen echo via `onActiveModal`. Als A's modal toch blijft hangen (race), moet `updateInputAccess()` bij `!canPlayInteractively()` een `forceCloseAllModals()`-achtige cleanup doen.

**Kern:** één write naar `activeModal: null` is het broadcast-signaal dat iedereen de modal dicht moet hebben; pas daarna mag de nieuwe turn-owner een **nieuwe** modal openen en syncen. Nooit twee modals tegelijk laten staan — altijd eerst null, dan eventueel nieuwe modal.

---

## Bewust buiten scope (sessie 6)

- Async spelen (dagen later verder) — sessie 7?
- Firebase Auth / invite codes
- Reclaim deep links (`?claim=playerId`) — claim via spelerslijst volstaat
- Chat
- Board seed kiezen
- Volledige log-history op Firebase
- Session cleanup job (orphan sessions mogen blijven staan)

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
- [ ] Speler aan beurt heeft actieve invoer (dobbelsteen, HP, rest, modals)
- [ ] Host kan **altijd** beurt bedienen als DM-fallback (`isHostProxy`)
- [ ] Wachtende speler ziet hidden controls + status *"Wacht op [naam]…"*
- [ ] Andere spelers zien live bord + modals + log (spectator mode)
- [ ] Beurt wissel werkt cross-device; host vangt offline speler op
- [ ] Modal auto-open alleen op `canPlayInteractively()` client (geen dubbele modals)
- [ ] Alle `isMultiplayerHost`-sync guards gemigreerd naar `canSyncGame` / `canPlayInteractively`
- [ ] Spelerslijst toont online/offline; **Claim** voor offline slots
- [ ] Session heartbeat (`lastSeen`) per gekoppelde speler
- [ ] Nieuw avontuur: state reset + lobby; **sessions blijven gekoppeld** aan playerIds
