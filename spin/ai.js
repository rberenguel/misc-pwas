/* --- CPU AI & OPPONENT HAND ENGINE --- */
import { CARD_LIBRARY, calculateDynamicAccuracy } from './cards.js';
import { COURT_CELLS } from './court.js';
import { gameState } from './state.js';

export function chooseCpuServe() {
  const isSecondServe = (gameState.serveAttempt === 2);
  const hand = Array.isArray(gameState.cpuHand) ? gameState.cpuHand.filter(k => k && CARD_LIBRARY[k]) : [];

  let chosenKey = 'safe_kick_serve';

  if (isSecondServe) {
    // 2nd serve: always pick safest available serve
    chosenKey = hand.includes('safe_kick_serve') ? 'safe_kick_serve' : (hand[0] || 'safe_kick_serve');
  } else {
    // 1st serve: pick an aggressive option if available, otherwise safe
    const aggressive = hand.filter(k => k === 'flat_serve' || k === 't_cannon_serve' || k === 'slice_serve');
    if (aggressive.length > 0 && Math.random() > 0.35) {
      chosenKey = aggressive[Math.floor(Math.random() * aggressive.length)];
    } else if (hand.length > 0) {
      chosenKey = hand[Math.floor(Math.random() * hand.length)];
    } else {
      chosenKey = 'safe_kick_serve';
    }
  }

  if (!chosenKey || !CARD_LIBRARY[chosenKey]) {
    chosenKey = 'safe_kick_serve';
  }

  gameState.cpuRevealedCard = chosenKey;
  console.log('[DEBUG] CPU selected serve card:', chosenKey);
  return chosenKey;
}

export function chooseCpuRally() {
  const hand = Array.isArray(gameState.cpuHand) ? gameState.cpuHand.filter(k => k && CARD_LIBRARY[k]) : [];
  const pCoord = COURT_CELLS[gameState.playerPos] || { col: 1, depth: 1 };
  const cpuCoord = COURT_CELLS[gameState.cpuPos] || { col: 1, depth: 1 };
  const cpuStamina = gameState.cpuStamina || 3;

  // Filter playable cards by stamina
  const playable = hand.filter(k => {
    const c = CARD_LIBRARY[k];
    return c && cpuStamina >= c.cost;
  });

  const available = playable.length > 0 ? playable : ['safe_drive'];
  let chosenKey = available[0] || 'safe_drive';
  let targetId = 'c-ply-dp-c';

  if (gameState.cpuCondition === 'OPPORTUNITY') {
    // Attack weak short ball
    const attackCards = available.filter(k => k === 'smash_winner' || k === 'topspin' || k === 'crosscourt_drive');
    chosenKey = attackCards.length > 0 ? attackCards[0] : available[0];
    // Aim to open corner or frontcourt angle furthest from player
    const openSide = pCoord.col === 0 ? 'r' : 'l';
    if (cpuCoord.depth === 0 && Math.random() < 0.45) {
      targetId = `c-ply-sv-${openSide}`;
    } else if (Math.random() < 0.45) {
      targetId = `c-ply-cn-${openSide}`;
    } else {
      targetId = `c-ply-dp-${openSide}`;
    }
  } else if (gameState.cpuCondition === 'SCRAMBLE') {
    // Defend / reset: prioritize actual high defensive resets (lob / emergency slice) over safe_drive
    const highDefCards = available.filter(k => k === 'moonball_lob' || k === 'emergency_slice' || k === 'control_slice');
    chosenKey = highDefCards.length > 0
      ? highDefCards[Math.floor(Math.random() * highDefCards.length)]
      : 'safe_drive';
    targetId = 'c-ply-dp-c'; // Safe baseline center
  } else {
    // Neutral rally: find best tactical play
    const hasDrop = available.includes('disguised_drop');
    if (hasDrop && pCoord.depth === 1 && Math.random() < 0.25) {
      chosenKey = 'disguised_drop';
      const openSide = pCoord.col === 0 ? 'r' : 'l';
      targetId = Math.random() < 0.35 ? `c-ply-scn-${openSide}` : `c-ply-sv-${openSide}`;
    } else {
      const attacks = available.filter(k => k === 'topspin' || k === 'crosscourt_drive');
      if (attacks.length > 0 && Math.random() > 0.3) {
        chosenKey = attacks[0];
      } else {
        chosenKey = available[Math.floor(Math.random() * available.length)];
      }

      const chosenCard = CARD_LIBRARY[chosenKey] || CARD_LIBRARY['safe_drive'];
      const openSide = pCoord.col === 0 ? 'r' : 'l';

      if (cpuCoord.depth === 0 && chosenCard.tag !== 'RESET' && Math.random() < 0.4) {
        // At the net: angle a flat cross shot into the frontcourt side
        targetId = `c-ply-sv-${openSide}`;
      } else if ((chosenKey === 'topspin' || chosenKey === 'crosscourt_drive') && Math.random() < 0.28) {
        // Aggressive corner pocket target
        targetId = `c-ply-cn-${openSide}`;
      } else {
        const possibleTargets = ['c-ply-dp-l', 'c-ply-dp-r', 'c-ply-dp-c'];
        possibleTargets.sort((a, b) => {
          const da = Math.abs((COURT_CELLS[a]?.col || 1) - pCoord.col) + Math.abs((COURT_CELLS[a]?.depth || 1) - pCoord.depth);
          const db = Math.abs((COURT_CELLS[b]?.col || 1) - pCoord.col) + Math.abs((COURT_CELLS[b]?.depth || 1) - pCoord.depth);
          return db - da; // Furthest first
        });
        targetId = possibleTargets[0];
      }
    }
  }

  if (!chosenKey || !CARD_LIBRARY[chosenKey]) {
    chosenKey = 'safe_drive';
  }

  gameState.cpuRevealedCard = chosenKey;
  console.log('[DEBUG] CPU selected rally shot:', chosenKey, 'target:', targetId);
  return { cardKey: chosenKey, targetId };
}
