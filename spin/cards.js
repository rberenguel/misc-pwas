/* --- CARDS & DECK ENGINE --- */

export const CARD_LIBRARY = {
  // SERVE CARDS
  safe_kick_serve: {
    id: 'safe_kick_serve',
    name: 'Safe Kick Serve',
    cost: 1,
    speed: 'normal',
    targets: 'serve',
    tag: 'SERVE',
    spin: 'topspin',
    baseAccuracy: 0.95,
    isSafeOption: true,
    trajectoryPath: 'M 4,7 Q 24,3 40,24 Q 48,13 56,9',
    desc: 'Guaranteed safe spin serve. Deep kick into box with minimal fault risk.'
  },
  flat_serve: {
    id: 'flat_serve',
    name: 'Ace Flat Serve',
    cost: 1,
    speed: 'fast',
    targets: 'serve',
    tag: 'SERVE',
    baseAccuracy: 0.70,
    isSafeOption: false,
    trajectoryPath: 'M 4,6 C 16,6 26,10 42,24 Q 50,20 58,18',
    desc: 'High velocity down the line. Clean ace potential but risky.'
  },
  slice_serve: {
    id: 'slice_serve',
    name: 'Wide Slice Serve',
    cost: 2,
    speed: 'normal',
    targets: 'serve',
    tag: 'SERVE',
    spin: 'slice',
    baseAccuracy: 0.85,
    isSafeOption: false,
    trajectoryPath: 'M 4,7 C 18,7 28,11 42,24 Q 50,23 58,22',
    desc: 'Heavy spin pulling receiver off court into a scramble.'
  },
  t_cannon_serve: {
    id: 't_cannon_serve',
    name: 'T-Cannon Flat',
    cost: 2,
    speed: 'fast',
    targets: 'serve',
    tag: 'SERVE',
    baseAccuracy: 0.65,
    isSafeOption: false,
    trajectoryPath: 'M 4,5 C 16,5 26,9 42,24 Q 50,19 58,17',
    desc: 'Maximum power bullet hugging the center service line.'
  },

  // RALLY CARDS - NORMAL PLAY
  safe_drive: {
    id: 'safe_drive',
    name: 'Neutral Rally Push',
    cost: 1,
    speed: 'normal',
    targets: 'deep',
    tag: 'RALLY',
    baseAccuracy: 0.94,
    isSafeOption: true,
    trajectoryPath: 'M 2,18 Q 28,6 46,24 Q 52,18 58,15',
    desc: 'The fundamental safe rally ball. High margin over net, resets rally.'
  },
  crosscourt_drive: {
    id: 'crosscourt_drive',
    name: 'Crosscourt Drive',
    cost: 1,
    speed: 'normal',
    targets: 'deep',
    tag: 'RALLY',
    spin: 'topspin',
    baseAccuracy: 0.90,
    isSafeOption: false,
    trajectoryPath: 'M 2,17 Q 28,9 46,24 Q 52,19 58,16',
    desc: 'Solid baseline rally shot with good clearance.'
  },
  topspin: {
    id: 'topspin',
    name: 'Topspin Rocket',
    cost: 2,
    speed: 'fast',
    targets: 'deep',
    tag: 'ATTACK',
    spin: 'topspin',
    baseAccuracy: 0.80,
    isSafeOption: false,
    trajectoryPath: 'M 2,19 C 16,10 34,9 44,24 Q 51,14 58,11',
    desc: 'Heavy fast drive. Puts pressure on opponent to sprint.'
  },
  control_slice: {
    id: 'control_slice',
    name: 'Low Skid Slice',
    cost: 1,
    speed: 'slow',
    targets: 'deep',
    tag: 'RALLY',
    spin: 'slice',
    baseAccuracy: 0.88,
    isSafeOption: false,
    trajectoryPath: 'M 2,13 Q 28,13 44,24 Q 50,23 58,22',
    desc: 'Low-bouncing defensive ball. Absorbs opponent pace and resets rhythm.'
  },
  disguised_drop: {
    id: 'disguised_drop',
    name: 'Disguised Drop',
    cost: 2,
    speed: 'slow',
    targets: 'short',
    tag: 'TOUCH',
    spin: 'slice',
    baseAccuracy: 0.75,
    isSafeOption: false,
    trajectoryPath: 'M 2,16 C 14,7 24,9 36,24 Q 38,22 41,24',
    desc: 'Soft touch pulling a deep opponent forward into awkward recovery.'
  },

  // OPPORTUNITY / SIT-UP ATTACK
  smash_winner: {
    id: 'smash_winner',
    name: 'Overhead Smash',
    cost: 1,
    speed: 'fast',
    targets: 'any',
    tag: 'PUNISH',
    baseAccuracy: 0.96,
    isSafeOption: false,
    trajectoryPath: 'M 6,3 Q 22,8 40,24 Q 48,12 58,8',
    desc: 'Devastating putaway off weak floaters or short sit-up balls.'
  },

  // SCRAMBLE / DEFENSIVE HAIL-MARY
  emergency_slice: {
    id: 'emergency_slice',
    name: 'Emergency Slice',
    cost: 1,
    speed: 'slow',
    targets: 'deep',
    tag: 'DEFENSE',
    spin: 'slice',
    baseAccuracy: 0.84,
    isSafeOption: false,
    trajectoryPath: 'M 2,14 Q 24,7 45,24 Q 51,23 58,22',
    desc: 'Desperation chip while off-balance. High arc to buy recovery.'
  },
  moonball_lob: {
    id: 'moonball_lob',
    name: 'Moonball Lob',
    cost: 1,
    speed: 'slow',
    targets: 'deep',
    tag: 'RESET',
    spin: 'topspin',
    baseAccuracy: 0.88,
    isSafeOption: false,
    trajectoryPath: 'M 2,23 C 4,-9 45,-9 48,24 Q 50,3 55,4',
    desc: 'Deep defensive loop. Buys complete recovery time to center.'
  },
  running_slap: {
    id: 'running_slap',
    name: 'Running Slap Winner',
    cost: 2,
    speed: 'fast',
    targets: 'deep',
    tag: 'HAIL-MARY',
    baseAccuracy: 0.45,
    isSafeOption: false,
    trajectoryPath: 'M 2,15 L 28,13 L 48,24 Q 53,21 58,19',
    desc: 'All-or-nothing running gamble. High risk of spraying wide.'
  }
};

