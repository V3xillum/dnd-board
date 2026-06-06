/**
 * Event-log: describeEvents, addLog, prependLogEntry
 * Vereist: els (ui.js), window.syncLastEvent (multiplayer.js)
 */
function formatEnemyAttackLogEffect(ev) {
  if (ev.nat1 && ev.selfDamage) {
    return `Kritiek mislukking — vijand raakt zichzelf (−${ev.selfDamage} HP)`;
  }
  if (ev.hit) {
    const crit = ev.nat20 ? 'Kritiek treffer' : 'Hit';
    return `${crit} (−${ev.damage ?? 1} HP)`;
  }
  return 'Miss';
}

function prependLogEntry(message, type = '') {
  const li = document.createElement('li');
  li.className = type ? `log-entry log-entry--${type}` : 'log-entry';
  li.textContent = message;
  els.gameLog.prepend(li);

  while (els.gameLog.children.length > 30) {
    els.gameLog.removeChild(els.gameLog.lastChild);
  }
}

function addLog(message, type = '') {
  prependLogEntry(message, type);
  window.syncLastEvent?.(message, type);
}

function describeEvents(events) {
  events.forEach((ev) => {
    switch (ev.type) {
      case 'move': {
        const bonusNote =
          ev.movementBonus > 0 && ev.baseSteps != null && ev.steps !== ev.baseSteps
            ? ` (${ev.baseSteps}+${ev.movementBonus} catch-up)`
            : '';
        addLog(`${ev.player} verplaatst ${ev.steps} vakje(s)${bonusNote} → vak ${ev.to}`);
        break;
      }
      case 'hp-change': {
        const verb = ev.delta < 0 ? 'verliest' : 'herstelt';
        const amount = Math.abs(ev.delta);
        addLog(
          `${ev.player} ${verb} ${amount} HP (${ev.from} → ${ev.to})`,
          ev.delta < 0 ? 'fail' : 'success',
        );
        break;
      }
      case 'death':
        addLog(
          `${ev.player} valt uit! Terug naar start · ${window.DEFAULT_HP} HP · +${ev.movementBonus} beweging (catch-up)`,
          'warn',
        );
        break;
      case 'bounce': {
        let msg = `Te ver! Terugkaatsen naar vak ${ev.position}`;
        if (ev.movementBonusCleared && ev.player) {
          msg += ` — ${ev.player}: catch-up bonus verbruikt`;
        }
        addLog(msg, 'warn');
        break;
      }
      case 'landed':
        if (ev.name) addLog(`Landt op: ${ev.icon} ${ev.name}`, 'special');
        break;
      case 'd20': {
        const dcLabel = String(ev.effectiveDc ?? ev.dc);
        const nat = ev.nat20 ? ' · Kritiek succes!' : ev.nat1 ? ' · Kritiek mislukking!' : '';
        addLog(
          `${ev.ability} check: ${ev.roll ?? '—'} vs DC ${dcLabel} — ${ev.success ? 'Geslaagd!' : 'Mislukt!'}${nat}`,
          ev.success ? 'success' : 'fail',
        );
        break;
      }
      case 'nat20':
        addLog(`${ev.player}: Nat 20!`, 'success');
        break;
      case 'nat1':
        addLog(`${ev.player}: Nat 1!`, 'fail');
        break;
      case 'event-steps':
        addLog(`${ev.player}: ${ev.total} vakje(s) vooruit`, 'success');
        break;
      case 'path':
        addLog(`${ev.player}: ${ev.icon} ${ev.name} — rustig pad`, 'special');
        break;
      case 'healer-visit': {
        if (ev.healed) {
          addLog(`${ev.player}: ${ev.icon} ${ev.name} — volledig hersteld (${ev.from} → ${ev.to} HP)`, 'success');
        } else {
          addLog(`${ev.player}: ${ev.icon} ${ev.name} — al vol HP`, 'special');
        }
        break;
      }
      case 'full-heal':
        break;
      case 'event-move': {
        const dir = ev.direction === 'back' ? 'terug' : 'vooruit';
        const bonusNote =
          ev.movementBonus > 0 &&
          ev.direction === 'forward' &&
          ev.baseSteps != null &&
          ev.steps !== ev.baseSteps
            ? ` (${ev.baseSteps}+${ev.movementBonus} catch-up)`
            : '';
        addLog(
          `${ev.player} ${ev.steps} vakje(s) ${dir}${bonusNote} → vak ${ev.to}`,
          ev.direction === 'back' ? 'fail' : 'success',
        );
        break;
      }
      case 'dc-streak':
        addLog(
          `${ev.player}: volgende check +${ev.nextBonus} DC (streak ${ev.to})`,
          'success',
        );
        break;
      case 'dc-streak-reset':
        addLog(`${ev.player}: DC-streak gereset na mislukte check`, 'warn');
        break;
      case 'pass-turn':
        addLog(`${ev.player} mislukt de check — beurt voorbij`, 'fail');
        break;
      case 'finish':
        addLog(`🏆 ${ev.player} bereikt de Draken-schat!`, 'win');
        break;
      case 'boss-reveal-pending':
        addLog(`⚔️ ${ev.player} bereikt de eindbaas-arena (vak ${ev.spaceNum}) — D12 volgt`, 'special');
        break;
      case 'boss-reveal': {
        const tierLabel = ev.tier === 'epic' ? 'Episch' : ev.tier === 'strong' ? 'Versterkt' : 'Standaard';
        const minionNote = ev.minionCount > 0 ? ` · ${ev.minionCount} beschermer(s)` : '';
        addLog(`⚔️ D12 eindbaas: ${ev.roll} → ${tierLabel} (×${ev.multiplier})${minionNote}`, 'special');
        break;
      }
      case 'boss-start': {
        const multNote = ev.multiplier > 1 ? ` · ×${ev.multiplier}` : '';
        const minionNote = ev.minionCount > 0 ? ` · ${ev.minionCount} beschermers` : '';
        addLog(
          `⚔️ ${ev.icon} ${ev.name} verschijnt! (${ev.bossHp} schade${multNote}${minionNote}) — ${ev.player} triggert de eindbaas`,
          'warn',
        );
        break;
      }
      case 'boss-minion-start':
        addLog(
          `👹 Beschermers verschijnen: ${ev.minions.map((m) => `${m.icon} ${m.name}`).join(' · ')}`,
          'warn',
        );
        break;
      case 'boss-minion-engage':
        addLog(
          `${ev.player} bereikt vak ${ev.spaceNum} — tijd om ${ev.name ?? 'de beschermer'} te verslaan!`,
          'special',
        );
        break;
      case 'boss-minion-player-attack': {
        const nat = ev.nat20 ? ' · Kritiek succes!' : ev.nat1 ? ' · Kritiek mislukking!' : '';
        addLog(
          `👹 ${ev.player} vs ${ev.minionName}: aanval ${ev.roll ?? '—'} vs AC ${ev.effectiveAc ?? ev.ac} — ${ev.hit ? 'Hit!' : 'Miss!'}${nat}`,
          ev.hit ? 'success' : 'fail',
        );
        break;
      }
      case 'boss-minion-enemy-attack':
        addLog(
          `👹 ${ev.minionName} aanvalt ${ev.player}: ${ev.roll ?? '—'}+${ev.attackBonus ?? '?'}=${ev.total ?? '—'} To hit — ${formatEnemyAttackLogEffect(ev)}`,
          ev.hit ? 'fail' : (ev.nat1 ? 'success' : 'special'),
        );
        break;
      case 'boss-minion-d20': {
        const nat = ev.nat20 ? ' · Kritiek succes!' : ev.nat1 ? ' · Kritiek mislukking!' : '';
        addLog(
          `👹 vs ${ev.minionName}: ${ev.ability} ${ev.roll ?? '—'} vs DC ${ev.effectiveDc} — ${ev.success ? 'Raak!' : 'Mis!'}${nat}`,
          ev.success ? 'success' : 'fail',
        );
        break;
      }
      case 'boss-minion-hit':
        addLog(
          `${ev.nat20 ? 'Kritiek treffer' : 'Raak'} op ${ev.minionName}! (−${ev.damage ?? 1} HP · nog ${ev.minionHp})`,
          'success',
        );
        break;
      case 'boss-minion-end':
        addLog(
          `👹 ${ev.minionName} is verslagen!${ev.minionsRemaining > 0 ? ` Nog ${ev.minionsRemaining} beschermer(s).` : ' Tijd voor de eindbaas!'}`,
          'success',
        );
        break;
      case 'boss-guard':
        addLog(
          `De schat is bereikbaar, maar ${ev.name ?? 'de eindbaas'} blokkeert de overwinning!`,
          'warn',
        );
        break;
      case 'boss-player-attack': {
        const nat = ev.nat20 ? ' · Kritiek succes!' : ev.nat1 ? ' · Kritiek mislukking!' : '';
        addLog(
          `⚔️ ${ev.player} vs ${ev.bossName}: aanval ${ev.roll ?? '—'} vs AC ${ev.effectiveAc ?? ev.ac} — ${ev.hit ? 'Hit!' : 'Miss!'}${nat}`,
          ev.hit ? 'success' : 'fail',
        );
        break;
      }
      case 'boss-enemy-attack':
        addLog(
          `⚔️ ${ev.bossName} aanvalt ${ev.player}: ${ev.roll ?? '—'}+${ev.attackBonus ?? '?'}=${ev.total ?? '—'} To hit — ${formatEnemyAttackLogEffect(ev)}`,
          ev.hit ? 'fail' : (ev.nat1 ? 'success' : 'special'),
        );
        break;
      case 'boss-special-save':
        addLog(
          `⚡ ${ev.name} op ${ev.player}: ${ev.saveAbility} ${ev.roll ?? '—'} vs DC ${ev.dc} — ${ev.success ? `geslaagd (−${ev.damage} HP)` : `mislukt (−${ev.damage} HP)`}`,
          ev.success ? 'warn' : 'fail',
        );
        break;
      case 'boss-d20': {
        const nat = ev.nat20 ? ' · Kritiek succes!' : ev.nat1 ? ' · Kritiek mislukking!' : '';
        addLog(
          `⚔️ vs ${ev.bossName}: ${ev.ability} ${ev.roll ?? '—'} vs DC ${ev.effectiveDc} — ${ev.success ? 'Raak!' : 'Mis!'}${nat}`,
          ev.success ? 'success' : 'fail',
        );
        break;
      }
      case 'boss-hit':
        addLog(
          `${ev.nat20 ? 'Kritiek treffer' : 'Raak'} op ${ev.bossName}! (−${ev.damage ?? 1} HP · nog ${ev.bossHp} nodig)`,
          'success',
        );
        break;
      case 'boss-defeated':
        addLog(`🏆 ${ev.bossName} is verslagen!`, 'success');
        break;
      case 'boss-cleared':
        addLog(`⚔️ ${ev.player} passeert vak ${ev.spaceNum} — de eindbaas is al verslagen`, 'special');
        break;
      case 'boss-engage':
        addLog(
          `${ev.player} bereikt vak ${ev.spaceNum} — tijd om ${ev.name ?? 'de eindbaas'} aan te vallen!`,
          'special',
        );
        break;
      case 'boss-retreat':
        addLog(
          `${ev.player} trekt terug naar het kamp op vak ${ev.to} (was vak ${ev.from})`,
          'special',
        );
        break;
      case 'ambush-start':
        addLog(
          `🕳️ ${ev.icon} ${ev.name} — ${ev.player} valt in de put op vak ${ev.spaceNum}! (${ev.ambushHp} HP)`,
          'warn',
        );
        break;
      case 'ambush-join':
        addLog(
          `🕳️ ${ev.player} valt bij ${ev.name} in de put op vak ${ev.spaceNum} (${ev.ambushHp} HP)${ev.allies?.length ? ` — al aanwezig: ${ev.allies.join(', ')}` : ''}`,
          'warn',
        );
        break;
      case 'ambush-player-attack': {
        const nat = ev.nat20 ? ' · Kritiek succes!' : ev.nat1 ? ' · Kritiek mislukking!' : '';
        addLog(
          `Ambush ${ev.ambushName}: ${ev.player} aanval ${ev.roll ?? '—'} vs AC ${ev.effectiveAc ?? ev.ac} — ${ev.hit ? 'Hit!' : 'Miss!'}${nat}`,
          ev.hit ? 'success' : 'fail',
        );
        break;
      }
      case 'ambush-enemy-attack':
        addLog(
          `Ambush ${ev.ambushName} aanvalt ${ev.player}: ${ev.roll ?? '—'}+${ev.attackBonus ?? '?'}=${ev.total ?? '—'} To hit — ${formatEnemyAttackLogEffect(ev)}`,
          ev.hit ? 'fail' : (ev.nat1 ? 'success' : 'special'),
        );
        break;
      case 'ambush-d20': {
        const nat = ev.nat20 ? ' · Kritiek succes!' : ev.nat1 ? ' · Kritiek mislukking!' : '';
        addLog(
          `Ambush ${ev.ambushName}: ${ev.ability} ${ev.roll ?? '—'} vs DC ${ev.effectiveDc} — ${ev.success ? 'succes' : 'faal'} — ambusher ${ev.ambushHp} HP, speler ${ev.playerHp} HP${nat}`,
          ev.success ? 'success' : 'fail',
        );
        break;
      }
      case 'ambush-hit':
        addLog(
          `${ev.nat20 ? 'Kritiek treffer' : 'Treffer'} op ${ev.ambushName}! (−${ev.damage ?? 1} HP · nog ${ev.ambushHp} ambusher-HP)`,
          'success',
        );
        break;
      case 'ambush-end':
        if (ev.success) {
          const freed = ev.freedPlayers?.length ? ` — vrij: ${ev.freedPlayers.join(', ')}` : '';
          addLog(
            `🕳️ ${ev.ambushName} verslagen op vak ${ev.spaceNum}!${freed}`,
            'success',
          );
        } else if (ev.pitContinues) {
          addLog(
            `🕳️ ${ev.player} valt uit in de put — ${ev.ambushName} blijft voor de anderen`,
            'warn',
          );
        } else {
          addLog(`🕳️ ${ev.player} valt uit in de put — ${ev.ambushName} wint de ronde`, 'warn');
        }
        break;
      case 'mystery-pending':
        addLog(`❓ ${ev.player} landt op onbekend gevaar (vak ${ev.spaceNum})`, 'special');
        break;
      case 'mystery-roll':
        addLog(`❓ ${ev.player} gooit D12 op vak ${ev.spaceNum}: ${ev.roll}`, 'special');
        break;
      case 'mystery-reveal': {
        const label = ev.revealType === 'path'
          ? `rustig pad — ${ev.name}`
          : `ambush — ${ev.icon} ${ev.name} (${ev.ambushHp} HP)`;
        const extra = ev.jackpot ? ' · JACKPOT!' : ev.multiplier > 1 ? ` · ×${ev.multiplier}` : '';
        addLog(`❓ Onthuld op vak ${ev.spaceNum}: ${label}${extra}`, 'special');
        break;
      }
      case 'dmg-bonus':
        addLog(`⚔️ ${ev.player} krijgt permanente +1 schade-bonus (totaal +${ev.dmgBonus})`, 'success');
        break;
      case 'mystery-reset':
        addLog(`❓ Vak ${ev.spaceNum} is weer onbekend — wie weet wat er nu loert?`, 'special');
        break;
      default:
        break;
    }
  });
}

window.appendRemoteLogEntry = (message, type = '') => {
  prependLogEntry(message, type);
};

window.clearGameLog = () => {
  els.gameLog.innerHTML = '';
};
