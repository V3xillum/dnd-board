# Sessie 7 — Mystery vakjes & moeilijkheidsgraad

**Status:** nog te bouwen

## Doel
Ambush- en boss-vakjes worden vervangen door `?`-vakjes. De eerste speler die landt gooit een D12 — de uitkomst bepaalt wat er achter zit én hoe zwaar het is. Niemand weet van tevoren wat er op een vakje staat.

---

## Spelregel: de D12 onthullingstabel

| Roll | Uitkomst | Modifier |
|------|----------|----------|
| 1–2 | Rustig pad | — |
| 3–8 | Ambush × 1 | normaal (HP en dmg uit event) |
| 9–11 | Ambush × 1.5 | HP en dmg afgerond naar boven |
| 12 | Ambush × 2 | HP en dmg verdubbeld + permanente +1 `dmgBonus` bij winst |

Boss preview zit bewust **niet** in deze tabel — boss blijft op vak 62.

---

## Nieuwe speler-velden

Voeg toe aan `addPlayer()` naast de bestaande velden uit sessie 1:

| Veld | Startwaarde | Gedrag |
|------|-------------|--------|
| `dmgBonus` | `0` | Permanente schade-bonus; +1 bij × 2 ambush winst |

`dmgBonus` bepaalt hoeveel schade een speler doet per succesvolle hit in een ambush of boss-check. Standaard is schade 1 per succes — met `dmgBonus` wordt dat `1 + dmgBonus`.

Verwerk `dmgBonus` in `resolveAmbushRoll()` en `resolveBoss()`:
```
schade aan vijand bij succes = 1 + player.dmgBonus
```

---

## Mystery vakjes

### Bordgeneratie (`events-data.js`)

Vervang de huidige ambush-slots in `buildSpecialSpaces()`:
- Waar nu `AMBUSH_RATIO` ambush-tegels worden geplaatst, komen `?`-vakjes
- Een `?`-vakje heeft `type: 'mystery'`, `category: 'mystery'`, `icon: '❓'`
- Geen `ambushConfig` bij generatie — die wordt bepaald bij onthulling

```javascript
{
  type: 'mystery',
  category: 'mystery',
  icon: '❓',
  name: 'Onbekend gevaar',
  flavor: 'Iets loert hier. Je weet nog niet wat.',
}
```

Aantal `?`-vakjes = zelfde ratio als huidige `AMBUSH_RATIO`.

### Onthulling bij landing (`game.js`)

`resolveSpace()` bij `type: 'mystery'`:
1. Als het vakje al onthuld is (`revealedSpaces[spaceNum]` bestaat) → gebruik bestaande onthulling
2. Anders → `needsMysteryRoll: true` teruggeven aan UI

De D12-worp gebeurt in de UI (modal), resultaat komt terug via `resolveMysteryRoll(spaceNum, roll)`.

### `resolveMysteryRoll(spaceNum, roll)` (`game.js`)

Bepaalt uitkomst op basis van tabel:

```javascript
if (roll <= 2) → onthulling: { type: 'path', config: random uit PATH_TILES }
if (roll <= 8) → onthulling: { type: 'ambush', config: pickRandomAmbush(), multiplier: 1 }
if (roll <= 11) → onthulling: { type: 'ambush', config: pickRandomAmbush(), multiplier: 1.5 }
if (roll === 12) → onthulling: { type: 'ambush', config: pickRandomAmbush(), multiplier: 2, jackpot: true }
```

Sla op in `game.revealedSpaces[spaceNum]` — persistent voor de rest van het spel.

Bij ambush: pas multiplier toe op `ambushHp` en `dmg` (initieel 1):
```javascript
pit.hp = Math.ceil(config.ambushHp * multiplier)
pit.dmgPerHit = multiplier  // basis schade die ambusher doet bij falen
```

Bij path: toon path-modal, geen gevecht.

Bij jackpot (roll 12): na afloop ambush-winst → `mutateHp` niet, maar `dmgBonus += 1` via centrale helper.

### `revealedSpaces` op `Game`

```javascript
this.revealedSpaces = {}  // spaceNum → { type, config, multiplier, jackpot }
```

Reset in `reset()`. Meeserialiseren in `serializeGame()` voor multiplayer-sync.

---

## Mystery modal (UI)

