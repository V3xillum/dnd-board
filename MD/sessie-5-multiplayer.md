# Sessie 5 — Multiplayer via Firebase (spectator mode)

**Status:** Fase A geïmplementeerd (naslag)

## Doel
Het spel draait live voor meerdere spelers via een gedeelde URL. Iedereen kijkt naar dezelfde state. **Alleen de host** speelt en voert worpen in; alle andere clients zijn read-only toeschouwers.

Geen server, geen backend — Firebase Realtime Database bovenop de bestaande GitHub Pages setup.

> **Volgende stap:** echte multiplayer (gast speelt zelf) → zie [sessie-6-multiplayer.md](sessie-6-multiplayer.md).

---

## Hoe het werkt

Elke game krijgt een unieke ID (bijv. `kerker-a3f9`). Die staat in de URL als `?game=kerker-a3f9`. Iedereen met die URL ziet hetzelfde bord, dezelfde spelers en dezelfde beurt.

```
Host → schrijft naar Firebase → Firebase → guests ontvangen update → UI + modals
```

**Host:** eerste tab die het spel opent (claim via `meta/hostSessionId`). Speelt normaal, sidebar + modals actief.

**Guest:** elke andere tab/browser. Ziet live mee, geen invoer. Status: *"Je kijkt mee (alleen lezen)"*.

**Tip:** open altijd eerst de host-tab, kopieer daarna de link voor guests.

---

## Architectuurkeuze: module-bridge (Optie B1)

`firebase.js` blijft een ES module (Firebase CDN imports). Alle andere scripts (`game.js`, `ui.js`, `multiplayer.js`) blijven klassieke scripts met `window.*`.

`firebase.js` exposeert helpers op `window` — geen `import` uit andere bestanden.

Scriptvolgorde in `index.html`:

```html
<script type="module" src="js/firebase.js"></script>
<script src="js/events-data.js"></script>
<script src="js/game.js"></script>
<script src="js/multiplayer.js"></script>
<script src="js/ui.js"></script>
```

---

## Bestanden

| Bestand | Rol |
|---------|-----|
| `js/firebase.js` | Firebase init + window-bridge (`writeGameState`, `onGameState`, `writeActiveModal`, …) |
| `js/multiplayer.js` | Init, host/guest, serialize/deserialize, sync, log-feed |
| `js/ui.js` | Sync-hooks na mutaties, `renderSpectatorModal()`, read-only UI |
| `js/events-data.js` | `applySpecialSpaces()` — bord snapshot toepassen op guests |
| `index.html` | Multiplayer-statusbalk + copy-knop |
| `css/styles.css` | `.app--spectator`, `.event-modal--spectator`, … |

`game.js` — spellogica ongewijzigd.

---

## Firebase data structuur

```
games/{gameId}/
  state/          ← volledige game state (serializeGame)
  activeModal/    ← open modal voor live sync (apart pad, snelle update)
  lastEvent/      ← laatste log-regel (live feed, geen volledige history)
  meta/           ← hostSessionId, phase: 'playing'
```

### `state` bevat o.a.
- `players`, `currentIndex`, `bossActive`, `bossHp`, `ambushPits`, …
- `specialSpaces` — volledige snapshot van `SPECIAL_SPACES` (zelfde bord op alle clients)
- `activeModal` — kopie van open modal (fallback na refresh)
- `updatedBy`, `updatedAt` — echo-preventie

### `lastEvent`
```javascript
{ seq, message, type, updatedBy, updatedAt }
```
`seq` = timestamp; guests dedupliceren op `seq`. Geen backfill van eerdere log bij late join.

### `activeModal`
```javascript
{
  type: 'event' | 'boss' | 'ambush' | 'path' | 'win',
  phase: 'input' | 'outcome',
  spaceNum: 42,
  config: { name, icon, flavor, ability, dc, … },
  outcome: { … }   // bij phase === 'outcome'
}
```
Geen callbacks — die blijven lokaal op de host.

