/* --- GAME STATE & POINT LIFECYCLE --- */
import {
  CARD_LIBRARY,
  SERVE_DECK_TEMPLATE,
  RALLY_DECK_TEMPLATE,
  DRAFT_ONLY_CARDS,
  SAFE_SERVE_CARD,
  SAFE_RALLY_CARD,
  isServeCard,
  createDeck,
  shuffleDeck
} from './cards.js';

export const gameState = {
  playerScore: 0,
  cpuScore: 0,
  playerGames: 0,
  cpuGames: 0,
  pointsPlayed: 0,
  currentServer: 'CPU', // Default to CPU so player returns first
  serveAttempt: 1,     // 1 or 2
  turn: 'TRANSIT',     // '1P', 'CPU', 'TRANSIT', 'OVER'
  playerCondition: 'NEUTRAL', // 'SERVE', 'IN_POSITION', 'OPPORTUNITY', 'SCRAMBLE', 'NEUTRAL'
  cpuCondition: 'NEUTRAL',
  stamina: 3,
  maxStamina: 3,
  selectedCardKey: null,
  playerPos: 'c-ply-dp-l',
  playerCoords: null,
  cpuPos: 'c-opp-dp-r',
  cpuCoords: null,
  ballPos: null,

  // Player Persistent Master Decks (customized after each game)
  playerMasterServeDeck: createDeck(SERVE_DECK_TEMPLATE),
  playerMasterRallyDeck: createDeck(RALLY_DECK_TEMPLATE),

  // Player Active Draw Decks & Discard Piles
  playerServeDeck: createDeck(SERVE_DECK_TEMPLATE),
  playerServeDiscard: [],
  playerRallyDeck: createDeck(RALLY_DECK_TEMPLATE),
  playerRallyDiscard: [],

  // CPU Decks & Discard Piles
  cpuServeDeck: createDeck(SERVE_DECK_TEMPLATE),
  cpuServeDiscard: [],
  cpuRallyDeck: createDeck(RALLY_DECK_TEMPLATE),
  cpuRallyDiscard: [],

  // Hands
  playerHand: [],
  cpuHand: [],
  cpuRevealedCard: null,

  // Nuance context
  rallyLength: 0,
  lastShotSpeed: 'normal',
  lastShotTag: 'SERVE',
  distanceMoved: 0,
  spinMomentum: 0, // [-3..+3]: negative = slice accumulation, positive = topspin accumulation
  playerRecoveryDirX: 0,
  cpuRecoveryDirX: 0,
  playerLastSprintDirX: 0,
  cpuLastSprintDirX: 0,
  playerMomentumPenalty: null, // 'WRONG_FOOTED' | 'WHIPLASH' | null
  cpuMomentumPenalty: null,
  playerStrokeWing: 'FOREHAND',
  cpuStrokeWing: 'FOREHAND',

  // Discard mechanics
  discardUsedThisTurn: false,
  discardMode: false,

  // Match commentary history trail
  gameTrail: [],

  // Match shot vectors & statistics for game artifact generation
  matchShots: [],
  matchStats: {
    playerAces: 0,
    cpuAces: 0,
    playerWinners: 0,
    cpuWinners: 0,
    playerErrors: 0,
    cpuErrors: 0,
    longestRally: 0,
    totalShots: 0
  }
};

export function resetPlayerDecks() {
  gameState.playerMasterServeDeck = createDeck(SERVE_DECK_TEMPLATE);
  gameState.playerMasterRallyDeck = createDeck(RALLY_DECK_TEMPLATE);
  gameState.playerServeDeck = shuffleDeck(createDeck(gameState.playerMasterServeDeck));
  gameState.playerServeDiscard = [];
  gameState.playerRallyDeck = shuffleDeck(createDeck(gameState.playerMasterRallyDeck));
  gameState.playerRallyDiscard = [];
}

export function resetCpuDecks() {
  gameState.cpuServeDeck = shuffleDeck(createDeck(SERVE_DECK_TEMPLATE));
  gameState.cpuServeDiscard = [];
  gameState.cpuRallyDeck = shuffleDeck(createDeck(RALLY_DECK_TEMPLATE));
  gameState.cpuRallyDiscard = [];
}

/**
 * Refreshes active draw & discard piles from the player's customized master decks
 * at the start of a new game.
 */
