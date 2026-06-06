# Sessie 13 — Boss splash backgrounds

**Status:** geïmplementeerd — alleen **boss-specifieke** splashes (geen tier-splashes)

## Doel

Visuele **splash background** bij start van het echte boss-gevecht:

| Moment | Wanneer | Splash | Modal |
|--------|---------|--------|-------|
| **D12 onthulling** | `showBossRevealRevealPhase` | Geen splash | `#boss-reveal-modal` — stats, tier-badge, minion-preview |
| **Eindbaas gevecht** | `showBossModal` | Boss-PNG (`assets/splash/bosses/{slug}.png`) | `#event-modal` (boss-fight) |

Minion-splashes zijn **optioneel** (niet geïmplementeerd).

---

## UX-flow

```
Land op 62/63 (eerste keer)
  → showBossRevealModal()
  → D12 submit → resolveBossReveal()
  → showBossRevealRevealPhase(reveal) — geen splash, direct reveal-kaart
  → "Gevecht beginnen"
  → showBossFightModal()
       → hasBossMinions()? showBossMinionModal()  [geen boss-splash]
       → … minion-gevechten …
       → laatste minion dood → volgende landing of chain → showBossModal()
            ① SPLASH ALLEEN (~700–900 ms)
                 boss-specifieke image (lazy load + preload)
            ② #event-modal erbovenop (boss-fight kaart)

Geen minions (D12 roll 1–4):
  → Na D12 reveal → "Gevecht beginnen" → showBossModal() direct
       → boss-splash moment 2 (zelfde hook)
```

### Splash-then-modal timing

1. Toon fullscreen splash-layer (`#splash-layer`)
2. Wacht op image `onload` (max timeout 2 s → fallback)
3. `prefers-reduced-motion: reduce` → skip wachttijd, toon splash + modal tegelijk
4. Na hold-duur: modal openen met **transparantere** overlay (`event-modal--over-splash`)
5. `playModalCardEnter(modal, 'combat')` op de kaart

---

## Asset-structuur

```
assets/
  splash/
    tier-standard.png     # D12 roll 1–4
    tier-strong.png       # D12 roll 5–10
    tier-epic.png         # D12 roll 11–12
    minion-generic.png    # fase 2 (optioneel)
    bosses/
      storm-giant.png
      hill-giant.png
      laatste-wachter.png
      dark-paladin.png
      dracolich.png
      _default.png        # fallback
      … (één bestand per boss in BOSS_POOL)
```

Extensie centraal in `GAME_SETTINGS.splash.fileExtension` (default `png`).

### Naamconventie

- Bestandsnaam = slug van `config.name` (lowercase, spaties → `-`, geen speciale tekens)
- Helper: `slugifyBossName(name)` → `'Laatste wachter'` → `laatste-wachter.png`
- Fallback: `assets/splash/bosses/_default.png` als bestand ontbreekt
- Override per boss: `splash: 'assets/splash/bosses/custom.png'` in events-data

### Image-richtlijnen (performance)

| Eigenschap | Richtlijn |
|------------|-----------|
| Formaat | PNG (WebP optioneel via expliciet `splash`-pad) |
| Resolutie | 1280×720 of 1920×1080 |
| Bestandsgrootte | 80–200 KB per splash (vermijd ~2 MB) |
| Laden | **Nooit** alle bosses upfront; max 1–2 images tegelijk in geheugen |

---

## Data-model (`events-data.js`)

Optioneel veld per boss/ambush-entry (override slug):

```javascript
{
  name: "Storm Giant",
  icon: "⛈️",
  category: "boss",
  splash: "assets/splash/bosses/storm-giant.png", // optioneel; anders slug-fallback
}
```

Tier-splashes **niet** in event-pool — vaste paden in `settings.js` of `splash.js`:

```javascript
SPLASH_TIER_URLS: {
  standard: 'assets/splash/tier-standard.png',
  strong:   'assets/splash/tier-strong.png',
  epic:     'assets/splash/tier-epic.png',
}
```

`serializeModalConfig()` uitbreiden met `splash` (string | null) voor multiplayer.

---

## Nieuw bestand: `js/ui/splash.js`

Verantwoordelijkheid: preload, layer tonen/verbergen, timing — **geen** modal-logica.

| Functie | Beschrijving |
|---------|--------------|
| `slugifyBossName(name)` | Naam → bestandspad |
| `getBossSplashUrl(config)` | `config.splash` of slug-fallback |
| `getTierSplashUrl(tier, multiplier)` | `standard` / `strong` / `epic` |
| `preloadSplash(url)` | `Promise<Image>` — cache in `Map<url, Image>` |
| `showSplashLayer(url, options)` | Fullscreen layer zichtbaar, body class `splash-active` |
| `hideSplashLayer()` | Layer verbergen, class weg |
| `playSplashThen(modalEl, url, openModalFn, options)` | Orchestratie: preload → splash alone → callback → modal |

### Cache

```javascript
const splashCache = new Map(); // url → loaded Image
```

Herlaad dezelfde boss niet bij heropenen modal in dezelfde sessie.

### `playSplashThen` opties

