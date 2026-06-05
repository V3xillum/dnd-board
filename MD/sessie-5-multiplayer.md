# Sessie 5 — Multiplayer via Firebase

## Doel
Het spel draait live voor meerdere spelers via een gedeelde URL. Iedereen kijkt naar dezelfde state. De actieve speler vult zelf zijn worp in. Geen server, geen backend — gewoon Firebase Realtime Database bovenop de bestaande GitHub Pages setup.

---

## Hoe het werkt

Elke game krijgt een unieke ID (bijv. `draken-avond-42`). Die staat in de URL als `?game=draken-avond-42`. Iedereen met die URL ziet hetzelfde bord, dezelfde spelers, dezelfde beurt.

Game state leeft in Firebase. De host maakt het spel aan. Alle andere clients luisteren naar Firebase en updaten de UI zodra er iets verandert. De actieve speler krijgt de invoervelden te zien; anderen zien alleen het resultaat.

```
Host → schrijft naar Firebase → Firebase → alle clients ontvangen update
```

---

## Wat je nodig hebt

1. **Firebase account** (gratis) — firebase.google.com
2. **Nieuw project** aanmaken in de Firebase console
3. **Realtime Database** inschakelen (niet Firestore — Realtime is simpeler voor dit usecase)
4. De Firebase config (een klein JS-object met je API keys) in je code plakken

Firebase Realtime Database heeft een gratis tier die ruimschoots genoeg is voor een avondje D&D.

---

## Architectuur

### Wat verandert er niet
- `game.js` — alle spellogica blijft lokaal, ongewijzigd
- `events-data.js` — ongewijzigd
- `index.html` — kleine toevoegingen (game ID invoer, speler-claim UI)

### Wat er bij komt
- `js/firebase.js` — verbinding + sync helpers
- `js/multiplayer.js` — game aanmaken, joinen, state schrijven/lezen

### Data structuur in Firebase
```
games/
  draken-avond-42/
    state/         ← geserialiseerde game state (spelers, posities, HP, boss, etc.)
    lastEvent/     ← laatste log-entry voor live feed
    activePlayer/  ← wie is er aan de beurt (player id)
    phase/         ← 'lobby' | 'playing' | 'finished'
```

---

## Fases — bouw dit in volgorde

### Fase A — Meekijken (MVP)
**Doel:** host speelt, rest kijkt live mee.

- Host opent `index.html?game=xyz` (of genereert een game ID)
- Na elke zet schrijft de host de volledige game state naar Firebase
- Andere clients openen dezelfde URL en lezen de state — UI update automatisch
- Geen invoer voor kijkers, alleen live bord + log

Dit is de kleinste stap en al waardevol: iedereen zit aan tafel en ziet hetzelfde scherm.

**Wat de agent moet bouwen:**
1. Bij pagina-load: lees `?game=` param uit de URL
2. Als geen param: genereer een random game ID + zet in URL (`history.replaceState`)
3. Na elke `game.move()` of `game.resolveEvent()`: schrijf `game state` naar Firebase
4. Alle clients: luister naar Firebase (`onValue`) en roep `renderBoard()` + `renderPlayers()` aan bij elke update
5. Detecteer of je de host bent (eerste verbinding, of aparte "host"-flag in Firebase)

### Fase B — Speler-claim
**Doel:** elke speler claimt zijn eigen poppetje.

- Bij joinen: speler kiest zijn naam uit de lijst (of voegt toe)
- Firebase slaat op welke `player.id` bij welke browser-session hoort
- Invoervelden (dobbelsteen, event-worp) zijn alleen actief als jij aan de beurt bent
- Andere spelers zien een "wacht op [naam]..." bericht

**Wat de agent moet bouwen:**
1. Lobby-scherm: naam invoeren + game ID tonen/kopiëren
2. Bij joinen: schrijf `sessionId → player.id` naar Firebase
3. In `ui.js`: check of `currentPlayer.id === myPlayerId` → toon/verberg invoer
4. Host-only acties (speler toevoegen/verwijderen, nieuw avontuur) blijven host-only

### Fase C — Volledig async (optioneel later)
Spelers hoeven niet tegelijk online te zijn. State blijft in Firebase staan. Dit is een nice-to-have — voor een avondje samen spelen is fase B meer dan genoeg.

---

## Wat de agent concreet moet doen

### `js/firebase.js`
```javascript
// Firebase SDK laden via CDN (geen npm nodig)
// Config object met jouw Firebase project keys
// Twee exports:
//   writeGameState(gameId, state)   → schrijft naar games/{gameId}/state
//   onGameState(gameId, callback)   → luistert naar changes
```

Gebruik Firebase SDK v9 (modular) via CDN:
```html
<script type="module" src="js/firebase.js"></script>
```

### `js/multiplayer.js`
- `initMultiplayer()` — lees URL param, verbind met Firebase, bepaal host/guest
- `syncAfterAction()` — roep aan na elke game-actie (move, resolveEvent, etc.)
- `isMyTurn()` — vergelijk `activePlayer` in Firebase met lokale session
- `onRemoteUpdate(state)` — deserialiseer Firebase state → `game` object → re-render

### `index.html`
Voeg toe boven het bord:
- Game ID tonen + copy-knop
- Kleine statusbalk: "Jij bent aan de beurt" / "Wacht op [naam]..."
- Lobby-overlay (alleen bij eerste load zonder bestaande game)

---

## Serialisatie van game state

`Game` is een class met methodes — die kun je niet rechtstreeks naar Firebase schrijven. Bouw een `serializeGame(game)` en `deserializeGame(data)` functie:

```javascript
// Alleen data, geen methodes
serializeGame(game) → {
  players: [...],
  currentIndex: n,
  bossActive: bool,
  bossHp: n,
  // etc.
}

// Herstel game object uit data
deserializeGame(data) → game object met alle velden gevuld
```

Zorg dat `SPECIAL_SPACES` niet mee geserialiseerd wordt — dat bouw je lokaal opnieuw via `buildSpecialSpaces()`. Wel het `seed` of de volledige `specialSpaces` snapshot opslaan zodat alle clients hetzelfde bord zien.

**Belangrijk:** het bord wordt nu gegenereerd met een seed zodat host en guests exact hetzelfde bord zien. Voeg `boardSeed` toe aan de game state en gebruik die in `buildSpecialSpaces()`.

---

## Veiligheid (Firebase Rules)

Zet Firebase Database Rules zo in dat alleen lezen en schrijven mag voor clients met de game ID — geen authenticatie nodig voor een avondje spelen:

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

Dit is open maar acceptabel voor een privé spelletjesavond. Voeg later eventueel een simpele host-token toe als je het iets veiliger wilt.

---

## Afhankelijkheden

| Sessie | Nodig voor |
|--------|------------|
| 1–4 | Alle spellogica, HP, boss, ambush |
| 5A | Meekijken — kleinste stap, direct speelbaar |
| 5B | Speler-claim — iedereen speelt zelf |

---

## Na sessie 5
- Fase C: async spelen (Firebase state blijft bewaard)
- Lobby met game history
- Board seed kiezen voor herhaalbare games
- Spectator mode zonder naam-claim
