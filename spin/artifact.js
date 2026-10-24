/* --- MATCH ARTIFACT & HAWK-EYE CANVAS GENERATOR --- */
import { gameState } from './state.js';
import { CARD_LIBRARY } from './cards.js';
import { getCourtStageCoords } from './court.js';

/**
 * Normalizes stage pixel coordinates { x, y } to court coordinates [0..1].
 * x: 0 = left sideline, 1 = right sideline
 * y: 0 = CPU baseline, 0.5 = net, 1 = 1P baseline
 */
export function toNormalizedCourtCoords(coords) {
  if (!coords || typeof coords.x !== 'number' || typeof coords.y !== 'number') {
    return { x: 0.5, y: 0.5 };
  }
  const court = getCourtStageCoords();
  if (!court || court.width <= 0 || court.height <= 0) {
    return { x: 0.5, y: 0.5 };
  }
  return {
    x: (coords.x - court.left) / court.width,
    y: (coords.y - court.top) / court.height
  };
}

/**
 * Records a shot trajectory in gameState for artifact generation.
 */
export function recordMatchShot(shotInfo) {
  if (!gameState.matchShots) gameState.matchShots = [];
  if (!gameState.matchStats) {
    gameState.matchStats = {
      playerAces: 0,
      cpuAces: 0,
      playerWinners: 0,
      cpuWinners: 0,
      playerErrors: 0,
      cpuErrors: 0,
      longestRally: 0,
      totalShots: 0
    };
  }

  const normFrom = toNormalizedCourtCoords(shotInfo.from);
  const normBounce = shotInfo.bounce ? toNormalizedCourtCoords(shotInfo.bounce) : null;
  const normTo = shotInfo.to ? toNormalizedCourtCoords(shotInfo.to) : normBounce;

  const entry = {
    id: gameState.matchShots.length + 1,
    hitter: shotInfo.hitter || '1P',
    cardKey: shotInfo.cardKey,
    cardName: (CARD_LIBRARY[shotInfo.cardKey]?.name) || shotInfo.cardKey || 'Shot',
    speed: shotInfo.speed || 'normal',
    tag: shotInfo.tag || 'RALLY',
    from: normFrom,
    bounce: normBounce,
    to: normTo,
    outcome: shotInfo.outcome || 'rally', // 'rally' | 'winner' | 'ace' | 'fault' | 'error'
    pointIndex: gameState.pointsPlayed || 0,
    gameIndex: (gameState.playerGames || 0) + (gameState.cpuGames || 0),
    timestamp: Date.now()
  };

  gameState.matchShots.push(entry);
  gameState.matchStats.totalShots++;

  if (entry.outcome === 'ace') {
    if (entry.hitter === '1P') gameState.matchStats.playerAces++;
    else gameState.matchStats.cpuAces++;
  } else if (entry.outcome === 'winner') {
    if (entry.hitter === '1P') gameState.matchStats.playerWinners++;
    else gameState.matchStats.cpuWinners++;
  } else if (entry.outcome === 'fault' || entry.outcome === 'error') {
    if (entry.hitter === '1P') gameState.matchStats.playerErrors++;
    else gameState.matchStats.cpuErrors++;
  }

  if (gameState.rallyLength > (gameState.matchStats.longestRally || 0)) {
    gameState.matchStats.longestRally = gameState.rallyLength;
  }

  return entry;
}

/**
 * Updates the outcome of the most recently recorded shot.
 * Used when a winner or unforced error is resolved after flight.
 */
export function updateLastShotOutcome(outcome) {
  if (!gameState.matchShots || gameState.matchShots.length === 0) return;
  const last = gameState.matchShots[gameState.matchShots.length - 1];
  const prevOutcome = last.outcome;
  last.outcome = outcome;

  // Adjust stats
  if (!gameState.matchStats) return;
  if (prevOutcome !== outcome) {
    if (outcome === 'ace') {
      if (last.hitter === '1P') gameState.matchStats.playerAces++;
      else gameState.matchStats.cpuAces++;
    } else if (outcome === 'winner') {
      if (last.hitter === '1P') gameState.matchStats.playerWinners++;
      else gameState.matchStats.cpuWinners++;
    } else if (outcome === 'error' || outcome === 'fault') {
      if (last.hitter === '1P') gameState.matchStats.playerErrors++;
      else gameState.matchStats.cpuErrors++;
    }
  }
}