```javascript
{
  holdMs: 700,           // splash alleen zichtbaar
  maxWaitMs: 2000,       // preload timeout → fallback tier/default
  fallbackUrl: '...',
  skipHold: false,       // true bij reduced-motion
}
```

---

## DOM & CSS

### `index.html`

Nieuwe layer **boven** het bord, **onder** modals:

```html
<div id="splash-layer" class="splash-layer hidden" aria-hidden="true">
  <img id="splash-layer-img" class="splash-layer__img" alt="" decoding="async">
  <div class="splash-layer__vignette"></div>
</div>
```

- `z-index: 190` (modals blijven `200`)
- Plaats vóór de eerste `.event-modal` of direct na `.app`

### `js/ui/dom.js`

```javascript
splashLayer: document.getElementById('splash-layer'),
splashLayerImg: document.getElementById('splash-layer-img'),
```

### `css/styles.css`

| Class | Doel |
|-------|------|
| `.splash-layer` | `position: fixed; inset: 0; z-index: 190` |
| `.splash-layer__img` | `object-fit: cover; width/height 100%` |
| `.splash-layer__vignette` | Donkere randen voor leesbaarheid |
| `.splash-layer--enter` | Korte fade-in (0.35s) |
| `.event-modal--over-splash` | `background: rgba(0,0,0,0.45)` i.p.v. `0.88` — splash blijft zichtbaar |
| `body.splash-active` | Optioneel: extra scroll-lock (modal-open blijft leidend) |

`backdrop-filter: blur` **uit** op `event-modal--over-splash` (performance + splash blijft scherp).

---

## Integratiepunten

### 1. D12 reveal — `js/ui/modals/events.js`

**`showBossRevealRevealPhase(reveal)`** aanpassen:

```
Huidig: direct modal + result HTML + playModalCardEnter

Nieuw:
  1. Bepaal tierUrl = getTierSplashUrl(reveal.tier, reveal.multiplier)
  2. playSplashThen(els.bossRevealModal, tierUrl, () => {
       // bestaande reveal-UI (roll area hidden, result visible, syncModalOutcome, …)
       els.bossRevealModal.classList.add('event-modal--over-splash')
       playModalCardEnter(els.bossRevealModal, 'combat')
     })
```

**`showBossRevealModal` (fase roll):** geen splash (D12-input blijft rustig) — of optioneel lichte `tier-standard` achtergrond; **niet** in fase 1 scope tenzij gewenst.

**`closeBossRevealModal`:** `hideSplashLayer()` + class `event-modal--over-splash` verwijderen.

### 2. Boss-fight — `showBossModal()` in `events.js`

```
Huidig: closeBossRevealModal → populateBossModal → playModalCardEnter

Nieuw:
  1. url = getBossSplashUrl(game.bossConfig)
  2. playSplashThen(els.eventModal, url, () => {
       // bestaande populateBossModal + syncCombatModalPhase + playModalCardEnter
       els.eventModal.classList.add('event-modal--over-splash')
     })
```

**Niet** in `showBossMinionModal` — minions eerst, boss-splash pas hier.

### 3. Na laatste minion — geen extra hook nodig

Flow bestaat al:

- `finishCombatRound` → tekst "Alle beschermers weg — tijd voor de eindbaas!"
- Volgende landing op 62/63 → `needsBoss` → `showBossFightModal` → `showBossModal`

Boss-splash vuurt automatisch bij `showBossModal`.

**Optioneel UX-plus:** na `minionEnded` + `!hasBossMinions()` direct `showBossModal` aanbieden i.p.v. wachten op volgende landing — **buiten scope** tenzij gewenst (huidige regels: pass-turn, blijf op arena).

### 4. `handleBossRevealAction`

Sluit reveal-modal → `showBossFightModal`. Als minions: **geen** boss-splash; minion-modal opent normaal.

### 5. Scroll lock — `syncModalScrollLock` in `core.js`

Geen wijziging nodig; splash-layer heeft geen focus-trap. Modal blijft `modal-open` op body.

---

## Multiplayer & spectator

### Serialize

In `serializeModalConfig()`:

```javascript
if (config.splash != null) out.splash = config.splash;
if (config.tier != null) out.tier = config.tier; // al aanwezig voor boss-reveal outcome
```

Voor boss-reveal outcome: `splashTierUrl` mee in `syncModalOutcome` outcome (of afleiden uit `tier` + `SPLASH_TIER_URLS`).

Nieuw modal-type of outcome-veld voor boss-fight splash:

```javascript
// activeModal bij boss combat open — optioneel
{ type: 'boss', phase: 'input', config: { …, splash: 'assets/...' } }
```

Spectators laden dezelfde URL client-side; geen binary sync via Firebase.

### `renderSpectatorModal` — `core.js`

| Type | Splash-gedrag |
|------|---------------|
| `boss-reveal` outcome | `showSplashLayer(getTierSplashUrl(config.tier, …))` + modal over splash |
| `boss` / `boss-minion` input | Boss: `showSplashLayer(getBossSplashUrl(config))`; minion: geen splash (fase 2: generiek) |