Nieuwe modal of hergebruik event-modal met `mystery`-styling:

**Fase 1 — D12 worp:**
- Titel: `❓ Onbekend gevaar`
- Flavor: *"Gooi een D12 om te onthullen wat hier loert."*
- Invoer: D12 (1–12), knop **Onthuld**
- Geen ability check, geen DC

**Fase 2 — Onthulling:**
- Toon wat erachter zat (rustig pad, ambush normaal/zwaar/jackpot)
- Bij rustig pad: toon path-kaart, knop **Verder lopen**
- Bij ambush: toon ambusher naam/icon/HP (inclusief multiplier), knop **Gevecht beginnen** → start put-flow zoals sessie 4
- Bij jackpot: extra visuele indicator (bijv. ✨ of rode gloed)

**Multiplier zichtbaar maken:**
- × 1: normaal
- × 1.5: *"Versterkte vijand"* badge
- × 2: *"Gevaarlijk"* badge + jackpot-beloning zichtbaar

---

## Bordvisualisatie

- `?`-vakjes: eigen kleur (`cell--mystery-unrevealed`) tot onthulling
- Na onthulling: vakje krijgt de kleur van wat erachter zat (`cell--ambush`, `cell--path`, etc.)
- `SPECIAL_SPACES[n]` updaten na onthulling zodat het bord de nieuwe kleur toont
- Legenda: vermelding `❓ Onbekend gevaar`

---

## Multiplayer

`revealedSpaces` zit in `serializeGame()` — alle clients zien dezelfde onthullingen. Na onthulling door speler A ziet speler B het onthuld vakje bij zijn volgende move.

Mystery-modal sync via `activeModal` (sessie 5-patroon):
- Fase 1 (D12 invoer): host/actieve speler heeft invoer, guests zien modal mee
- Fase 2 (onthulling): iedereen ziet wat erachter zat

---

## Wat de agent concreet moet doen

| Bestand | Wijziging |
|---------|-----------|
| `js/game.js` | `revealedSpaces`, `resolveMysteryRoll()`, `dmgBonus` op speler, schade via `dmgBonus` in `resolveAmbushRoll` + `resolveBoss` |
| `js/events-data.js` | `?`-vakjes i.p.v. ambush-tegels in `buildSpecialSpaces()` |
| `js/ui.js` | Mystery-modal (D12 + onthulling), bordkleur update na reveal, sync-hooks |
| `index.html` | Mystery-modal markup, legenda |
| `css/styles.css` | `cell--mystery-unrevealed`, jackpot-styling |

---

## Handmatige testchecklist

- [ ] `?`-vakjes zichtbaar op bord (eigen kleur, `❓` icoon)
- [ ] Landing → D12-modal verschijnt
- [ ] Roll 1–2 → rustig pad kaart, geen gevecht
- [ ] Roll 3–8 → normale ambush start
- [ ] Roll 9–11 → ambush met hogere HP (× 1.5 afgerond)
- [ ] Roll 12 → zware ambush + jackpot badge; na winst `dmgBonus +1`
- [ ] Al onthuld vakje → direct ambush/path, geen D12 opnieuw
- [ ] `dmgBonus` verhoogt schade op ambusher en boss
- [ ] Bord toont onthuld vakje met juiste kleur na reveal
- [ ] Multiplayer: onthulling van speler A zichtbaar voor speler B
- [ ] `reset()` → `revealedSpaces` leeg, alles weer `?`

---

## Afhankelijkheden

| Sessie | Nodig voor |
|--------|------------|
| 1 | `dmgBonus` op speler, centrale mutatie |
| 4 | Ambush put-flow, `resolveAmbushRoll` |
| 5 | Multiplayer modal-sync, `revealedSpaces` in serialize |

---

## Bewust buiten scope

- Boss in mystery pool (bewuste keuze — boss blijft op vak 62)
- Verschillende D12-tabellen per bord-zone (early/mid/late)
- Animatie bij onthulling
- Speler kan `?`-vakje verkennen zonder te landen (scouting mechanic)

---

## Na sessie 7
Mogelijke polish:
- Zone-gebaseerde tabellen (vroeg spel minder zwaar dan laat spel)
- Scouting check (Perception DC X → onthul `?` zonder te landen)
- Meer jackpot-beloningen naast `dmgBonus`
