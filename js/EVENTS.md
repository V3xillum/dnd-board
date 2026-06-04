# Events & bordgeneratie

## Bestanden

| Bestand | Doel |
|---------|------|
| `events-data.js` | `EVENT_POOL`, `PATH_TILES`, `buildSpecialSpaces()` |
| `game.js` | Leest `SPECIAL_SPACES[vaknummer]` bij landen |
| `ui.js` | Toont icoon + kleur op het bord |

## Event toevoegen

Voeg een object toe aan `EVENT_POOL` in `events-data.js`:

```javascript
{
  name: 'Naam op kaart',
  icon: '🕳️',           // emoji op het bord én in de modal
  ability: 'Stealth',
  dc: 12,
  category: 'trap',    // bepaalt kleur op het bord (zie onder)
  flavor: 'Wat je ziet als je landt.',
  successText: 'Tekst bij slagen.',
  failText: 'Tekst bij falen.',
}
```

**Categories:** `trap`, `combat`, `magic`, `social`, `loot`, `mystery`, `wild`, `fey`

**Rustig pad** (`PATH_TILES`): alleen `name`, `icon`, `flavor` — geen DC.

## Hoe het bord wordt gevuld

Bij pagina-load en bij **Nieuw avontuur** roept `rebuildBoard()` opnieuw `buildSpecialSpaces()` aan:

1. Vak **1** = start, **63** = finish, **62** = altijd *Laatste wachter*
2. Vak **2–61** wordt geschud
3. ~**38%** wordt een rustig pad (unieke tegels uit `PATH_TILES`, daarna deck opnieuw)
4. Overige vakken = D20-events uit de pool:
   - vak 2–21 → makkelijker (DC ≤ 10)
   - vak 22–42 → gemiddeld (DC 11–12)
   - vak 43–61 → zwaarder (DC ≥ 13)

Elk event wordt per ronde **maximaal één keer** op het bord gelegd zolang de pool groot genoeg is. Daarna wordt de deck opnieuw geschud.

## Pool vergroten (500+ events)

Plak gewoon meer objecten in `EVENT_POOL`. De generator pakt er per spel ~38 stuks (afhankelijk van pad-ratio). Meer events = meer variatie tussen spelronde.

Optioneel later: events in `events-pool.json` laden met `fetch()`.

## Icoon op het bord

Het bord toont `SPECIAL_SPACES[n].icon` — hetzelfde object als in de modal. Zorg dat elk event een **uniek passend** emoji heeft; vermijd dubbele iconen voor verschillende events waar mogelijk.
