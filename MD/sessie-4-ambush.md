# Sessie 4 — Ambush: de put

## Doel
Ambush-vakjes zijn **de put** van dit ganzenbord: je valt erin en komt er niet uit door verder te lopen. Je vecht de **ambusher** uit met één worp per beurt (succes of faal) tot **jij** of de **ambusher** op 0 HP is. Pas daarna mag die speler weer normaal spelen (dobbelsteen, events, enz.).

Dit is géén snelle one-shot check met +1 movement of skip — het is een **vastgezette gevechtsmodus**, vergelijkbaar met hoe de boss (sessie 3) de eindfase blokkeert, maar per speler en op willekeurige vakjes.

---

## Kernregel: de put

### Start
- Speler landt op een ambush-vak (`category: 'ambush'`).
- Ambush start: speler zit **vast** op dit vak.
- Initialiseer **ambusher HP** uit het event (bijv. `ambushHp: 3` in `EVENT_POOL`).
- Geen beweging, geen normaal event-movement (sessie 2-formule geldt **niet** in de put).

### Elke beurt van die speler (zolang de put actief is)
- Geen dobbelsteen, geen normaal vak-event.
- **Eén D20-check** tegen de DC van dit ambush-event.
- **Succes:** ambusher −1 HP (`ambushHp -= 1`).
- **Falen:** speler −1 HP via de centrale mutatiefunctie (sessie 1).
- **Geen** stappen vooruit/achteruit na deze worp — alleen schade.

### Einde put
De put eindigt zodra **één** van deze waar is:

| Uitkomst | Gevolg |
|----------|--------|
| `ambushHp === 0` | Ambusher verslagen → put opgeheven, speler mag weer normaal spelen op **hetzelfde vak** |
| Speler `hp === 0` | Death-flow sessie 1 (start, HP reset, movement bonus) → put opgeheven |

Pas **na** het einde van de put mag de speler weer dobbelstenen of een normaal event op dat vak doen (als dat vak dan nog een event is — ambush-vak blijft visueel ambush, maar dezelfde put start niet opnieuw tenzij je dat expliciet wilt; standaard: **één put per ambush-landing**, daarna behandelen als “opgeruimd” vak of gewoon normaal event — kies **opgeruimd**: na win geen tweede put op hetzelfde vak in dezelfde game).

### Wat níet gebeurt in de put
- Geen `calcEventSuccessSteps` / overshoot-movement (sessie 2).
- Geen `randomSteps1to3` achteruit bij falen — alleen HP-schade.
- Geen boss-check (sessie 3) tegelijk; prioriteit documenteren: **ambush > boss** als beide zouden kunnen (normaal niet op hetzelfde vak).

---

## Speelbaar wanneer
- **`AMBUSH_RATIO`** (~8% standaard) van event-vakjes 2–61 is ambush — tunable in `events-data.js`
- Elk ambush-vak toont een **willekeurige** ambusher uit `AMBUSH_POOL` (eigen kleur + legenda)
- Landen op ambush → put-UI, ambusher HP zichtbaar
- Vastzittende speler kan niet dobbelstenen tot de put voorbij is
- Per beurt: één worp → succes = ambusher schade, faal = speler schade
- Ambusher dood → speler loopt weer normaal verder
- Speler dood in put → death-flow, put weg

---

## Wat er moet gebeuren

### events-data.js

**Ambush-pool** (zelfde patroon als `BOSS_POOL` in sessie 3):
- `category: 'ambush'` + styling-kleur (oranje/geel).
- `AMBUSH_POOL = EVENT_POOL.filter((e) => e.category === 'ambush')`.
- **4–6+ events**, DC 9–11, elk met `ambushHp` (2–4), `name`, `icon`, `ability`, `flavor`, `successText`, `failText`.
- Voorbeelden: goblin in de struiken, sluipmoordenaar, cave spider, bandieten uit de kuil, …

**Bordgeneratie — percentage, niet “altijd 2 vakjes”:**
```js
const AMBUSH_RATIO = 0.08; // tune: ~8% van event-slots; 0.05 subtieler, 0.12 gevaarlijker
```

