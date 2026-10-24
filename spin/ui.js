import {
  CARD_LIBRARY,
  calculateDynamicAccuracy,
  renderTrajectorySvg,
  renderSpinIcon,
  getAccuracyTone,
  getMasteryBonus,
  isServeCard
} from './cards.js';
import {
  gameState,
  discardPlayerCard,
  getPlayerCardCopyCount,
  swapPlayerDeckCard,
  generateDraftChoices
} from './state.js';

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
  window.draft = function() {
    openPostGameDraftModal(true, 'Manual deck tweak preview.');
  };
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
  const pg = gameState.playerGames || 0;
  const cg = gameState.cpuGames || 0;
  const gamesPrefix = (pg > 0 || cg > 0) ? `[${pg}-${cg}] ` : '';

  if (p >= 3 && c >= 3) {
    if (p === c) return `${gamesPrefix}DEUCE`;
    if (p === c + 1) return `${gamesPrefix}AD - 40`;
    if (c === p + 1) return `${gamesPrefix}40 - AD`;
  }

  const map = ['0', '15', '30', '40'];
  const pStr = map[p] !== undefined ? map[p] : '40';
  const cStr = map[c] !== undefined ? map[c] : '40';
  return `${gamesPrefix}${pStr} - ${cStr}`;
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

export function setFeed(main, sub, options = {}) {
  const m = document.getElementById('feed-main');
  const s = document.getElementById('feed-sub');
  if (m) m.textContent = main;
  if (s) s.textContent = sub;

  if (options.record !== false && main) {
    if (!Array.isArray(gameState.gameTrail)) {
      gameState.gameTrail = [];
    }
    const last = gameState.gameTrail[gameState.gameTrail.length - 1];
    if (!last || last.main !== main || last.sub !== (sub || '')) {
      gameState.gameTrail.push({
        score: getTennisScoreString(),
        main,
        sub: sub || ''
      });
    }
  }
}

import { openMatchArtifactModal } from './artifact.js';
export { openMatchArtifactModal };

export function openGameTrailModal() {
  const overlay = document.getElementById('modal-overlay');
  const t = document.getElementById('modal-title');
  const b = document.getElementById('modal-body');
  const closeBtn = document.getElementById('modal-close-btn');
  if (!overlay || !b) return;

  const trail = Array.isArray(gameState.gameTrail) ? gameState.gameTrail : [];
  let html = `
    <div class="game-trail-top-bar">
      <button id="trail-artifact-btn" class="trail-artifact-btn"><i class="ph-light ph-camera"></i> VIEW MATCH ARTIFACT</button>
    </div>
    <div class="game-trail-list">
  `;

  if (trail.length === 0) {
    html += '<div class="game-trail-empty">No moves recorded yet.</div>';
  } else {
    for (let i = trail.length - 1; i >= 0; i--) {
      const entry = trail[i];
      html += `
        <div class="game-trail-item">
          <div class="game-trail-header">
            <span class="game-trail-main">${entry.main}</span>
            <span class="game-trail-score">${entry.score}</span>
          </div>
          ${entry.sub ? `<div class="game-trail-sub">${entry.sub}</div>` : ''}
        </div>
      `;
    }
  }

  html += '</div>';

  if (t) t.textContent = 'GAME TRAIL';
  if (b) b.innerHTML = html;
  if (closeBtn) closeBtn.textContent = 'CLOSE';
  overlay.style.display = 'flex';

  const artifactBtn = document.getElementById('trail-artifact-btn');
  if (artifactBtn) {
    artifactBtn.onclick = () => {
      openMatchArtifactModal('ALL');
    };
  }

  const handleDismiss = () => {
    overlay.style.display = 'none';
  };

  if (closeBtn) closeBtn.onclick = handleDismiss;
  overlay.onclick = (e) => {
    if (e.target === overlay) handleDismiss();
  };
}

export function showModal(title, msg, onContinue) {
  const overlay = document.getElementById('modal-overlay');
  const t = document.getElementById('modal-title');
  const b = document.getElementById('modal-body');
  const closeBtn = document.getElementById('modal-close-btn');

  if (t) t.textContent = title;
  if (b) b.textContent = msg;
  if (closeBtn) closeBtn.textContent = 'CLOSE';
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
    const copyCount = getPlayerCardCopyCount(cardKey);
    const effectiveAcc = Math.min(0.98, card.baseAccuracy + (card.isSafeOption ? 0 : getMasteryBonus(copyCount, isServeCard(cardKey))));
    const tone = getAccuracyTone(effectiveAcc);

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
  if (closeBtn) closeBtn.textContent = 'CLOSE';
  if (overlay) overlay.style.display = 'flex';

  const handleDismiss = () => {
    if (overlay) overlay.style.display = 'none';
  };

  if (closeBtn) closeBtn.onclick = handleDismiss;
  overlay.onclick = (e) => {
    if (e.target === overlay) handleDismiss();
  };
}