export function refreshDecksForNewGame() {
  gameState.playerHand = [];
  gameState.cpuHand = [];
  gameState.playerServeDeck = shuffleDeck(createDeck(gameState.playerMasterServeDeck));
  gameState.playerServeDiscard = [];
  gameState.playerRallyDeck = shuffleDeck(createDeck(gameState.playerMasterRallyDeck));
  gameState.playerRallyDiscard = [];
  resetCpuDecks();
}

/**
 * Returns how many copies of a card exist in the player's customized master deck.
 * Safe cards and situational smashes always return 1 (no duplicate mastery bonus).
 */
export function getPlayerCardCopyCount(cardKey) {
  if (!cardKey || cardKey === SAFE_SERVE_CARD || cardKey === SAFE_RALLY_CARD || cardKey === 'smash_winner') {
    return 1;
  }
  const masterDeck = isServeCard(cardKey)
    ? gameState.playerMasterServeDeck
    : gameState.playerMasterRallyDeck;
  let count = 0;
  for (let i = 0; i < masterDeck.length; i++) {
    if (masterDeck[i] === cardKey) count++;
  }
  return count;
}

/**
 * Performs a 1-for-1 card replacement in the player's master deck (Serve or Rally).
 */
export function swapPlayerDeckCard(addCardKey, removeCardKey) {
  if (!addCardKey || !removeCardKey || !CARD_LIBRARY[addCardKey]) return null;
  const targetIsServe = isServeCard(addCardKey);
  const masterDeck = targetIsServe
    ? gameState.playerMasterServeDeck
    : gameState.playerMasterRallyDeck;

  const idx = masterDeck.indexOf(removeCardKey);
  if (idx === -1) return null;

  masterDeck[idx] = addCardKey;
  refreshDecksForNewGame();

  const newCopyCount = getPlayerCardCopyCount(addCardKey);
  const remainingRemovedCount = getPlayerCardCopyCount(removeCardKey);

  console.log('[DEBUG] Deck 1-for-1 swap executed:', {
    added: addCardKey,
    removed: removeCardKey,
    newCopyCount,
    remainingRemovedCount,
    masterDeck: [...masterDeck]
  });

  return {
    added: addCardKey,
    removed: removeCardKey,
    newCopyCount,
    remainingRemovedCount
  };
}

/**
 * Generates 3 distinct card choices for the post-game deck tweaking modal:
 * - Slot 1: Reinforcement from the player's current Rally deck (to specialize an existing stroke)
 * - Slot 2: Another card from the player's current Rally or Serve deck / base pool
 * - Slot 3: A specialized Draft-Only card (e.g. Inside-Out Laser, Acute Feather Drop, Heavy Spin Looper, Twist Kick Serve)
 */
export function generateDraftChoices() {
  const choices = [];
  const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // 1. Pick a card already in the player's rally deck that can still be replaced (i.e. doesn't already fill the whole deck)
  const rallyCandidates = [...new Set(gameState.playerMasterRallyDeck)].filter(
    k => getPlayerCardCopyCount(k) < gameState.playerMasterRallyDeck.length
  );
  if (rallyCandidates.length > 0) {
    choices.push(pickRandom(rallyCandidates));
  }

  // 2. Pick a second card from combined player decks or standard templates
  const combinedPool = [
    ...new Set([
      ...gameState.playerMasterRallyDeck,
      ...gameState.playerMasterServeDeck,
      ...RALLY_DECK_TEMPLATE,
      ...SERVE_DECK_TEMPLATE
    ])
  ].filter(k => !choices.includes(k) && k !== SAFE_SERVE_CARD && k !== SAFE_RALLY_CARD);

  if (combinedPool.length > 0) {
    choices.push(pickRandom(combinedPool));
  }

  // 3. Pick a specialized draft-only card
  const draftPool = DRAFT_ONLY_CARDS.filter(k => !choices.includes(k));
  if (draftPool.length > 0) {
    choices.push(pickRandom(draftPool));
  }

  // Fill any remaining slots if needed
  const fallbackPool = Object.keys(CARD_LIBRARY).filter(
    k => !choices.includes(k) && k !== SAFE_SERVE_CARD && k !== SAFE_RALLY_CARD && k !== 'smash_winner'
  );
  while (choices.length < 3 && fallbackPool.length > 0) {
    const pick = pickRandom(fallbackPool);
    choices.push(pick);
    fallbackPool.splice(fallbackPool.indexOf(pick), 1);
  }

  return choices;
}