export function renderTrajectorySvg(pathString) {
  return `
    <svg class="card-trajectory-svg" viewBox="0 0 60 26" aria-hidden="true">
      <line class="traj-ground" x1="2" y1="24" x2="58" y2="24" />
      <line class="traj-net-post" x1="28" y1="15" x2="28" y2="24" />
      <line class="traj-net-band" x1="25" y1="15" x2="31" y2="15" />
      <path class="traj-path" d="${pathString || 'M 2,17 Q 28,9 46,24 Q 52,19 58,16'}" />
    </svg>
  `;
}

export function renderSpinIcon(spinType = null) {
  if (spinType === 'topspin') {
    // Clockwise forward-rolling arc over the top and pointing down on the front
    return `
      <svg class="card-spin-svg spin-topspin" viewBox="0 0 24 20" aria-label="Topspin">
        <circle class="spin-ball-dot" cx="11" cy="10" r="2.2" />
        <path class="spin-arc" d="M 11,16.5 A 6.5,6.5 0 1,1 17.5,10" />
        <polyline class="spin-arrow" points="14.6,7.4 17.5,10.8 20.4,7.4" />
      </svg>
    `;
  }
  if (spinType === 'slice') {
    // Counter-clockwise underspin arc carving under the bottom and pointing up on the front
    return `
      <svg class="card-spin-svg spin-slice" viewBox="0 0 24 20" aria-label="Slice">
        <circle class="spin-ball-dot" cx="11" cy="10" r="2.2" />
        <path class="spin-arc" d="M 11,3.5 A 6.5,6.5 0 1,0 17.5,10" />
        <polyline class="spin-arrow" points="14.6,12.6 17.5,9.2 20.4,12.6" />
      </svg>
    `;
  }
  return '';
}

// PRESET DECK COMPOSITIONS
export const SERVE_DECK_TEMPLATE = [
  'safe_kick_serve',
  'flat_serve',
  'flat_serve',
  'slice_serve',
  't_cannon_serve'
];

export const RALLY_DECK_TEMPLATE = [
  'crosscourt_drive',
  'crosscourt_drive',
  'topspin',
  'topspin',
  'control_slice',
  'control_slice',
  'disguised_drop',
  'moonball_lob',
  'running_slap',
  'emergency_slice'
];

export const SAFE_SERVE_CARD = 'safe_kick_serve';
export const SAFE_RALLY_CARD = 'safe_drive';

export function createDeck(template) {
  return [...template];
}