In `buildSpecialSpaces()`, **na** pad + normale events op 2–61:
1. Verzamel slots met `type: 'event'`.
2. `ambushCount = Math.max(1, Math.round(eventSlots.length * AMBUSH_RATIO))` (cap op aantal beschikbare slots).
3. Kies willekeurige slots → overschrijf met `{ type: 'event', ...draw uit AMBUSH_POOL }`.
4. Exclude ambush-events uit easy/mid/late decks (zoals bosses), geen dubbele rol als normaal event.

**Put start:** `ambushConfig` = het event **op dat vak** (naam, DC, `ambushHp`, icon, flavor) — geen aparte random draw bij landing, tenzij het vak leeg is (fallback: random uit `AMBUSH_POOL`).

### game.js

**State op `Game` (globaal per actieve put):**
- `ambushActive: false`
- `ambushPlayerId: null` — wie zit in de put
- `ambushHp` / `ambushMaxHp`
- `ambushConfig` — referentie naar het event (naam, DC, icon, …)
- Optioneel: `ambushClearedSpaces: Set` — vaknummers waar de put al gewonnen is (geen herstart)

**`resolveSpace()`:** bij ambush-vak + speler landt → start put (tenzij vak al cleared). Geen normale `needsEvent` voor movement-chain.

**Beurt-flow:** als `ambushActive && currentPlayer.id === ambushPlayerId` → `resolveAmbushRoll(roll, nat20)` i.p.v. dobbelsteen/boss/normaal event. Hergebruik Nat 20/Nat 1-regels uit sessie 2 **alleen** als dat past (bijv. Nat 20 = gegarandeerd succes +1 HP ambusher hit; Nat 1 = fail + HP — documenteer in implementatie).

**`resolveAmbushRoll`:**
- Succes → `ambushHp -= 1`, log event
- Falen → `applyHpChange(player, -1)` (sessie 1)
- Als `ambushHp === 0` → clear ambush state, event `ambush-end` success
- Als speler death → clear ambush state (death-handler doet positie)

Reset alle ambush-state in `game.reset()`.

### ui.js

- `cell--ambush` in `EVENT_CATEGORY_CLASS` + legenda in `index.html`.
- **Put-panel** (sidebar of overlay): ambusher naam/icon, HP-balk, “Je zit vast — vecht om eruit te komen”.
- Ambush-modal (of hergebruik event-modal met duidelijke **put**-styling): één worp, geen movement-resultaat.
- Blokkeer dobbelsteen-knop zolang `ambushActive` voor de huidige speler.
- Log: `Ambush: [naam] — succes/faal — ambusher X HP, speler Y HP`.

---

## Handmatige testchecklist

- [ ] Land op ambush → put start, geen dobbelsteen
- [ ] Succes → ambusher HP omlaag, speler positie ongewijzigd
- [ ] Falen → speler HP omlaag, geen achteruitbeweging
- [ ] Ambusher op 0 HP → put weg, volgende actie mag dobbelsteen zijn
- [ ] Speler op 0 HP in put → death + put weg
- [ ] Andere spelers kunnen wel normaal spelen (alleen de vastzittende speler zit in de put)
- [ ] Nieuw spel → ambush-state weg
- [ ] Nieuw avontuur → ander aantal/kleur ambush-vakjes volgens `AMBUSH_RATIO`

---

## Afhankelijkheden

| Sessie | Nodig voor |
|--------|------------|
| 1 | Speler HP, centrale mutatie, death |
| 2 | D20-modal, Nat 1/20 (optioneel in put) |
| 3 | Patroon “speciale modus i.p.v. normale beurt” (boss); ambush is apart maar vergelijkbaar |

---

## Na sessie 4
Het spel is v1.1. Mogelijke polish:
- Boss fases (sessie 3)
- Meer ambush-events / zwaardere ambushers op late vakjes
- Animatie “val in de put”
- Ambush + boss prioriteit / edge cases op vak 62+