/**
 * Draws cards from a draw deck into hand. If draw deck runs out,
 * reshuffles discard pile into draw deck.
 */
function drawFromDeck(drawDeck, discardPile, template, count) {
  const drawn = [];
  for (let i = 0; i < count; i++) {
    if (drawDeck.length === 0) {
      if (discardPile.length > 0) {
        console.log('[DEBUG] Draw deck empty, reshuffling discard pile into deck');
        drawDeck.push(...shuffleDeck(discardPile));
        discardPile.length = 0;
      } else {
        // Fallback: reload template if both are empty
        drawDeck.push(...shuffleDeck(createDeck(template)));
      }
    }
    if (drawDeck.length > 0) {
      drawn.push(drawDeck.pop());
    }
  }
  return drawn;
}

/**
 * Draws or replenishes player's hand:
 * - If serving: ensures player has SAFE_SERVE_CARD and up to 2 drawn serve cards.
 * - If returning / rallying: ensures player has SAFE_RALLY_CARD and up to 3 drawn rally cards.
 * Unplayed cards of the current phase are kept; only opposite-phase cards are discarded.
 */
export function drawPlayerHand(isServe = false) {
  const targetDeck = isServe ? gameState.playerServeDeck : gameState.playerRallyDeck;
  const targetDiscard = isServe ? gameState.playerServeDiscard : gameState.playerRallyDiscard;
  const template = isServe ? gameState.playerMasterServeDeck : gameState.playerMasterRallyDeck;
  const safeCard = isServe ? SAFE_SERVE_CARD : SAFE_RALLY_CARD;
  const targetDrawnCount = isServe ? 2 : 3;

  const keptDrawnCards = [];
  const oldHand = [...gameState.playerHand];

  oldHand.forEach((cardKey) => {
    if (cardKey === SAFE_SERVE_CARD || cardKey === SAFE_RALLY_CARD || cardKey === 'smash_winner') return;

    const cardIsServe = isServeCard(cardKey);
    if (cardIsServe !== isServe) {
      if (cardIsServe) {
        gameState.playerServeDiscard.push(cardKey);
      } else {
        gameState.playerRallyDiscard.push(cardKey);
      }
    } else {
      keptDrawnCards.push(cardKey);
    }
  });

  const needed = Math.max(0, targetDrawnCount - keptDrawnCards.length);
  const newlyDrawn = drawFromDeck(targetDeck, targetDiscard, template, needed);

  gameState.playerHand = [safeCard, ...keptDrawnCards, ...newlyDrawn];
  gameState.discardUsedThisTurn = false;
  gameState.discardMode = false;
  gameState.selectedCardKey = null;
  gameState.justDrawnCardKey = newlyDrawn[0] || null;

  console.log('[DEBUG] 1P Hand state:', gameState.playerHand, 'Deck remaining:', targetDeck.length, 'Discard:', targetDiscard.length);
}

/**
 * Discards one card from player's hand and draws a fresh replacement from the active deck.
 */
export function discardPlayerCard(cardKey) {
  if (gameState.discardUsedThisTurn) {
    console.warn('[Discard] Discard already used this turn');
    return false;
  }
  if (cardKey === SAFE_SERVE_CARD || cardKey === SAFE_RALLY_CARD) {
    console.warn('[Discard] Cannot discard the permanent Safe Option');
    return false;
  }

  const idx = gameState.playerHand.indexOf(cardKey);
  if (idx === -1) return false;

  const isServe = gameState.playerCondition === 'SERVE';
  const drawDeck = isServe ? gameState.playerServeDeck : gameState.playerRallyDeck;
  const discardPile = isServe ? gameState.playerServeDiscard : gameState.playerRallyDiscard;
  const template = isServe ? gameState.playerMasterServeDeck : gameState.playerMasterRallyDeck;

  // Move discarded card to discard pile (unless situational smash_winner)
  if (cardKey !== 'smash_winner') {
    discardPile.push(cardKey);
  }

  // Draw replacement card
  const drawn = drawFromDeck(drawDeck, discardPile, template, 1);
  const replacement = drawn[0] || cardKey;

  gameState.playerHand[idx] = replacement;
  gameState.justDrawnCardKey = replacement;
  gameState.discardUsedThisTurn = true;
  gameState.discardMode = false;
  gameState.selectedCardKey = null;

  console.log('[DEBUG] 1P discarded:', cardKey, 'Drawn replacement:', replacement, 'Remaining deck:', drawDeck.length);
  return { success: true, discarded: cardKey, drawn: replacement };
}

