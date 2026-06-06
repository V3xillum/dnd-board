/**
 * Gedeelde mutable UI-state — laadt vóór ui.js, tokens.js en combat.js.
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
