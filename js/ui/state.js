/**
 * Gedeelde mutable UI-state — laadt na ui/dom.js, vóór tokens/combat/events.
 * var i.p.v. let: classic scripts delen geen let-scope tussen bestanden.
 */
var tokensAnimating = false;

var activeEvent = null;
var activeBoss = null;
var activeBossMinion = null;
var activeAmbush = null;
var activeCombatActionHandler = null;
var activeMystery = null;
var activeBossReveal = null;
var syncedActiveModal = null;
var pathModalCallback = null;
var pathModalSpaceNum = null;
var pathModalSkipMysteryReset = false;
var pathModalSkipRestSideEffects = false;