**Let op:** spectators mogen splash niet dubbel animeren bij elke Firebase tick — gebruik dezelfde `lastSpectatorModalAnimKey`-patroon of splash-url in de anim-key.

### `closeSpectatorModals`

Ook `hideSplashLayer()` aanroepen.

---

## Laadvolgorde (`index.html`)

```
… ui/board.js
→ ui/splash.js          ← nieuw
→ ui/tokens.js
…
```

`splash.js` heeft alleen `document` + `window` nodig; geen afhankelijkheid van `els` behalve optioneel via parameters.

---

## Implementatiefasen

### Fase 1 — Infrastructuur (geen art vereist)

- [ ] `splash.js` + DOM layer + basis-CSS
- [ ] Placeholder images (effen kleur of 1 test-png)
- [ ] `getTierSplashUrl` / `getBossSplashUrl` / `preloadSplash`
- [ ] `playSplashThen` met reduced-motion + timeout fallback
- [ ] Unit-handmatig: preload + show/hide in console

### Fase 2 — D12 tier-splash

- [ ] `showBossRevealRevealPhase` integratie
- [ ] `event-modal--over-splash` styling
- [ ] `closeBossRevealModal` cleanup
- [ ] 3 tier-placeholder assets

### Fase 3 — Boss-specifieke splash

- [ ] `showBossModal` integratie
- [ ] `slugifyBossName` + `_default.png` fallback
- [ ] `splash` veld in events-data (optioneel per entry)
- [ ] Eerste 2–3 echte boss-images als proof

### Fase 4 — Multiplayer

- [ ] `serializeModalConfig` + spectator splash in `renderSpectatorModal`
- [ ] `closeSpectatorModals` cleanup
- [ ] Test: host D12 → guest ziet tier-splash; boss-fight → guest ziet boss-splash

### Fase 5 — Polish (optioneel)

- [ ] Minion generieke splash (`showBossMinionModal`)
- [ ] Alle BOSS_POOL entries van splash voorzien
- [ ] `ARCHITECTURE.md` bijwerken
- [ ] Korte vermelding in spelregels-modal (geen verplichting)

---

## Testplan

| # | Scenario | Verwacht |
|---|----------|----------|
| 1 | D12 roll 3 (geen minions) | Tier-standard splash → reveal-kaart → Gevecht beginnen → boss-splash → fight modal |
| 2 | D12 roll 8 (1 minion) | Tier-strong splash → reveal met minion-preview → minion fight **zonder** boss-splash → na minion dood → landing → boss-splash → fight |
| 3 | D12 roll 12 | Tier-epic splash + epic card class |
| 4 | Ontbrekend boss-bestand | `_default.png` of tier-fallback, geen console error die flow blokkeert |
| 5 | Trage CDN / 404 | Na `maxWaitMs` modal toch open, geen infinite hang |
| 6 | `prefers-reduced-motion` | Geen hold-delay; splash + modal samen |
| 7 | Multiplayer spectator | Zelfde splash op guest als host bij reveal + boss-fight |
| 8 | Nieuw avontuur / modal sluiten | Splash-layer hidden, geen ghost overlay |
| 9 | Boss al verslagen, land op 62 | Geen splash (geen boss-reveal, geen fight) |

---

## Risico's & mitigatie

| Risico | Mitigatie |
|--------|-----------|
| Splash blijft hangen na sluiten modal | `hideSplashLayer()` in alle `close*Modal` paden die boss/splash gebruiken |
| Dubbele animatie bij Firebase re-renders | Anim-key inclusief splash-url; skip als zelfde key |
| Grote PNG's traag op mobiel | WebP + max 150 KB; geen blur over splash |
| Boss-preview vak 62 ≠ uiteindelijke boss (vak 63) | Geen probleem — splash moment 2 gebruikt `game.bossConfig` na `activateBoss()` |
| Combat tijdens splash | `playSplashThen` alleen vóór modal open; geen splash tijdens dice-input |

---

## Bestanden (overzicht)

| Bestand | Actie |
|---------|-------|
| `MD/sessie-13-boss-splash.md` | Dit plan |
| `js/ui/splash.js` | **Nieuw** |
| `js/ui/dom.js` | splash DOM refs |
| `js/ui/modals/events.js` | `showBossRevealRevealPhase`, `showBossModal`, close-cleanup |
| `js/ui/modals/core.js` | serialize + spectator splash |
| `index.html` | splash layer + script tag |
| `css/styles.css` | splash + `event-modal--over-splash` |
| `js/events-data.js` | optioneel `splash` per boss |
| `js/settings.js` | optioneel `SPLASH_TIER_URLS` |
| `assets/splash/**` | **Nieuw** image-map |
| `MD/ARCHITECTURE.md` | Na implementatie: regel in bestanden-tabel + laadvolgorde |

---

## Samenvatting

Optie A past **zonder game-logica-wijziging**: de hooks bestaan al (`showBossRevealRevealPhase`, `showBossModal`, minion-routing via `hasBossMinions`). Je voegt een splash-layer + lazy preload toe op die twee momenten. Performance blijft goed zolang je per fight maximaal 2 images laadt (tier + boss) en assets klein houdt.