let cachedAppVersion = null;
async function fetchAppVersion() {
  if (cachedAppVersion) return cachedAppVersion;
  try {
    const res = await fetch('./manifest.json');
    if (res.ok) {
      const data = await res.json();
      if (data && data.version) {
        cachedAppVersion = data.version;
        return cachedAppVersion;
      }
    }
  } catch (e) {
    console.warn('Failed to fetch manifest.json version:', e);
  }
  return '';
}

/**
 * Opens the succinct How to Play / Pre-Playing modal covering core basics.
 * @param {Function} [onStart] - Optional callback triggered when player clicks "START MATCH" / dismisses.
 */
export function openHowToPlayModal(onStart = null) {
  const overlay = document.getElementById('modal-overlay');
  const t = document.getElementById('modal-title');
  const b = document.getElementById('modal-body');
  const closeBtn = document.getElementById('modal-close-btn');
  if (!overlay || !b) {
    if (typeof onStart === 'function') onStart();
    return;
  }

  const isPrePlaying = typeof onStart === 'function';

  let html = `
    <div class="how-to-play-container">
      <div class="how-step">
        <div class="how-step-icon">🎴</div>
        <div class="how-step-text">
          <strong>PLAY CARDS</strong>
          <span>Select a shot from your hand. Cards cost stamina ⚡.</span>
        </div>
      </div>

      <div class="how-step">
        <div class="how-step-icon">🎯</div>
        <div class="how-step-text">
          <strong>AIM YOUR SHOT</strong>
          <span>Tap a highlighted zone or corner pocket to aim.</span>
        </div>
      </div>

      <div class="how-step">
        <div class="how-step-icon">🃏</div>
        <div class="how-step-text">
          <strong>TWEAK YOUR DECK</strong>
          <span>Swap cards after each game in a match. More of the same, more precision.</span>
        </div>
      </div>
    </div>
  `;

  if (t) {
    t.textContent = cachedAppVersion ? `SPIN v${cachedAppVersion}` : 'SPIN';
    fetchAppVersion().then((ver) => {
      if (ver && t) {
        t.textContent = `SPIN v${ver}`;
      }
    });
  }
  if (b) b.innerHTML = html;
  if (closeBtn) closeBtn.textContent = isPrePlaying ? 'PLAY' : 'CLOSE';
  overlay.style.display = 'flex';

  let started = false;
  const finish = () => {
    overlay.style.display = 'none';
    if (closeBtn) closeBtn.textContent = 'CLOSE';
    if (!started) {
      started = true;
      if (isPrePlaying) onStart();
    }
  };

  if (closeBtn) closeBtn.onclick = finish;
  overlay.onclick = (e) => {
    if (e.target === overlay) finish();
  };
}

/**
 * Opens the Post-Game Deck Tweaking ("Choose Cards") modal after each game.
 * Lets the player perform a 1-for-1 swap: pick 1 of 3 offered cards and replace
 * 1 card from their matching deck to specialize their stroke repertoire.
 */
