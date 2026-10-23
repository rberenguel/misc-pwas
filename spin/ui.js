import { CARD_LIBRARY, calculateDynamicAccuracy, renderTrajectorySvg, renderSpinIcon, getAccuracyTone } from './cards.js';
import { gameState, discardPlayerCard } from './state.js';

const ACCURACY_MODES = ['curve', 'stripe', 'both'];
let currentAccuracyMode = 'curve';
try {
  const saved = localStorage.getItem('spin_acc_mode');
  if (saved && ACCURACY_MODES.includes(saved)) currentAccuracyMode = saved;
} catch (e) {}

export function setAccuracyVisualMode(mode) {
  if (!ACCURACY_MODES.includes(mode)) mode = 'curve';
  currentAccuracyMode = mode;
  if (typeof document !== 'undefined' && document.body) {
    document.body.classList.remove('acc-mode-curve', 'acc-mode-stripe', 'acc-mode-both');
    document.body.classList.add(`acc-mode-${mode}`);
  }
  try {
    localStorage.setItem('spin_acc_mode', mode);
  } catch (e) {}
  const labels = {
    curve: 'OPTION 1: Colored Trajectory Curve (2.2px stroke)',
    stripe: 'OPTION 2: Top-Edge Accent Stripe (white curve)',
    both: 'OPTION 1 & 2: Both Combined'
  };
  const msg = `[ACCURACY STYLE] ${labels[mode]}. Call window.toggle() to switch.`;
  console.log(`%c${msg}`, 'color: #22c55e; font-weight: bold;');
  return msg;
}

if (typeof window !== 'undefined') {
  window.toggle = function() {
    const nextIdx = (ACCURACY_MODES.indexOf(currentAccuracyMode) + 1) % ACCURACY_MODES.length;
    return setAccuracyVisualMode(ACCURACY_MODES[nextIdx]);
  };
  window.toggleAccuracyMode = window.toggle;
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setAccuracyVisualMode(currentAccuracyMode));
  } else {
    setAccuracyVisualMode(currentAccuracyMode);
  }
}

export function getTennisScoreString() {
  const p = gameState.playerScore;
  const c = gameState.cpuScore;

  if (p >= 3 && c >= 3) {
    if (p === c) return "DEUCE";
    if (p === c + 1) return "AD - 40";
    if (c === p + 1) return "40 - AD";
  }

  const map = ['0', '15', '30', '40'];
  const pStr = map[p] !== undefined ? map[p] : '40';
  const cStr = map[c] !== undefined ? map[c] : '40';
  return `${pStr} - ${cStr}`;
}

export function renderCostBolts(cost) {
  let html = '<span class="cost-bolts" title="Cost: ' + cost + ' stamina">';
  for (let i = 0; i < cost; i++) {
    html += '<i class="ph-light ph-lightning cost-bolt"></i>';
  }
  html += '</span>';
  return html;
}

export function renderStaminaBolts(current, max) {
  let html = '<span class="stamina-bolts" title="Stamina: ' + current + ' / ' + max + '">';
  for (let i = 0; i < max; i++) {
    const isAvail = (i < current);
    html += `<i class="ph-light ph-lightning stamina-bolt ${isAvail ? 'active' : 'spent'}"></i>`;
  }
  html += '</span>';
  return html;
}

export function setFeed(main, sub) {
  const m = document.getElementById('feed-main');
  const s = document.getElementById('feed-sub');
  if (m) m.textContent = main;
  if (s) s.textContent = sub;
}

export function showModal(title, msg, onContinue) {
  const overlay = document.getElementById('modal-overlay');
  const t = document.getElementById('modal-title');
  const b = document.getElementById('modal-body');
  const closeBtn = document.getElementById('modal-close-btn');

  if (t) t.textContent = title;
  if (b) b.textContent = msg;
  if (overlay) overlay.style.display = 'flex';

  const handleDismiss = () => {
    if (overlay) overlay.style.display = 'none';
    if (typeof onContinue === 'function') onContinue();
  };

  if (closeBtn) closeBtn.onclick = handleDismiss;
  overlay.onclick = (e) => {
    if (e.target === overlay) handleDismiss();
  };
}

/**
 * Opens Deck Overview modal.
 * Presents all cards as identical .card elements as the playing UI,
 * with state badges: IN HAND, IN DECK, USED. No sections.
 */