/**
 * Renders the Hawk-Eye Match Artifact to a Canvas element.
 * @param {Object} options - Filter and rendering options.
 * @param {string} options.filter - 'ALL', 'LAST_GAME', or 'HIGHLIGHTS'
 * @param {number} [options.maxShotIndex] - If set, renders up to this shot (for replay animations)
 * @returns {HTMLCanvasElement}
 */
export function renderMatchArtifactCanvas(options = {}) {
  const filter = options.filter || 'ALL';
  const maxShotIndex = (typeof options.maxShotIndex === 'number') ? options.maxShotIndex : Infinity;

  const canvas = document.createElement('canvas');
  const width = 760;
  const height = 1000;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Background gradient: dark cyber slate
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, '#060911');
  bgGrad.addColorStop(0.5, '#0a0e19');
  bgGrad.addColorStop(1, '#05070e');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle dot grid texture
  ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
  const dotStep = 24;
  for (let x = 16; x < width; x += dotStep) {
    for (let y = 16; y < height; y += dotStep) {
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Outer framing line & corner tech crosshairs
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;
  ctx.strokeRect(18, 18, width - 36, height - 36);

  const drawCrosshair = (cx, cy) => {
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1.5;
    const len = 8;
    ctx.beginPath();
    ctx.moveTo(cx - len, cy); ctx.lineTo(cx + len, cy);
    ctx.moveTo(cx, cy - len); ctx.lineTo(cx, cy + len);
    ctx.stroke();
  };
  drawCrosshair(18, 18);
  drawCrosshair(width - 18, 18);
  drawCrosshair(18, height - 18);
  drawCrosshair(width - 18, height - 18);

  // --- HEADER SECTION ---
  ctx.font = 'bold 22px monospace';
  ctx.fillStyle = '#00f0ff';
  ctx.letterSpacing = '2px';
  ctx.textAlign = 'left';
  ctx.fillText('SPIN', 36, 56);

  ctx.font = '12px monospace';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.letterSpacing = '1px';
  ctx.fillText('· MATCH ARTIFACT // HAWK-EYE RECAP', 96, 56);

  const dateStr = new Date().toISOString().slice(0, 10);
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.font = '11px monospace';
  ctx.fillText(`LOG: ${dateStr}`, width - 36, 56);

  // Divider
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.beginPath();
  ctx.moveTo(36, 72);
  ctx.lineTo(width - 36, 72);
  ctx.stroke();

  // Scoreboard bar
  const pGames = gameState.playerGames || 0;
  const cGames = gameState.cpuGames || 0;
  const pScore = gameState.playerScore || 0;
  const cScore = gameState.cpuScore || 0;

  ctx.textAlign = 'left';
  ctx.font = 'bold 15px monospace';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('1P', 36, 102);
  ctx.fillStyle = '#00f0ff';
  ctx.fillText(`GAMES: ${pGames}`, 70, 102);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('CPU', width - 130, 102);
  ctx.fillStyle = '#fb7185';
  ctx.fillText(`GAMES: ${cGames}`, width - 36, 102);

  ctx.textAlign = 'center';
  ctx.font = '11px monospace';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.fillText(`TOTAL POINTS: ${gameState.pointsPlayed || 0}`, width / 2, 102);

  // --- TENNIS COURT GEOMETRY ---
  const courtX = 80;
  const courtY = 135;
  const courtW = width - 160; // 600px wide
  const courtH = 670; // 670px tall

  // Court floor
  const courtGrad = ctx.createLinearGradient(0, courtY, 0, courtY + courtH);
  courtGrad.addColorStop(0, '#0a101d');
  courtGrad.addColorStop(0.5, '#0f172a');
  courtGrad.addColorStop(1, '#0a101d');
  ctx.fillStyle = courtGrad;
  ctx.fillRect(courtX, courtY, courtW, courtH);

  // Court outer line (Baselines & Sidelines)
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(courtX, courtY, courtW, courtH);

  // Doubles Tramlines (10% on each flank)
  const tramlineW = courtW * 0.10;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(courtX + tramlineW, courtY, courtW - tramlineW * 2, courtH);

  // Service Lines (y = 0.25 and y = 0.75 of playable height)
  const cpuServY = courtY + courtH * 0.25;
  const netY = courtY + courtH * 0.50;
  const plyServY = courtY + courtH * 0.75;

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  // CPU Service line
  ctx.beginPath();
  ctx.moveTo(courtX + tramlineW, cpuServY);
  ctx.lineTo(courtX + courtW - tramlineW, cpuServY);
  ctx.stroke();

  // 1P Service line
  ctx.beginPath();
  ctx.moveTo(courtX + tramlineW, plyServY);
  ctx.lineTo(courtX + courtW - tramlineW, plyServY);
  ctx.stroke();

  // Center Service Line (between CPU and 1P service lines)
  const centerServX = courtX + courtW / 2;
  ctx.beginPath();
  ctx.moveTo(centerServX, cpuServY);
  ctx.lineTo(centerServX, plyServY);
  ctx.stroke();

  // Center Marks on Baselines
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(centerServX, courtY);
  ctx.lineTo(centerServX, courtY + 12);
  ctx.moveTo(centerServX, courtY + courtH);
  ctx.lineTo(centerServX, courtY + courtH - 12);
  ctx.stroke();

  // Drop / Corner Pockets (dashed guides)
  ctx.save();
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = 'rgba(255, 170, 68, 0.45)';
  ctx.lineWidth = 1;
  const pocketW = (courtW - tramlineW * 2) * 0.33;
  const pocketH = courtH * 0.12;

  // CPU Deep corners
  ctx.strokeRect(courtX + tramlineW, courtY, pocketW, pocketH);
  ctx.strokeRect(courtX + courtW - tramlineW - pocketW, courtY, pocketW, pocketH);
  // CPU Drop corners (front net)
  ctx.strokeRect(courtX + tramlineW, netY - pocketH, pocketW, pocketH);
  ctx.strokeRect(courtX + courtW - tramlineW - pocketW, netY - pocketH, pocketW, pocketH);
  // 1P Drop corners (front net)
  ctx.strokeRect(courtX + tramlineW, netY, pocketW, pocketH);
  ctx.strokeRect(courtX + courtW - tramlineW - pocketW, netY, pocketW, pocketH);
  // 1P Deep corners
  ctx.strokeRect(courtX + tramlineW, courtY + courtH - pocketH, pocketW, pocketH);
  ctx.strokeRect(courtX + courtW - tramlineW - pocketW, courtY + courtH - pocketH, pocketW, pocketH);
  ctx.restore();

  // Net Line with net posts
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(courtX - 10, netY);
  ctx.lineTo(courtX + courtW + 10, netY);
  ctx.stroke();

  // Net posts
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(courtX - 12, netY - 5, 6, 10);
  ctx.fillRect(courtX + courtW + 6, netY - 5, 6, 10);

  // Net label
  ctx.font = 'bold 9px monospace';
  ctx.fillStyle = 'rgba(56, 189, 248, 0.8)';
  ctx.textAlign = 'right';
  ctx.fillText('NET', courtX - 16, netY + 3);

  // Court End Labels
  ctx.font = 'bold 11px monospace';
  ctx.fillStyle = 'rgba(251, 113, 133, 0.7)';
  ctx.textAlign = 'center';
  ctx.fillText('CPU END', courtX + courtW / 2, courtY - 10);

  ctx.fillStyle = 'rgba(0, 240, 255, 0.7)';
  ctx.fillText('1P END', courtX + courtW / 2, courtY + courtH + 20);

  // --- SHOT TRAJECTORIES ---
  const allShots = Array.isArray(gameState.matchShots) ? gameState.matchShots : [];
  const currentTotalGames = (gameState.playerGames || 0) + (gameState.cpuGames || 0);

  let filteredShots = allShots.filter((s, idx) => {
    if (idx >= maxShotIndex) return false;
    if (filter === 'LAST_GAME') {
      return s.gameIndex === currentTotalGames;
    }
    if (filter === 'HIGHLIGHTS') {
      return s.outcome === 'winner' || s.outcome === 'ace' || s.outcome === 'fault';
    }
    return true;
  });

  const toCanvasX = (normX) => courtX + normX * courtW;
  const toCanvasY = (normY) => courtY + normY * courtH;

  filteredShots.forEach((shot) => {
    const is1P = (shot.hitter === '1P');
    const startX = toCanvasX(shot.from.x);
    const startY = toCanvasY(shot.from.y);
    const bounceX = shot.bounce ? toCanvasX(shot.bounce.x) : toCanvasX(shot.to.x);
    const bounceY = shot.bounce ? toCanvasY(shot.bounce.y) : toCanvasY(shot.to.y);
    const endX = toCanvasX(shot.to.x);
    const endY = toCanvasY(shot.to.y);

    const isWinner = (shot.outcome === 'winner');
    const isAce = (shot.outcome === 'ace');
    const isError = (shot.outcome === 'fault' || shot.outcome === 'error');

    // Trajectory colors
    let strokeColor;
    if (isAce || isWinner) {
      strokeColor = is1P ? '#00f0ff' : '#fb7185';
    } else if (isError) {
      strokeColor = '#ef4444';
    } else {
      strokeColor = is1P ? 'rgba(0, 240, 255, 0.45)' : 'rgba(251, 113, 133, 0.45)';
    }

    ctx.save();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = (isAce || isWinner) ? 2.5 : 1.5;

    // Flight Arc 1: from start to bounce
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    // Control point creates parabolic arc towards net
    const midX = (startX + bounceX) / 2;
    const midY = (startY + bounceY) / 2;
    ctx.quadraticCurveTo(midX, midY, bounceX, bounceY);
    ctx.stroke();

    // Flight Arc 2: bounce to strike/rebound (if separate)
    if (shot.bounce && (Math.abs(bounceX - endX) > 4 || Math.abs(bounceY - endY) > 4)) {
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(bounceX, bounceY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }
    ctx.restore();

    // Bounce marker
    ctx.save();
    if (isAce || isWinner) {
      // Glowing starburst / diamond
      ctx.fillStyle = isAce ? '#fde047' : (is1P ? '#00f0ff' : '#fb7185');
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(bounceX, bounceY, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Mini diamond tag
      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      const label = isAce ? '★ ACE' : '★ WINNER';
      const tagY = is1P ? bounceY - 8 : bounceY + 14;
      ctx.fillText(label, bounceX, tagY);
    } else if (isError) {
      // Red X
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      const r = 4;
      ctx.beginPath();
      ctx.moveTo(bounceX - r, bounceY - r); ctx.lineTo(bounceX + r, bounceY + r);
      ctx.moveTo(bounceX + r, bounceY - r); ctx.lineTo(bounceX - r, bounceY + r);
      ctx.stroke();
    } else {
      // Normal bounce dot
      ctx.fillStyle = is1P ? 'rgba(0, 240, 255, 0.7)' : 'rgba(251, 113, 133, 0.7)';
      ctx.beginPath();
      ctx.arc(bounceX, bounceY, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  });

  // --- FOOTER & MATCH STATS ---
  const stats = gameState.matchStats || {
    playerAces: 0,
    cpuAces: 0,
    playerWinners: 0,
    cpuWinners: 0,
    playerErrors: 0,
    cpuErrors: 0,
    longestRally: 0,
    totalShots: 0
  };

  const footerY = height - 130;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.beginPath();
  ctx.moveTo(36, footerY);
  ctx.lineTo(width - 36, footerY);
  ctx.stroke();

  // 4 Stats columns
  const colW = (width - 72) / 4;
  const statItems = [
    { label: 'ACES', p: stats.playerAces, c: stats.cpuAces },
    { label: 'WINNERS', p: stats.playerWinners, c: stats.cpuWinners },
    { label: 'ERRORS', p: stats.playerErrors, c: stats.cpuErrors },
    { label: 'MAX RALLY', val: `${stats.longestRally} SHOTS` }
  ];

  statItems.forEach((item, idx) => {
    const x = 36 + idx * colW + colW / 2;
    ctx.textAlign = 'center';
    ctx.font = '9px monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.letterSpacing = '1px';
    ctx.fillText(item.label, x, footerY + 22);

    ctx.font = 'bold 13px monospace';
    if (item.val) {
      ctx.fillStyle = '#fde047';
      ctx.fillText(item.val, x, footerY + 42);
    } else {
      // Show 1P vs CPU
      ctx.fillStyle = '#00f0ff';
      ctx.fillText(`${item.p}`, x - 14, footerY + 42);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillText('/', x, footerY + 42);
      ctx.fillStyle = '#fb7185';
      ctx.fillText(`${item.c}`, x + 14, footerY + 42);
    }
  });

  // Deck Specialization signature
  const masterRally = gameState.playerMasterRallyDeck || [];
  const masterServe = gameState.playerMasterServeDeck || [];
  // Find card with most copies
  const counts = {};
  [...masterRally, ...masterServe].forEach(k => { counts[k] = (counts[k] || 0) + 1; });
  let topCardKey = null;
  let topCount = 1;
  Object.entries(counts).forEach(([k, cnt]) => {
    if (cnt > topCount) {
      topCount = cnt;
      topCardKey = k;
    }
  });

  const specialtyText = topCardKey
    ? `DECK MASTERY: ${((CARD_LIBRARY[topCardKey]?.name) || topCardKey).toUpperCase()} (×${topCount})`
    : `DECK REPERTOIRE: BALANCED ALL-COURT (${masterRally.length + masterServe.length} CARDS)`;

  ctx.textAlign = 'left';
  ctx.font = '10px monospace';
  ctx.fillStyle = '#4ade80';
  ctx.fillText(`⚡ ${specialtyText}`, 36, footerY + 74);

  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.font = '9px monospace';
  ctx.fillText(`SPIN PWA · VERIFIED MATCH RECORD`, width - 36, footerY + 74);

  return canvas;
}

/**
 * Opens the Match Artifact Modal with image preview, download, and replay features.
 */
let currentFilter = 'ALL';
let animationFrameId = null;

export function openMatchArtifactModal(initialFilter = 'ALL') {
  currentFilter = initialFilter;
  const overlay = document.getElementById('modal-overlay');
  const t = document.getElementById('modal-title');
  const b = document.getElementById('modal-body');
  const closeBtn = document.getElementById('modal-close-btn');
  if (!overlay || !b) return;

  const totalShots = (gameState.matchShots || []).length;

  const renderModalContent = () => {
    // Generate the static canvas
    const canvas = renderMatchArtifactCanvas({ filter: currentFilter });
    const dataUrl = canvas.toDataURL('image/png');

    let html = `
      <div class="artifact-modal-container">
        <!-- Filter bar -->
        <div class="artifact-filter-bar">
          <button class="artifact-filter-btn ${currentFilter === 'ALL' ? 'active' : ''}" data-filter="ALL">ALL (${totalShots})</button>
          <button class="artifact-filter-btn ${currentFilter === 'LAST_GAME' ? 'active' : ''}" data-filter="LAST_GAME">LAST GAME</button>
          <button class="artifact-filter-btn ${currentFilter === 'HIGHLIGHTS' ? 'active' : ''}" data-filter="HIGHLIGHTS">WINNERS/ACES</button>
        </div>

        <!-- Canvas Preview Card -->
        <div class="artifact-preview-card" id="artifact-canvas-holder">
          <img id="artifact-image-preview" src="${dataUrl}" alt="Spin Match Artifact" class="artifact-image-preview">
        </div>

        <!-- Action bar -->
        <div class="artifact-action-bar">
          <a id="artifact-download-link" class="artifact-action-btn artifact-download-btn" download="spin-match-${Date.now()}.png" href="${dataUrl}">
            <i class="ph-light ph-download-simple"></i> SAVE MATCH ARTIFACT
          </a>
          <button id="artifact-replay-btn" class="artifact-action-btn artifact-replay-btn">
            <i class="ph-light ph-play"></i> REPLAY TRAIL
          </button>
          ${navigator.share ? `
            <button id="artifact-share-btn" class="artifact-action-btn artifact-share-btn">
              <i class="ph-light ph-share-network"></i> SHARE
            </button>
          ` : ''}
        </div>
      </div>
    `;

    b.innerHTML = html;

    // Filter clicks
    b.querySelectorAll('.artifact-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentFilter = btn.dataset.filter || 'ALL';
        renderModalContent();
      });
    });

    // Replay Trail Animation
    const replayBtn = document.getElementById('artifact-replay-btn');
    if (replayBtn) {
      replayBtn.onclick = () => {
        startReplayAnimation();
      };
    }

    // Share button
    const shareBtn = document.getElementById('artifact-share-btn');
    if (shareBtn && navigator.share) {
      shareBtn.onclick = async () => {
        try {
          canvas.toBlob(async (blob) => {
            if (!blob) return;
            const file = new File([blob], `spin-match-${Date.now()}.png`, { type: 'image/png' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              await navigator.share({
                files: [file],
                title: 'Spin Tennis Match Artifact',
                text: `Spin Tennis Match Recap: 1P (${gameState.playerGames || 0}) vs CPU (${gameState.cpuGames || 0})`
              });
            } else {
              await navigator.share({
                title: 'Spin Tennis Match Artifact',
                text: `Spin Tennis Match Recap: 1P (${gameState.playerGames || 0}) vs CPU (${gameState.cpuGames || 0})`
              });
            }
          });
        } catch (err) {
          console.log('[Artifact] Share dismissed or unsupported:', err);
        }
      };
    }
  };

  function startReplayAnimation() {
    const holder = document.getElementById('artifact-canvas-holder');
    if (!holder) return;

    const animCanvas = document.createElement('canvas');
    animCanvas.width = 760;
    animCanvas.height = 1000;
    animCanvas.className = 'artifact-image-preview';
    holder.innerHTML = '';
    holder.appendChild(animCanvas);

    const total = (gameState.matchShots || []).length;
    let step = 0;

    const animCtx = animCanvas.getContext('2d');

    const tick = () => {
      step++;
      const frameCanvas = renderMatchArtifactCanvas({
        filter: currentFilter,
        maxShotIndex: step
      });
      animCtx.clearRect(0, 0, 760, 1000);
      animCtx.drawImage(frameCanvas, 0, 0);

      if (step <= total) {
        animationFrameId = setTimeout(tick, 90);
      } else {
        // Animation finished, restore image & download link
        const finalDataUrl = animCanvas.toDataURL('image/png');
        const downloadLink = document.getElementById('artifact-download-link');
        if (downloadLink) {
          downloadLink.href = finalDataUrl;
        }
      }
    };

    tick();
  }

  if (t) t.textContent = 'MATCH ARTIFACT';
  if (closeBtn) {
    closeBtn.textContent = 'CLOSE';
    closeBtn.onclick = () => {
      if (animationFrameId) clearTimeout(animationFrameId);
      overlay.style.display = 'none';
    };
  }

  renderModalContent();
  overlay.style.display = 'flex';
}
