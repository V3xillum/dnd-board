# Sessie 3 — Boss Fight + Win Conditie

## Doel
Een eindbaas blokkeert de overwinning. Alle spelers moeten samen de boss verslaan voordat iemand kan winnen. Geen fases, geen random tabel — één stevige encounter met gedeeld HP. **Wel** meerdere mogelijke bosses voor flavor (paladijn, draak, giant, …), gekozen uit een boss-pool — geen hardcoded DC 13.

## Speelbaar wanneer
- Boss verschijnt wanneer een speler vak 62 of 63 betreedt
- UI toont de **gekozen** boss (naam, icon, flavor) en boss HP
- Elke speler doet een boss-check tegen de **DC van die boss**
- Niemand kan winnen zolang bossHp > 0
- Als bossHp 0 bereikt, wint de eerste speler die vak 63 betreedt (of al op 63 staat)
- Nieuw avontuur kan een andere boss tonen op vak 62

---

## Boss-data (events-data.js)

### Boss-pool
- Voeg events toe met `category: 'boss'` in `EVENT_POOL` (eigen kleur/legenda optioneel, of alleen in boss-UI).
- Exporteer `BOSS_POOL = EVENT_POOL.filter((e) => e.category === 'boss')`.
- **Minstens 3–5 bosses**, bijvoorbeeld:
  - **Laatste wachter** (bestaand event omzetten naar `category: 'boss'` — blijft de canonieke fallback)
  - **Oude rode draak** — hoge DC, draak-flavor
  - **Stormreus** — giant, Athletics/Strength-achtige ability
  - **Gevallen paladijn** — combat, mid DC
- Zelfde velden als andere events: `name`, `icon`, `ability`, `dc`, `flavor`, `successText`, `failText`.

**Hergebruik het Laatste wachter-event uit `EVENT_POOL` als boss-config (DC, icon, flavor, ability) — initialiseer de boss bij activatie met deze data of met een ander object uit `BOSS_POOL`; gebruik nooit een hardcoded DC in `game.js`.**

### Vak 62 op het bord
- In `buildSpecialSpaces()`: vak **62** krijgt een **willekeurige** boss uit `BOSS_POOL` (preview van de eindbaas op het bord).
- Filter boss-events uit de normale event-decks: `eventsExceptGuardian` → `eventsExceptBosses` (filter op `category === 'boss'`, niet alleen op naam “Laatste wachter”). **Hernoem of breid `eventsExceptGuardian` uit — zorg dat alle aanroepen in `buildSpecialSpaces()` en helpers (`eventsByDc`, deck-filters) meeupdaten**; anders breekt de bestaande bordgeneratie stilletjes.

### Activatie (game.js)
- Eerste keer dat een speler **62 of 63** betreedt en `bossActive === false`:
  - Kies `bossConfig`:
    - **Land op 62:** gebruik het event dat al op vak 62 staat (als `category === 'boss'`).
    - **Land direct op 63:** trek willekeurig uit `BOSS_POOL` (of gebruik Laatste wachter als fallback als de pool leeg is).
  - Zet `bossHp` / `bossMaxHp` op `3 × aantal spelers`.
  - Sla `bossConfig` op op `Game` (naam, icon, dc, flavor, …) voor de hele fight.
- **Geen win** registreren op dat moment.

---

## Wat er moet gebeuren

### game.js

Voeg boss-state toe aan de `Game` class:
- `bossActive: false`
- `bossHp: 0`
- `bossMaxHp: 0`
- `bossConfig: null` — het gekozen boss-event (DC, icon, flavor, …)

Zolang `bossActive === true` doet de actieve speler een **boss-check** i.p.v. normaal spelen (geen dobbelsteen, geen normaal vak-event):
- D20 tegen `bossConfig.dc` (+ bestaande spelersmodifiers: `effectiveDc` zoals bij events).
- Succes: `bossHp -= 1`
- Falen: speler −1 HP via centrale mutatiefunctie (sessie 1)
- `bossHp === 0` → `bossActive = false`, direct win-check

Win conditie: vak 63 wint alleen als `bossActive === false`. Na boss-kill: check of iemand al op 63 staat.

Reset boss-state + `bossConfig` in `reset()`.

### ui.js

- Boss HP-balk + **boss-naam/icon/flavor** uit `bossConfig` (niet “Boss” generiek).
- Boss-modal hergebruikt event-modal-styling; titel bv. `⚔️ ${bossConfig.name}`.
- Legenda: optioneel entry “Eindbaas (vak 62)” met `cell--boss` als vak 62 een boss toont.

---

## Handmatige testchecklist (na implementatie)

- [ ] Nieuw avontuur → vak 62 toont een boss uit de pool (icon/naam)
- [ ] Boss activeert op 62 of 63; DC komt uit `bossConfig`, niet hardcoded
- [ ] Zelfde boss-config gedurende hele fight
- [ ] Speler op 63 terwijl boss leeft → geen win
- [ ] `bossHp === 0` + speler op 63 → win
- [ ] Dobbelsteen geblokkeerd zolang `bossActive`
- [ ] `reset()` → boss weg

---

## Wat je nog niet doet in deze sessie
- Boss fases (polish later, bijv. +1 DC na 50% boss HP)
- Ambush / de put (sessie 4)