export function openDeckOverviewModal() {
  const isServe = gameState.playerCondition === 'SERVE';
  const drawDeck = isServe ? gameState.playerServeDeck : gameState.playerRallyDeck;
  const discardPile = isServe ? gameState.playerServeDiscard : gameState.playerRallyDiscard;
  const hand = gameState.playerHand;
  const title = "CARDS";

  const allCards = [];

  hand.forEach((cardKey) => {
    allCards.push({ cardKey, state: 'HAND' });
  });

  drawDeck.forEach((cardKey) => {
    allCards.push({ cardKey, state: 'DECK' });
  });

  discardPile.forEach((cardKey) => {
    allCards.push({ cardKey, state: 'USED' });
  });

  let cardsHtml = '<div class="modal-cards-grid">';

  allCards.forEach(({ cardKey, state }, idx) => {
    const card = CARD_LIBRARY[cardKey];
    if (!card) return;

    const isUsed = (state === 'USED');
    const tone = getAccuracyTone(card.baseAccuracy);

    let stateIcon = '';
    if (state === 'HAND') {
      stateIcon = '<span class="card-state-icon badge-hand" title="In Hand"><i class="ph-light ph-hand-palm"></i></span>';
    } else if (state === 'USED') {
      stateIcon = '<span class="card-state-icon badge-used" title="Already Used"><i class="ph-light ph-placeholder"></i></span>';
    }

    cardsHtml += `
      <div id="deck-card-${cardKey}-${idx}" data-card-key="${cardKey}" style="--card-acc-color: ${tone.hex};" class="card ${isUsed ? 'disabled' : ''}">
        <div class="card-top-stripe"></div>
        <div class="card-top">
          <div class="card-title">${card.name}</div>
          ${stateIcon}
          <div class="card-trajectory">${renderTrajectorySvg(card.trajectoryPath)}</div>
          <div class="card-spin">${renderSpinIcon(card.spin)}</div>
          <div class="card-cost">${renderCostBolts(card.cost)}</div>
        </div>
      </div>
    `;
  });

  cardsHtml += '</div>';

  const overlay = document.getElementById('modal-overlay');
  const t = document.getElementById('modal-title');
  const b = document.getElementById('modal-body');
  const closeBtn = document.getElementById('modal-close-btn');

  if (t) t.textContent = title;
  if (b) b.innerHTML = cardsHtml;
  if (overlay) overlay.style.display = 'flex';

  const handleDismiss = () => {
    if (overlay) overlay.style.display = 'none';
  };

  if (closeBtn) closeBtn.onclick = handleDismiss;
  overlay.onclick = (e) => {
    if (e.target === overlay) handleDismiss();
  };
}

/**
 * Opponent UI: mirrors player's hand container, rendering CPU cards
 * in the exact same .card shape and layout without user percentages.
 */
export function updateOpponentDisplay() {
  const oppContainer = document.getElementById('cpu-cards-scroll');
  if (!oppContainer) return;

  oppContainer.innerHTML = '';
  const hand = gameState.cpuHand || [];

  hand.forEach((cardKey) => {
    const isRevealed = (gameState.cpuRevealedCard === cardKey);
    const card = CARD_LIBRARY[cardKey];
    const el = document.createElement('div');
    el.className = `card opp-card ${isRevealed ? 'revealed' : 'face-down'}`;
    el.id = `cpu-card-${cardKey}`;
    el.dataset.cardKey = cardKey;

    if (isRevealed && card) {
      const tone = getAccuracyTone(card.baseAccuracy);
      el.style.setProperty('--card-acc-color', tone.hex);
      el.innerHTML = `
        <div class="card-top-stripe"></div>
        <div class="card-top">
          <div class="card-trajectory">${renderTrajectorySvg(card.trajectoryPath)}</div>
        </div>
      `;
    } else {
      el.innerHTML = `
        <div class="card-top">
          <div class="card-title">CPU</div>
        </div>
      `;
    }
    oppContainer.appendChild(el);
  });
}