export function openPostGameDraftModal(pWon, reason = '', onComplete) {
  const overlay = document.getElementById('modal-overlay');
  const t = document.getElementById('modal-title');
  const b = document.getElementById('modal-body');
  const closeBtn = document.getElementById('modal-close-btn');
  if (!overlay || !b) {
    if (typeof onComplete === 'function') onComplete({ skipped: true });
    return;
  }

  const choices = generateDraftChoices();
  let selectedAddKey = choices[0] || null;
  let selectedRemoveKey = null;

  const finishModal = (result) => {
    overlay.style.display = 'none';
    if (closeBtn) closeBtn.textContent = 'CLOSE';
    if (typeof onComplete === 'function') onComplete(result);
  };

  if (t) {
    t.textContent = `${pWon ? 'GAME TO 1P' : 'GAME TO CPU'} (${gameState.playerGames}-${gameState.cpuGames}) · CHOOSE CARDS`;
  }
  if (closeBtn) {
    closeBtn.textContent = 'SKIP';
    closeBtn.onclick = () => finishModal({ skipped: true });
  }
  overlay.onclick = null;

  const renderDraftView = () => {
    const targetIsServe = isServeCard(selectedAddKey);
    const activeMasterDeck = targetIsServe
      ? gameState.playerMasterServeDeck
      : gameState.playerMasterRallyDeck;

    // Group activeMasterDeck by unique cardKey while preserving first-seen order
    const deckGroups = [];
    const seenCounts = {};
    activeMasterDeck.forEach((k) => {
      if (!(k in seenCounts)) {
        seenCounts[k] = 0;
        deckGroups.push(k);
      }
      seenCounts[k]++;
    });

    // Ensure selectedRemoveKey is valid for the current deck
    if (!selectedRemoveKey || !(selectedRemoveKey in seenCounts) || selectedRemoveKey === selectedAddKey) {
      selectedRemoveKey = deckGroups.find((k) => k !== selectedAddKey) || null;
    }

    let html = `<div class="draft-modal-container">`;

    // Summary banner with artifact button
    html += `
      <div class="draft-game-summary">
        <span>${pWon ? '1P' : 'CPU'} won game (${gameState.playerGames || 0}-${gameState.cpuGames || 0})</span>
        <button id="draft-view-artifact-btn" class="draft-view-artifact-btn" type="button"><i class="ph-light ph-camera"></i> MATCH ARTIFACT</button>
      </div>
    `;

    // STEP 1: Choose 1 of 3 cards to add
    html += `
      <div class="draft-section">
        <div class="draft-step-header">
          <span class="draft-step-title">1. ADD CARD</span>
        </div>
        <div class="modal-cards-grid">
    `;

    choices.forEach((offerKey) => {
      const card = CARD_LIBRARY[offerKey];
      if (!card) return;
      const isSelected = (offerKey === selectedAddKey);
      const curCopies = getPlayerCardCopyCount(offerKey);
      const nextCopies = curCopies + 1;
      const previewAcc = Math.min(0.98, card.baseAccuracy + getMasteryBonus(nextCopies, isServeCard(offerKey)));
      const tone = getAccuracyTone(previewAcc);

      const countBadge = curCopies > 0
        ? `<span class="draft-badge badge-up">×${curCopies} ➔ ×${nextCopies}</span>`
        : `<span class="draft-badge badge-new">NEW</span>`;

      html += `
        <div class="card draft-offer-card ${isSelected ? 'selected' : ''}" data-offer-key="${offerKey}" style="--card-acc-color: ${tone.hex};">
          <div class="card-top-stripe"></div>
          <div class="card-top">
            <div class="card-title">${card.name}</div>
            ${countBadge}
            <div class="card-trajectory">${renderTrajectorySvg(card.trajectoryPath)}</div>
            <div class="card-spin">${renderSpinIcon(card.spin)}</div>
            <div class="card-cost">${renderCostBolts(card.cost)}</div>
          </div>
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;

    // STEP 2: Choose 1 card from matching deck to replace
    html += `
      <div class="draft-section">
        <div class="draft-step-header">
          <span class="draft-step-title">2. REPLACE IN ${targetIsServe ? 'SERVE' : 'RALLY'} DECK</span>
        </div>
        <div class="modal-cards-grid draft-replace-grid">
    `;

    deckGroups.forEach((deckKey) => {
      const card = CARD_LIBRARY[deckKey];
      if (!card) return;
      const count = seenCounts[deckKey];
      const isSameAsAdd = (deckKey === selectedAddKey);
      const isSelectedRemove = (!isSameAsAdd && deckKey === selectedRemoveKey);
      const effectiveCopies = isSelectedRemove ? Math.max(1, count - 1) : count;
      const effectiveAcc = Math.min(0.98, card.baseAccuracy + getMasteryBonus(effectiveCopies, isServeCard(deckKey)));
      const tone = getAccuracyTone(effectiveAcc);

      let statusBadge = `<span class="draft-badge badge-count">×${count}</span>`;
      if (isSelectedRemove) {
        const afterCount = count - 1;
        statusBadge = `<span class="draft-badge badge-drop">×${count} ➔ ×${afterCount}</span>`;
      }

      html += `
        <div class="card draft-deck-card ${isSameAsAdd ? 'disabled' : ''} ${isSelectedRemove ? 'selected-remove' : ''}" data-remove-key="${deckKey}" style="--card-acc-color: ${tone.hex};">
          <div class="card-top-stripe"></div>
          <div class="card-top">
            <div class="card-title">${card.name}</div>
            ${statusBadge}
            <div class="card-trajectory">${renderTrajectorySvg(card.trajectoryPath)}</div>
            <div class="card-spin">${renderSpinIcon(card.spin)}</div>
            <div class="card-cost">${renderCostBolts(card.cost)}</div>
          </div>
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;

    // Bottom sticky action bar
    const addCard = CARD_LIBRARY[selectedAddKey];
    const removeCard = CARD_LIBRARY[selectedRemoveKey];
    const canSwap = Boolean(addCard && removeCard && selectedAddKey !== selectedRemoveKey);

    html += `
      <div class="draft-footer-bar">
        <button id="draft-skip-btn" class="draft-skip-btn">SKIP</button>
        <button id="draft-confirm-btn" class="draft-confirm-btn ${canSwap ? '' : 'disabled'}" ${canSwap ? '' : 'disabled'}>
          ${canSwap ? `SWAP` : 'SELECT CARDS'}
        </button>
      </div>
    </div>`;

    b.innerHTML = html;

    // Bind events
    b.querySelectorAll('.draft-offer-card').forEach((el) => {
      el.addEventListener('click', () => {
        const key = el.dataset.offerKey;
        if (key && key !== selectedAddKey) {
          selectedAddKey = key;
          renderDraftView();
        }
      });
    });

    b.querySelectorAll('.draft-deck-card').forEach((el) => {
      el.addEventListener('click', () => {
        const key = el.dataset.removeKey;
        if (!key || key === selectedAddKey) return;
        selectedRemoveKey = key;
        renderDraftView();
      });
    });

    const artifactBtn = document.getElementById('draft-view-artifact-btn');
    if (artifactBtn) {
      artifactBtn.onclick = () => {
        openMatchArtifactModal('LAST_GAME');
        const artifactCloseBtn = document.getElementById('modal-close-btn');
        if (artifactCloseBtn) {
          artifactCloseBtn.onclick = () => {
            openPostGameDraftModal(pWon, reason, onComplete);
          };
        }
      };
    }

    const skipBtn = document.getElementById('draft-skip-btn');
    if (skipBtn) {
      skipBtn.onclick = () => finishModal({ skipped: true });
    }

    const confirmBtn = document.getElementById('draft-confirm-btn');
    if (confirmBtn && canSwap) {
      confirmBtn.onclick = () => {
        const swapRes = swapPlayerDeckCard(selectedAddKey, selectedRemoveKey);
        finishModal({ swapped: true, ...swapRes });
      };
    }
  };

  renderDraftView();
  overlay.style.display = 'flex';
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

/**
 * Updates directional momentum chevron on opponent entity (#cpu-entity)
 * when it is the player's rally turn and CPU has active recovery inertia.
 */
export function updateOpponentInertiaIndicator() {
  const cpuEl = document.getElementById('cpu-entity');
  if (!cpuEl) return;

  const isPlayerRallyTurn = (gameState.turn === '1P' && gameState.playerCondition !== 'SERVE');
  const dir = isPlayerRallyTurn ? (gameState.cpuRecoveryDirX || 0) : 0;

  if (dir > 0) {
    cpuEl.classList.add('inertia-right');
    cpuEl.classList.remove('inertia-left');
  } else if (dir < 0) {
    cpuEl.classList.add('inertia-left');
    cpuEl.classList.remove('inertia-right');
  } else {
    cpuEl.classList.remove('inertia-left', 'inertia-right');
  }
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

  const feedPanel = document.getElementById('feed-panel');
  if (feedPanel) {
    feedPanel.onclick = () => openGameTrailModal();
  }

  const discardStatusLabel = document.getElementById('discard-status-label');
  if (discardStatusLabel) {
    discardStatusLabel.textContent = gameState.discardUsedThisTurn
      ? "DISCARD: USED THIS TURN"
      : "DISCARD: 1 AVAILABLE";
    discardStatusLabel.classList.toggle('used', gameState.discardUsedThisTurn);
  }

  // Update Opponent Display & Directional Inertia Indicator
  updateOpponentDisplay();
  updateOpponentInertiaIndicator();

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
    serveAttempt: gameState.serveAttempt,
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

    // Nuance dynamic accuracy (including Shot Mastery copy bonus) and color tone
    const copyCount = getPlayerCardCopyCount(cardKey);
    const dynamicAcc = calculateDynamicAccuracy(cardKey, { ...nuanceContext, copyCount });
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

