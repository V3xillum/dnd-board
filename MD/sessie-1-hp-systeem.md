# Sessie 1 — HP & Centrale Mutatie

## Doel
Na deze sessie heeft elk spelerspoppetje HP. Spelers kunnen schade krijgen en doodgaan. Dood = terug naar start met een permanente movement bonus.

## Speelbaar wanneer
- HP zichtbaar in de spelerlijst
- Een speler die op 0 HP komt, verschijnt op vak 1 met 3 HP hersteld (test dit handmatig via de HP-mutatiefunctie — HP-verlies via normale gameplay volgt in sessie 2)
- De movement bonus werkt aantoonbaar bij **zowel** dobbelsteen-beweging als event-beweging (speler beweegt één extra vakje)

> **Let op:** Na alleen sessie 1 kun je HP nog niet verliezen via events of Nat 1. Dat is bewust uitgesteld; de sessie is vooral infrastructuur + handmatig testen van death en bonus.

---

## Wat er moet gebeuren

### game.js

Voeg aan elk player-object toe bij `addPlayer()`:
- `hp: 3`
- `maxHp: 3`
- `movementBonus: 0` — permanente +1 bij death, reset als speler vak 63 bereikt

Bouw één centrale HP-mutatiefunctie. Alle HP-veranderingen in het hele project gaan hier doorheen — niet inline. De functie handelt ook de death-trigger af (positie reset naar 0, HP herstel naar 3, movementBonus +1). Push het resultaat als event-object zodat `describeEvents()` het kan loggen.

Bouw één helper voor movement bonus, bijv. `applyMovementBonus(player, steps)` die `steps + (player.movementBonus ?? 0)` teruggeeft. Gebruik deze helper in **beide** paden:
- `move()` — dobbelsteen-beweging
- `moveAfterEvent()` — beweging na een event-check

Zonder deze helper werkt catch-up na death alleen bij dobbelstenen, terwijl het merendeel van de progressie via events loopt.

### ui.js

Toon HP in de spelerlijst naast de naam, bijv. als ❤️ icoontjes of een getal. Gebruik de bestaande `renderPlayers()` functie.

---

## Wat je nog niet doet in deze sessie
- HP-verlies door events of Nat 1 (komt in sessie 2)
- Event-movement na succes (vaste formule i.p.v. random 1–3 — zie sessie 2)
- Boss (komt in sessie 3)