export function shuffleDeck(deck) {
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Calculates nuanced dynamic accuracy for a shot based on rally momentum,
 * movement distance, incoming pressure, stamina strain, and fatigue.
 */
export function calculateDynamicAccuracy(cardKey, context = {}) {
  const card = CARD_LIBRARY[cardKey];
  if (!card) return { accuracy: 0.5, modifiers: [] };

  let acc = card.baseAccuracy;
  const modifiers = [];

  // 1. Safe Option Resilience
  if (card.isSafeOption) {
    modifiers.push({ label: 'Safe Resilience', delta: +0.05 });
    acc += 0.05;
  }

  // 2. Movement / Stretch Strain
  // dist = distance receiver traveled to reach the incoming ball (+1 if defending a deep corner)
  const dist = context.distanceMoved !== undefined ? context.distanceMoved : 0;
  if (dist >= 3) {
    const penalty = card.isSafeOption ? -0.10 : -0.22;
    acc += penalty;
    modifiers.push({ label: 'Deep corner stretch (+1 dist)', delta: penalty });
  } else if (dist >= 2) {
    const penalty = card.isSafeOption ? -0.06 : -0.15;
    acc += penalty;
    modifiers.push({ label: 'Stretched reach', delta: penalty });
  } else if (dist === 1) {
    const penalty = card.isSafeOption ? 0 : -0.05;
    if (penalty !== 0) {
      acc += penalty;
      modifiers.push({ label: 'On the run', delta: penalty });
    }
  } else if (dist === 0 && !context.isServe) {
    acc += 0.04;
    modifiers.push({ label: 'Set & balanced', delta: +0.04 });
  }

  // 3. Incoming Shot Pressure
  if (context.incomingSpeed === 'fast') {
    const penalty = card.isSafeOption ? -0.05 : -0.12;
    acc += penalty;
    modifiers.push({ label: 'Pace pressure', delta: penalty });
  } else if (context.incomingSpeed === 'slow' && !context.isServe) {
    acc += 0.07;
    modifiers.push({ label: 'Slow floater', delta: +0.07 });
  }

  // 4. Rally Length & Fatigue
  const rallyCount = context.rallyLength || 0;
  if (rallyCount >= 3) {
    const fatigue = Math.min(0.14, (rallyCount - 2) * 0.025);
    const appliedFatigue = card.isSafeOption ? fatigue * 0.5 : fatigue;
    acc -= appliedFatigue;
    modifiers.push({ label: `Rally fatigue (${rallyCount} shots)`, delta: -appliedFatigue });
  }

  // 5. Stamina Strain
  if (context.stamina !== undefined) {
    if (context.stamina === 1 && card.cost >= 1) {
      acc -= 0.06;
      modifiers.push({ label: 'Low stamina strain', delta: -0.06 });
    } else if (context.stamina >= 3) {
      acc += 0.03;
      modifiers.push({ label: 'Full energy', delta: +0.03 });
    }
  }

  // 6. Player Condition / Situation Context
  if (context.playerCondition === 'OPPORTUNITY') {
    acc += 0.08;
    modifiers.push({ label: 'Sit-up opportunity', delta: +0.08 });
  } else if (context.playerCondition === 'SCRAMBLE') {
    acc -= 0.10;
    modifiers.push({ label: 'Scramble distress', delta: -0.10 });
  }

  // 7. Forehand vs. Backhand Wing Nuance
  if (context.strokeWing === 'BACKHAND') {
    const isAggressiveAttack = (card.tag === 'ATTACK' || card.speed === 'fast' || cardKey === 'topspin' || cardKey === 'crosscourt_drive' || cardKey === 'smash_winner');
    if (context.incomingSpeed === 'fast') {
      if (isAggressiveAttack) {
        acc -= 0.12;
        modifiers.push({ label: 'Backhand pace pressure', delta: -0.12 });
      } else if (cardKey.includes('slice') || card.isSafeOption) {
        acc += 0.02;
        modifiers.push({ label: 'Backhand slice absorb', delta: +0.02 });
      }
    } else if (context.incomingSpeed === 'normal') {
      if (isAggressiveAttack && !card.isSafeOption) {
        acc -= 0.05;
        modifiers.push({ label: 'Backhand drive timing', delta: -0.05 });
      }
    }
  } else if (context.strokeWing === 'INSIDE_OUT_FOREHAND') {
    if (cardKey === 'crosscourt_drive' || cardKey === 'topspin' || cardKey === 'flat_drive') {
      acc += 0.06;
      modifiers.push({ label: 'Inside-out forehand setup', delta: +0.06 });
    }
  }

  // 8. Corner Target Execution Risk (smaller target box / stricter margin)
  if (context.isCornerTarget) {
    const cornerPenalty = card.isSafeOption ? -0.12 : -0.16;
    acc += cornerPenalty;
    modifiers.push({ label: 'Corner pocket risk', delta: cornerPenalty });
  }

  // 9. Accumulated Spin Momentum (Topspin push-back vs. Slice low-skid)
  const spin = context.spinMomentum || 0;
  if (!context.isServe && spin >= 2) {
    // Heavy accumulated topspin pushes receiver deep behind the baseline
    if (cardKey === 'topspin' || cardKey === 'running_slap') {
      const pen = -0.04 * (spin - 1);
      acc += pen;
      modifiers.push({ label: `Deep topspin pushback (+${spin})`, delta: pen });
    } else if (cardKey === 'control_slice') {
      acc += 0.04;
      modifiers.push({ label: 'Slice absorbs high kick', delta: +0.04 });
    }
  } else if (!context.isServe && spin <= -2) {
    // Heavy accumulated slice skids low below net level
    const sliceDepth = Math.abs(spin);
    if (cardKey === 'topspin' || cardKey === 'running_slap') {
      const pen = -0.05 * (sliceDepth - 1);
      acc += pen;
      modifiers.push({ label: `Low slice skid (-${sliceDepth})`, delta: pen });
    } else if (cardKey === 'control_slice' || cardKey === 'disguised_drop') {
      acc += 0.04;
      modifiers.push({ label: 'Knife slice synergy', delta: +0.04 });
    }
  }

  // 10. Directional Momentum / Wrong-Footed Inertia
  if (!context.isServe && context.momentumPenalty === 'WRONG_FOOTED') {
    const pen = card.isSafeOption ? -0.03 : -0.06;
    acc += pen;
    modifiers.push({ label: 'Wrong-footed (braking)', delta: pen });
  } else if (!context.isServe && context.momentumPenalty === 'WHIPLASH') {
    const pen = card.isSafeOption ? -0.02 : -0.05;
    acc += pen;
    modifiers.push({ label: 'Directional whiplash', delta: pen });
  }

  // Clamp accuracy to realistic limits
  acc = Math.max(0.18, Math.min(0.98, acc));

  return {
    accuracy: acc,
    displayPercent: Math.round(acc * 100),
    modifiers
  };
}

/**
 * Computes how a played card shifts the rally's accumulated spin momentum.
 * Positive [1..3] = Topspin accumulation (pushes receiver deeper behind baseline).
 * Negative [-3..-1] = Slice accumulation (skids low and draws receiver inside baseline).
 */
export function computeNextSpinMomentum(currentSpin = 0, cardKey = '') {
  const topspinDeltas = {
    topspin: +2,
    moonball_lob: +2,
    safe_kick_serve: +1,
    crosscourt_drive: +1
  };
  const sliceDeltas = {
    control_slice: -2,
    slice_serve: -2,
    disguised_drop: -2,
    emergency_slice: -1
  };

  let next = currentSpin;
  if (cardKey in topspinDeltas) {
    // If switching from heavy slice to topspin, partial cancel first
    next = currentSpin < 0 ? Math.min(3, Math.round(currentSpin * 0.5) + topspinDeltas[cardKey]) : currentSpin + topspinDeltas[cardKey];
  } else if (cardKey in sliceDeltas) {
    next = currentSpin > 0 ? Math.max(-3, Math.round(currentSpin * 0.5) + sliceDeltas[cardKey]) : currentSpin + sliceDeltas[cardKey];
  } else {
    // Flat / neutral shot decays spin momentum by 1 step toward 0
    if (currentSpin > 0) next = currentSpin - 1;
    else if (currentSpin < 0) next = currentSpin + 1;
  }

  return Math.max(-3, Math.min(3, next));
}

/**
 * Maps accuracy value [0..1] to a 5-tier color tone from emerald green to crimson red.
 */
export function getAccuracyTone(accuracy) {
  if (accuracy >= 0.90) return { hex: '#22c55e', tier: 'emerald', label: '90%+' };
  if (accuracy >= 0.80) return { hex: '#84cc16', tier: 'lime', label: '80-89%' };
  if (accuracy >= 0.70) return { hex: '#eab308', tier: 'yellow', label: '70-79%' };
  if (accuracy >= 0.60) return { hex: '#f97316', tier: 'orange', label: '60-69%' };
  return { hex: '#ef4444', tier: 'red', label: '<60%' };
}
