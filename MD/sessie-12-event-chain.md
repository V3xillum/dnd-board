# Sessie 11b — Event chain: alleen speciale vakjes

**Status:** nog te bouwen

## Doel
Na een succesvolle event check beweegt de speler vooruit, maar triggert onderweg **geen** nieuwe gewone events. Alleen speciale vakjes activeren nog: ambush (`?`), healer (vak 56), boss (vak 62/63) en finish (vak 63).

Dit voorkomt dat een succesvolle check direct een nieuwe check triggert, wat het tempo vertraagt en het bord minder overweldigend maakt.

---

## Spelregel

| Vakje tijdens event-movement | Triggert? |
|------------------------------|-----------|
| Gewoon event (trap, combat, magic, social, loot, mystery-event, wild, fey) | ❌ Niet triggeren — loop door |
| Rustig pad | ❌ Niet triggeren — loop door |
| Mystery `?` vakje | ✅ D12-modal |
| Healer cabin (vak 56) | ✅ Full heal |
| Boss arena (vak 62/63) | ✅ Boss-flow |
| Finish (vak 63, boss dood) | ✅ Win |

De speler **landt** wel op het eindvakje — dat vakje wordt visueel getoond en de positie klopt — maar er wordt geen event-modal geopend tenzij het een speciaal vakje is.

---

## Wat verandert

### `game.js` — `moveAfterEvent()`

Huidig: `chainEvents: true` → `resolveSpace()` op elk landingsvak.

Nieuw: voeg een `chainFilter` toe die bepaalt of een vakje een chain mag triggeren:

```javascript
function isChainTrigger(spaceNum) {
  const space = SPECIAL_SPACES[spaceNum];
  if (!space) return false;
  if (spaceNum === FINISH_SPACE) return true;
  if (spaceNum === HEALER_SPACE) return true;
  if (spaceNum === BOSS_SPACE) return true;
  if (space.type === 'mystery') return true;
  if (space.type === 'finish') return true;
  return false;
}
```

`moveAfterEvent()` roept `resolveSpace()` alleen aan als `isChainTrigger(player.position)` true is.

**Niet wijzigen:** dobbelsteen-movement (`move()`) triggert nog steeds alles normaal — alleen event-chain movement verandert.

### `game.js` — `resolveEvent()`

`chainEvents` parameter blijft bestaan maar wordt intern altijd `true` doorgegeven — de filtering zit in `isChainTrigger`, niet in de aanroep.

---

## Wat niet verandert

- Dobbelsteen-movement (`move()`) — triggert alle vakjes normaal
- DC-streak, overshoot-formule, Nat 20/1 — ongewijzigd
- Ambush put-flow, boss-flow, mystery D12 — ongewijzigd
- Multiplayer sync — geen extra aanpassingen nodig

---

## Handmatige testchecklist

- [ ] Succes op event → speler beweegt vooruit, geen nieuwe event-modal tenzij speciaal vakje
- [ ] Succes → landt op `?` vakje → D12-modal opent
- [ ] Succes → landt op vak 56 → full heal
- [ ] Succes → landt op vak 62 → boss-flow
- [ ] Succes → landt op vak 63 (boss dood) → win
- [ ] Dobbelsteen-movement → alle vakjes triggeren nog normaal
- [ ] Nat 20 (×2 steps) → zelfde filterlogica

---

## Afhankelijkheden

| Sessie | Nodig voor |
|--------|------------|
| 2 | `moveAfterEvent`, `resolveEvent`, overshoot-movement |
| 3 | `BOSS_SPACE`, boss-flow |
| 7 | Mystery `?` vakjes |

## Gerelateerd
- Movement na event: `MD/sessie-2-nat-overshoot.md`
- Mystery vakjes: `MD/sessie-7-mystery-vakjes.md`
- Healer cabin: `MD/sessie-11c-rust-mechanic.md`
