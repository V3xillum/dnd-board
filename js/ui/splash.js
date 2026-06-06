/**
 * Boss splash layer: preload, fullscreen hold, modal overlay.
 * Vereist: settings.js (GAME_SETTINGS.splash), dom.js (els) voor cleanup.
 */
const splashCache = new Map();
let lastSpectatorSplashKey = null;
let lastSpectatorBossSplashDoneKey = null;
let spectatorBossSplashInProgressKey = null;

function getSplashSettings() {
  return window.GAME_SETTINGS?.splash ?? {};
}

function getSplashFileExtension() {
  const ext = getSplashSettings().fileExtension ?? 'png';
  return ext.startsWith('.') ? ext.slice(1) : ext;
}

/** Pad naar splash-asset: `{dir}{basename}.{ext}` */
function buildSplashPath(dir, basename) {
  const base = String(dir).replace(/\/?$/, '/');
  return `${base}${basename}.${getSplashFileExtension()}`;
}

function getSplashDefaultUrl() {
  const settings = getSplashSettings();
  return settings.bossDefault ?? buildSplashPath(settings.bossBasePath ?? 'assets/splash/bosses/', '_default');
}

function slugifyBossName(name) {
  if (!name) return '_default';
  return String(name)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || '_default';
}

function getBossSplashUrl(config) {
  const settings = getSplashSettings();
  if (!config) return getSplashDefaultUrl();
  if (config.splash) return config.splash;
  const base = settings.bossBasePath ?? 'assets/splash/bosses/';
  return buildSplashPath(base, slugifyBossName(config.name));
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function delay(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function preloadSplash(url) {
  if (!url) return Promise.reject(new Error('Geen splash-url'));
  const cached = splashCache.get(url);
  if (cached?.loaded) return Promise.resolve(cached.img);
  if (cached?.promise) return cached.promise;

  const entry = { loaded: false, img: null, promise: null };
  entry.promise = new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      entry.loaded = true;
      entry.img = img;
      resolve(img);
    };
    img.onerror = () => reject(new Error(`Splash laden mislukt: ${url}`));
    img.src = url;
  });
  splashCache.set(url, entry);
  return entry.promise;
}

async function preloadSplashWithFallback(url, options = {}) {
  const settings = getSplashSettings();
  const fallback = options.fallbackUrl !== undefined
    ? options.fallbackUrl
    : getSplashDefaultUrl();
  const maxWaitMs = options.maxWaitMs ?? settings.maxWaitMs ?? 2000;

  const tryLoad = async (targetUrl) => {
    await Promise.race([
      preloadSplash(targetUrl),
      delay(maxWaitMs).then(() => {
        throw new Error('Splash timeout');
      }),
    ]);
    return targetUrl;
  };

  try {
    return await tryLoad(url);
  } catch {
    if (fallback && url !== fallback) {
      try {
        return await tryLoad(fallback);
      } catch {
        return null;
      }
    }
    return null;
  }
}

function showSplashLayer(url) {
  const layer = document.getElementById('splash-layer');
  const img = document.getElementById('splash-layer-img');
  if (!layer) return;

  layer.classList.remove('splash-layer--gradient-only', 'hidden');
  if (img) {
    if (url) {
      img.src = url;
      img.alt = '';
    } else {
      img.removeAttribute('src');
      layer.classList.add('splash-layer--gradient-only');
    }
  }

  layer.classList.add('splash-layer--enter');
  document.body.classList.add('splash-active');

  const onEnd = (e) => {
    if (e.target !== layer) return;
    layer.classList.remove('splash-layer--enter');
    layer.removeEventListener('animationend', onEnd);
  };
  layer.addEventListener('animationend', onEnd);
}

function hideSplashLayer() {
  const layer = document.getElementById('splash-layer');
  if (!layer) return;
  layer.classList.add('hidden');
  layer.classList.remove('splash-layer--enter', 'splash-layer--gradient-only');
  document.body.classList.remove('splash-active');
  lastSpectatorSplashKey = null;
}

function clearModalSplashClasses() {
  if (typeof els === 'undefined') return;
  els.bossRevealModal?.classList.remove('event-modal--over-splash');
  els.eventModal?.classList.remove('event-modal--over-splash');
}

function spectatorBossSplashKey(activeModal) {
  if (!activeModal) return null;
  const { spaceNum, config } = activeModal;
  return `boss-splash|${spaceNum ?? ''}|${config?.name ?? ''}`;
}

function shouldPlaySpectatorBossSplash(activeModal) {
  if (!activeModal || activeModal.type !== 'boss' || activeModal.phase !== 'input') return false;
  const combatPhase = activeModal.combatPhase ?? 'player-roll';
  return combatPhase === 'player-roll';
}

function resetSpectatorBossSplashState() {
  lastSpectatorBossSplashDoneKey = null;
  spectatorBossSplashInProgressKey = null;
}

function syncSpectatorSplash(url, modalKey) {
  const key = `${modalKey}|${url ?? ''}`;
  if (key === lastSpectatorSplashKey) return;
  lastSpectatorSplashKey = key;
  if (url) {
    showSplashLayer(url);
  } else {
    hideSplashLayer();
  }
}

async function playSplashHold(url, options = {}) {
  const settings = getSplashSettings();
  const holdMs = options.holdMs ?? settings.holdMs ?? 700;
  const resolved = await preloadSplashWithFallback(url, options);
  showSplashLayer(resolved);
  if (!prefersReducedMotion()) {
    await delay(holdMs);
  }
}

async function playSplashThen(url, openModalFn, options = {}) {
  await playSplashHold(url, options);
  if (typeof openModalFn === 'function') openModalFn();
}

window.slugifyBossName = slugifyBossName;
window.getBossSplashUrl = getBossSplashUrl;
window.preloadSplash = preloadSplash;
window.preloadSplashWithFallback = preloadSplashWithFallback;
window.showSplashLayer = showSplashLayer;
window.hideSplashLayer = hideSplashLayer;
window.clearModalSplashClasses = clearModalSplashClasses;
window.syncSpectatorSplash = syncSpectatorSplash;
window.spectatorBossSplashKey = spectatorBossSplashKey;
window.shouldPlaySpectatorBossSplash = shouldPlaySpectatorBossSplash;
window.resetSpectatorBossSplashState = resetSpectatorBossSplashState;
window.playSplashHold = playSplashHold;
window.playSplashThen = playSplashThen;