export function updateUI(onCardSelect) {
  // Score & Game Header
  const scoreEl = document.getElementById('score-display');
  if (scoreEl) scoreEl.textContent = getTennisScoreString();

  const serverEl = document.getElementById('server-indicator');
  if (serverEl) serverEl.textContent = `SERVER: ${gameState.currentServer}`;

  // Stamina status with clear sprint cost context
  const staminaEl = document.getElementById('stamina-label');
  if (staminaEl) {
    const sprintNote = (gameState.distanceMoved >= 2 && gameState.playerCondition !== 'SERVE')
      ? ' <span class="sprint-cost-note">(-1 SPRINT)</span>'
      : '';
    staminaEl.innerHTML = `STAMINA: ${renderStaminaBolts(gameState.stamina, gameState.maxStamina)}${sprintNote}`;
  }

  // Update Deck Menu Button & Discard Status
  const isServe = gameState.playerCondition === 'SERVE';
  const drawDeck = isServe ? gameState.playerServeDeck : gameState.playerRallyDeck;

  const deckMenuBtn = document.getElementById('deck-menu-btn');
  if (deckMenuBtn) {
    deckMenuBtn.textContent = `CARDS (${drawDeck.length})`;
    deckMenuBtn.onclick = () => openDeckOverviewModal();
  }

  const discardStatusLabel = document.getElementById('discard-status-label');
  if (discardStatusLabel) {
    discardStatusLabel.textContent = gameState.discardUsedThisTurn
      ? "DISCARD: USED THIS TURN"
      : "DISCARD: 1 AVAILABLE";
    discardStatusLabel.classList.toggle('used', gameState.discardUsedThisTurn);
  }

  // Update Opponent Display
  updateOpponentDisplay();

  // Hand scroll container
  const scroll = document.getElementById('cards-scroll');
  if (!scroll) return;
  scroll.innerHTML = '';

  const isTurn = (gameState.turn === '1P');

  // Placeholder when not in turn
  if (!isTurn && gameState.playerHand.length === 0) {
    const placeholder = document.createElement('div');
    placeholder.className = 'cards-waiting-placeholder';
    placeholder.textContent = gameState.currentServer === 'CPU' && gameState.rallyLength === 0
      ? 'Awaiting CPU serve...'
      : 'Rally in transit...';
    scroll.appendChild(placeholder);
    return;
  }

  // Build context for dynamic accuracy calculation
  const nuanceContext = {
    distanceMoved: gameState.distanceMoved,
    incomingSpeed: gameState.lastShotSpeed,
    rallyLength: gameState.rallyLength,
    stamina: gameState.stamina,
    playerCondition: gameState.playerCondition,
    isServe: gameState.playerCondition === 'SERVE',
    strokeWing: gameState.playerStrokeWing || 'FOREHAND',
    isCornerTarget: Boolean(gameState.previewCornerTarget),
    spinMomentum: gameState.spinMomentum || 0,
    momentumPenalty: gameState.playerMomentumPenalty || null
  };

  gameState.playerHand.forEach((cardKey) => {
    const card = CARD_LIBRARY[cardKey];
    if (!card) return;

    const el = document.createElement('div');
    el.className = 'card';
    el.id = `card-${cardKey}`;
    el.dataset.cardKey = cardKey;
    if (card.isSafeOption) el.classList.add('safe-option');
    if (gameState.selectedCardKey === cardKey) el.classList.add('selected');
    if (gameState.justDrawnCardKey === cardKey) el.classList.add('just-drawn');

    const canAfford = (gameState.stamina >= card.cost);
    const isPlayable = isTurn && canAfford;

    if (!isPlayable) el.classList.add('disabled');

    // Nuance dynamic accuracy and color tone
    const dynamicAcc = calculateDynamicAccuracy(cardKey, nuanceContext);
    const tone = getAccuracyTone(dynamicAcc.accuracy);
    el.style.setProperty('--card-acc-color', tone.hex);

    // Discard availability
    const canDiscard = isTurn && !gameState.discardUsedThisTurn && !card.isSafeOption;
    const isJustDrawn = (gameState.justDrawnCardKey === cardKey);

    el.innerHTML = `
      <div class="card-top-stripe"></div>
      <div class="card-top">
        ${isJustDrawn ? '<span class="just-drawn-badge">NEW DRAW</span>' : ''}
        <div class="card-trajectory">${renderTrajectorySvg(card.trajectoryPath)}</div>
        <div class="card-spin">${renderSpinIcon(card.spin)}</div>
        <div class="card-cost">${renderCostBolts(card.cost)}</div>
      </div>
      <div class="card-bottom">
        ${canDiscard ? `<button class="card-discard-btn" title="Discard for replacement"><i class="ph-light ph-tray-arrow-down"></i></button>` : ''}
      </div>
    `;

    // Click card to select or discard
    el.addEventListener('click', (e) => {
      if (e.target.closest('.card-discard-btn')) {
        if (!canDiscard) return;
        e.stopPropagation();
        const res = discardPlayerCard(cardKey);
        if (res && res.success) {
          const discardedName = CARD_LIBRARY[res.discarded]?.name || res.discarded;
          const drawnName = CARD_LIBRARY[res.drawn]?.name || res.drawn;
          setFeed(`DISCARDED: ${discardedName.toUpperCase()}`, `DREW: ${drawnName.toUpperCase()} FROM DECK`);
          updateUI(onCardSelect);
        }
        return;
      }

      if (!isPlayable) return;
      if (typeof onCardSelect === 'function') {
        onCardSelect(cardKey);
      }
    });

    scroll.appendChild(el);
  });
}