/**
 * Discards a played card into the discard pile upon shot execution.
 */
export function onPlayerCardPlayed(cardKey) {
  const isServe = gameState.playerCondition === 'SERVE';
  const discardPile = isServe ? gameState.playerServeDiscard : gameState.playerRallyDiscard;

  if (cardKey !== SAFE_SERVE_CARD && cardKey !== SAFE_RALLY_CARD && cardKey !== 'smash_winner') {
    discardPile.push(cardKey);
  }

  // Remove card from hand
  const idx = gameState.playerHand.indexOf(cardKey);
  if (idx !== -1 && cardKey !== SAFE_SERVE_CARD && cardKey !== SAFE_RALLY_CARD) {
    gameState.playerHand.splice(idx, 1);
  }
}

/**
 * Discards a played CPU card into the CPU discard pile upon shot execution.
 */
export function onCpuCardPlayed(cardKey) {
  const isServe = isServeCard(cardKey);
  const discardPile = isServe ? gameState.cpuServeDiscard : gameState.cpuRallyDiscard;

  if (cardKey !== SAFE_SERVE_CARD && cardKey !== SAFE_RALLY_CARD && cardKey !== 'smash_winner') {
    discardPile.push(cardKey);
  }

  const idx = gameState.cpuHand.indexOf(cardKey);
  if (idx !== -1 && cardKey !== SAFE_SERVE_CARD && cardKey !== SAFE_RALLY_CARD) {
    gameState.cpuHand.splice(idx, 1);
  }
}

/**
 * Draws or replenishes CPU's hand.
 */
export function drawCpuHand(isServe = false) {
  const targetDeck = isServe ? gameState.cpuServeDeck : gameState.cpuRallyDeck;
  const targetDiscard = isServe ? gameState.cpuServeDiscard : gameState.cpuRallyDiscard;
  const template = isServe ? SERVE_DECK_TEMPLATE : RALLY_DECK_TEMPLATE;
  const safeCard = isServe ? SAFE_SERVE_CARD : SAFE_RALLY_CARD;
  const targetDrawnCount = isServe ? 2 : 3;

  const kept = [];
  gameState.cpuHand.forEach((cardKey) => {
    if (cardKey === SAFE_SERVE_CARD || cardKey === SAFE_RALLY_CARD || cardKey === 'smash_winner') return;
    const cardIsServe = isServeCard(cardKey);
    if (cardIsServe !== isServe) {
      if (cardIsServe) gameState.cpuServeDiscard.push(cardKey);
      else gameState.cpuRallyDiscard.push(cardKey);
    } else {
      kept.push(cardKey);
    }
  });

  const needed = Math.max(0, targetDrawnCount - kept.length);
  const newlyDrawn = drawFromDeck(targetDeck, targetDiscard, template, needed);
  gameState.cpuHand = [safeCard, ...kept, ...newlyDrawn];
}

/**
 * Clean up hands at the conclusion of a point, moving unplayed cards to discard.
 */
export function cleanUpPointHand() {
  gameState.playerHand.forEach((cardKey) => {
    if (cardKey === SAFE_SERVE_CARD || cardKey === SAFE_RALLY_CARD || cardKey === 'smash_winner') return;
    if (isServeCard(cardKey)) {
      gameState.playerServeDiscard.push(cardKey);
    } else {
      gameState.playerRallyDiscard.push(cardKey);
    }
  });
  gameState.playerHand = [];

  gameState.cpuHand.forEach((cardKey) => {
    if (cardKey === SAFE_SERVE_CARD || cardKey === SAFE_RALLY_CARD || cardKey === 'smash_winner') return;
    if (isServeCard(cardKey)) {
      gameState.cpuServeDiscard.push(cardKey);
    } else {
      gameState.cpuRallyDiscard.push(cardKey);
    }
  });
  gameState.cpuHand = [];
}