---

## Wat is gebouwd (Fase A)

### Init & host-detectie
1. Lees `?game=` uit URL; zo niet → genereer slug + `history.replaceState`
2. `sessionId` in `sessionStorage` (`gbSessionId`)
3. `claimHostIfEmpty` → schrijft `meta/hostSessionId` als leeg
4. Host = `meta.hostSessionId === sessionId`

### State-sync
- `syncAfterAction()` na elke game-mutatie (alleen host)
- `deserializeGame()` past game-object in-place aan op guests
- `refreshGameUI()` → `renderBoard`, `renderPlayers`, combat rail
- Host negeert eigen writes terug (`updatedBy === sessionId`)

### Live log
- `addLog()` → `syncLastEvent()` op host
- Guests: `onLastEvent` → `appendRemoteLogEntry()`

### Spectator modals
Aparte functie **`renderSpectatorModal()`** — niet `showEventModal()` hergebruiken voor guests.

| Modal | Guest ziet |
|-------|------------|
| event / boss / ambush | input: check + *"Host voert de check uit…"*; outcome: worp + resultaat |
| path (rustig pad) | kaart + flavor, knop **"Rust even uit"** verborgen |
| win | overwinningstekst, geen knop |

Host-flow (`showEventModal`, `finishEventFlow`, `showPathModal`, …) blijft ongewijzigd voor guests.

Sync-momenten:
- modal open → `syncModalInput()`
- na worp → `syncModalOutcome()`
- sluiten → `clearSyncedActiveModal()` + `syncActiveModal(null)`

Ambush/boss/events: **Doorgaan**-knop op host; guests zien outcome tot host doorgaat.

Path-modal: host klikt **"Rust even uit"** (`closePathModal()` via vaste `addEventListener`).

### UI
- Statusbalk: host/guest-status + game ID + link kopiëren
- `.app--spectator` — sidebar-invoer disabled
- `.event-modal--spectator` / `.path-modal--spectator` — modals zonder invoer/sluitknop

### Bord-sync
`SPECIAL_SPACES`-snapshot in state (geen `boardSeed`). `applySpecialSpaces()` in `events-data.js` zet de globale `SPECIAL_SPACES` op guests.

---

## Sync-hooks in ui.js (host)

`window.syncAfterAction?.()` na o.a.:
- speler toevoegen/verwijderen
- move, HP, event/boss/ambush resolve
- beurt wissel (`advanceTurn`)
- nieuw avontuur

`advanceTurn` synct **na** auto-open van ambush/boss-modal (volgorde belangrijk).

---

## Veiligheid (Firebase Rules)

```json
{
  "rules": {
    "games": {
      "$gameId": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

Open rules — acceptabel voor privé avond. Zie sessie 6 voor aanscherping bij turn-based writes.

---

## Bekende beperkingen (bewust in Fase A)

- Alleen host voert worpen in en beheert spelers
- Geen speler-claim / geen `isMyTurn()`
- Geen lobby-overlay
- Log: alleen live feed (`lastEvent`), geen volledige history op guests
- Geen async spelen (state verdwijnt als niemand meer kijkt)

---

## Afhankelijkheden

| Sessie | Nodig voor |
|--------|------------|
| 1–4 | Spellogica, HP, boss, ambush |
| 5 (deze) | Spectator mode — live meekijken |
| 6 | Echte multiplayer — iedereen speelt zelf |

---

## Testchecklist

1. Host opent pagina → game ID in URL, status *"Jij bent de host"*
2. Guest (incognito) →zelfde URL → *"Je kijkt mee"*, invoer disabled
3. Host beweegt → guest ziet token + log
4. Host opent event/boss/ambush → guest ziet modal mee
5. Host opent rustig pad → guest ziet kaart, host klikt *Rust even uit*
6. 2 spelers in put, 1 sterft → host Doorgaan → volgende speler gevecht op beide schermen
