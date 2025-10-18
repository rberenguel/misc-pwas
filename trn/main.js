(async () => {
    // --- Game Configuration ---
    const PLAYER_SPEED = 4.6;
    const TURN_SPEED = 0.05;
    const TRAIL_WIDTH = 6;
    const GRID_SIZE = 50;
    const PLAYER_COLLISION_GRACE_PERIOD = 15;
    const WORLD_BOUNDS = 1500;

    const PLAYER_COLOR = 0x00FFFF; // Cyan
    const TRAIL_COLOR = 0x00FFFF;

    const ENEMY_COLOR = 0xFF8000; // Orange
    const ENEMY_TRAIL_COLOR = 0xFF8000;

    const GRID_COLOR = 0x40406a;

    // --- New Feature Configuration ---
    const GRIND_BOOST_MULTIPLIER = 1.2;
    const GRIND_MAX_DISTANCE = 25;
    const GRIND_ANGLE_THRESHOLD = Math.cos(Math.PI * (10 / 180));
    const GRIND_PARTICLE_COLOR = 0xFFFF00;
    const SCREEN_SHAKE_AMOUNT = 2;
    const GRIND_PARTICLE_COUNT = 3;

    const POWERUP_SPAWN_INTERVAL = 10000; // ms
    const POWERUP_SIZE = 12;
    const POWERUP_S_BOOST = 1.1;
    const POWERUP_S_DURATION = 5 * 60; // 5 seconds in frames
    const POWERUP_T_BOOST = 3.0;
    const POWERUP_T_DURATION = 0.5 * 60;
    const POWERUP_S_COLOR = 0x00FF00;
    const POWERUP_T_COLOR = 0xFF00FF;
    
    const PARTICLE_LIFETIME = 40; // frames
    const EXPLOSION_PARTICLE_COUNT = 150;
    const BOOST_SPEED_PARTICLE_COUNT = 1;
    const BOOST_TURBO_PARTICLE_COUNT = 4;

    // --- AI Configuration ---
    const AI_WHISKER_ANGLES = [-Math.PI / 3, -Math.PI / 6, 0, Math.PI / 6, Math.PI / 3];
    const AI_UPDATE_INTERVAL = 5;
    const AI_TRAIL_HISTORY = 400;

    // --- UI Configuration ---
    const MINIMAP_SIZE = 180;
    const MINIMAP_PADDING = 20;

    // --- PIXI App Setup ---
    const app = new PIXI.Application();
    await app.init({
        resizeTo: window,
        backgroundColor: 0x05050a,
        antialias: true,
    });
    document.body.appendChild(app.view);

    // --- Game Objects ---
    const world = new PIXI.Container();
    app.stage.addChild(world);
    const grid = new PIXI.Graphics();
    world.addChild(grid);
    const trailGraphics = new PIXI.Graphics();
    world.addChild(trailGraphics);
    const enemyTrailGraphics = new PIXI.Graphics();
    world.addChild(enemyTrailGraphics);
    const particleContainer = new PIXI.Container();
    world.addChild(particleContainer);
    const powerupContainer = new PIXI.Container();
    world.addChild(powerupContainer);
    const playerSprite = new PIXI.Graphics();
    world.addChild(playerSprite);
    const enemySprite = new PIXI.Graphics();
    world.addChild(enemySprite);
    
    // --- UI Objects ---
    let enemyIndicator, gameOverUI, powerupIndicator;
    let gameOverTitle, gameOverSubtitle;
    let minimapContainer, minimapTrails, minimapPlayer, minimapEnemy;

    // --- Game State ---
    let player, enemy;
    let trailPoints, enemyTrailPoints;
    let turning, keys = {};
    let gameState;
    let particles = [];
    let powerups = [];
    let powerupInterval;
    let vignetteElement;

    function setupBike(sprite, color) {
        const triangleHeight = TRAIL_WIDTH * 1.8;
        const triangleHalfBase = TRAIL_WIDTH / 2;
        sprite.clear();
        sprite.beginFill(color);
        sprite.drawPolygon([
            new PIXI.Point(0, -triangleHeight / 2),
            new PIXI.Point(-triangleHalfBase, triangleHeight / 2),
            new PIXI.Point(triangleHalfBase, triangleHeight / 2)
        ]);
        sprite.endFill();
        sprite.tint = 0xFFFFFF;
    }

    function setupEnemyIndicator() {
        enemyIndicator = new PIXI.Graphics();
        enemyIndicator.beginFill(ENEMY_COLOR);
        enemyIndicator.drawCircle(0, 0, 10);
        enemyIndicator.endFill();
        app.stage.addChild(enemyIndicator);
    }
    
    function setupGameOverUI() {
        gameOverUI = new PIXI.Container();
        gameOverTitle = new PIXI.Text({text: '', style: new PIXI.TextStyle({
            fontFamily: 'Inter', fontSize: 64, fontWeight: 'bold', fill: 0xFFFFFF,
            stroke: { color: 0x000000, width: 5 }, align: 'center'
        })});
        gameOverTitle.anchor.set(0.5);
        gameOverSubtitle = new PIXI.Text({text: '', style: new PIXI.TextStyle({
            fontFamily: 'Inter', fontSize: 24, fill: 0xCCCCCC, align: 'center'
        })});
        gameOverSubtitle.anchor.set(0.5);
        gameOverSubtitle.y = 60;
        gameOverUI.addChild(gameOverTitle);
        gameOverUI.addChild(gameOverSubtitle);
        gameOverUI.visible = false;
        app.stage.addChild(gameOverUI);
    }

    function showGameOverUI(playerWon) {
        gameOverTitle.text = playerWon ? 'YOU WIN!' : 'YOU LOSE';
        gameOverTitle.style.fill = playerWon ? PLAYER_COLOR : ENEMY_COLOR;
        gameOverSubtitle.text = 'Tap to Restart';
        const bounds = gameOverUI.getBounds();
        gameOverUI.hitArea = new PIXI.Rectangle(bounds.x - gameOverUI.x, bounds.y - gameOverUI.y, bounds.width, bounds.height);
        gameOverUI.eventMode = 'static';
        gameOverUI.cursor = 'pointer';
        gameOverUI.on('pointerdown', restartGame, this);
        gameOverUI.visible = true;
    }
    
    function setupPowerupUI() {
        powerupIndicator = new PIXI.Container();
        powerupIndicator.visible = false;
        app.stage.addChild(powerupIndicator);
    }
    
    function updatePowerupUI() {
        powerupIndicator.removeChildren();
        if (!player.powerup) {
            powerupIndicator.visible = false;
            return;
        }
        powerupIndicator.visible = true;
        const type = player.powerup;
        const color = type === 'S' ? POWERUP_S_COLOR : POWERUP_T_COLOR;
        const bg = new PIXI.Graphics();
        bg.beginFill(0x101010, 0.8);
        bg.lineStyle(3, color);
        bg.drawCircle(0, 0, POWERUP_SIZE * 1.5);
        bg.endFill();
        const text = new PIXI.Text({text: type, style: new PIXI.TextStyle({
            fontFamily: 'Inter', fontSize: 20, fontWeight: 'bold', fill: color
        })});
        text.anchor.set(0.5);
        powerupIndicator.addChild(bg);
        powerupIndicator.addChild(text);
    }
    
    function setupMinimap() {
        minimapContainer = new PIXI.Container();
        const bg = new PIXI.Graphics();
        bg.beginFill(0x000000, 0.3);
        bg.lineStyle(1, 0x30304a);
        bg.drawRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);
        bg.endFill();
        minimapContainer.addChild(bg);

        minimapTrails = new PIXI.Graphics();
        minimapContainer.addChild(minimapTrails);

        minimapPlayer = new PIXI.Graphics();
        minimapPlayer.beginFill(PLAYER_COLOR);
        minimapPlayer.drawRect(-2, -2, 4, 4);
        minimapPlayer.endFill();
        minimapContainer.addChild(minimapPlayer);
        
        minimapEnemy = new PIXI.Graphics();
        minimapEnemy.beginFill(ENEMY_COLOR);
        minimapEnemy.drawRect(-2, -2, 4, 4);
        minimapEnemy.endFill();
        minimapContainer.addChild(minimapEnemy);
        
        app.stage.addChild(minimapContainer);
    }
    
    function updateMinimap() {
        const scale = MINIMAP_SIZE / (WORLD_BOUNDS * 2);
        const transformX = (worldX) => (worldX + WORLD_BOUNDS) * scale;
        const transformY = (worldY) => (worldY + WORLD_BOUNDS) * scale;
        minimapTrails.clear();

        if (trailPoints.length > 1) {
            minimapTrails.moveTo(transformX(trailPoints[0].x), transformY(trailPoints[0].y));
            for (let i = 1; i < trailPoints.length; i++) {
                minimapTrails.lineTo(transformX(trailPoints[i].x), transformY(trailPoints[i].y));
            }
            minimapTrails.stroke({ width: 1.5, color: PLAYER_COLOR });
        }
        
        if (enemyTrailPoints.length > 1) {
            minimapTrails.moveTo(transformX(enemyTrailPoints[0].x), transformY(enemyTrailPoints[0].y));
            for (let i = 1; i < enemyTrailPoints.length; i++) {
                minimapTrails.lineTo(transformX(enemyTrailPoints[i].x), transformY(enemyTrailPoints[i].y));
            }
            minimapTrails.stroke({ width: 1.5, color: ENEMY_COLOR });
        }

        minimapPlayer.x = transformX(player.x);
        minimapPlayer.y = transformY(player.y);
        minimapEnemy.x = transformX(enemy.x);
        minimapEnemy.y = transformY(enemy.y);
    }

    function repositionUI() {
        gameOverUI.x = app.screen.width / 2;
        gameOverUI.y = app.screen.height / 2;
        powerupIndicator.x = 30;
        powerupIndicator.y = app.screen.height - 50;
        if (minimapContainer) {
            minimapContainer.x = app.screen.width - MINIMAP_SIZE - MINIMAP_PADDING;
            minimapContainer.y = app.screen.height - MINIMAP_SIZE - MINIMAP_PADDING;
        }
    }

    function spawnPowerup() {
        const type = Math.random() < 0.5 ? 'S' : 'T';
        const color = type === 'S' ? POWERUP_S_COLOR : POWERUP_T_COLOR;
        const powerup = new PIXI.Container();
        const bg = new PIXI.Graphics();
        bg.beginFill(0x101010);
        bg.lineStyle(2, color);
        bg.drawCircle(0, 0, POWERUP_SIZE);
        bg.endFill();
        const text = new PIXI.Text({text: type, style: new PIXI.TextStyle({
            fontFamily: 'Inter', fontSize: 14, fontWeight: 'bold', fill: color
        })});
        text.anchor.set(0.5);
        powerup.addChild(bg);
        powerup.addChild(text);
        powerup.x = (Math.random() - 0.5) * WORLD_BOUNDS * 1.8;
        powerup.y = (Math.random() - 0.5) * WORLD_BOUNDS * 1.8;
        powerup.type = type;
        powerups.push(powerup);
        powerupContainer.addChild(powerup);
    }

    function restartGame() {
        player = { x: 0, y: 0, angle: 0, isGrinding: false, speedBoost: null, powerup: null };
        enemy = { x: 200, y: 0, angle: Math.PI, turning: 0, aiUpdateCooldown: 0, isGrinding: false, speedBoost: null, powerup: null };
        playerSprite.alpha = 1;
        enemySprite.alpha = 1;
        trailPoints = [new PIXI.Point(player.x, player.y)];
        enemyTrailPoints = [new PIXI.Point(enemy.x, enemy.y)];
        turning = 0;
        keys = {};
        gameState = 'playing';
        vignetteElement = document.getElementById('grind-vignette');
        vignetteElement.classList.remove('grind', 'speed', 'turbo', 'active');
        trailGraphics.clear();
        enemyTrailGraphics.clear();
        particleContainer.removeChildren();
        particles = [];
        powerupContainer.removeChildren();
        powerups = [];
        if (powerupInterval) clearInterval(powerupInterval);
        spawnPowerup();
        powerupInterval = setInterval(spawnPowerup, POWERUP_SPAWN_INTERVAL);
        enemyIndicator.visible = true;
        gameOverUI.visible = false;
        gameOverUI.eventMode = 'none';
        gameOverUI.off('pointerdown', restartGame);

        updatePowerupUI();
        setupBike(playerSprite, PLAYER_COLOR);
        setupBike(enemySprite, ENEMY_COLOR);
    }

    app.stage.eventMode = 'static';
    app.stage.hitArea = app.screen;
    app.stage.on('pointerdown', (event) => {
        if (gameState === 'playing') {
            if (event.global.x < window.innerWidth / 3) keys['touchLeft'] = true;
            else if (event.global.x > window.innerWidth * 2 / 3) keys['touchRight'] = true;
            else keys['touchCenter'] = true;
        }
    });
    app.stage.on('pointerup', () => { keys['touchLeft'] = false; keys['touchRight'] = false; keys['touchCenter'] = false; });
    app.stage.on('pointerupoutside', () => { keys['touchLeft'] = false; keys['touchRight'] = false; keys['touchCenter'] = false; });
    window.addEventListener('keydown', (e) => { 
        keys[e.code] = true;
        if (gameState === 'gameOver' && e.code === 'Space') restartGame();
    });
    window.addEventListener('keyup', (e) => { keys[e.code] = false; });

    function drawGrid() {
        grid.clear();
        const worldDrawSize = WORLD_BOUNDS;
        for (let i = -worldDrawSize; i <= worldDrawSize; i += GRID_SIZE) {
            grid.moveTo(i, -worldDrawSize).lineTo(i, worldDrawSize);
            grid.moveTo(-worldDrawSize, i).lineTo(worldDrawSize, i);
        }
        grid.stroke({ width: 1, color: GRID_COLOR });
    }

    function drawTrails() {
        trailGraphics.clear();
        trailGraphics.moveTo(trailPoints[0].x, trailPoints[0].y);
        for (let i = 1; i < trailPoints.length; i++) trailGraphics.lineTo(trailPoints[i].x, trailPoints[i].y);
        trailGraphics.stroke({width: TRAIL_WIDTH, color: TRAIL_COLOR, cap: 'round', join: 'round'});
        enemyTrailGraphics.clear();
        enemyTrailGraphics.moveTo(enemyTrailPoints[0].x, enemyTrailPoints[0].y);
        for (let i = 1; i < enemyTrailPoints.length; i++) enemyTrailGraphics.lineTo(enemyTrailPoints[i].x, enemyTrailPoints[i].y);
        enemyTrailGraphics.stroke({width: TRAIL_WIDTH, color: ENEMY_TRAIL_COLOR, cap: 'round', join: 'round'});
    }
    
    function createExplosion(x, y, color) {
        for (let i = 0; i < EXPLOSION_PARTICLE_COUNT; i++) {
            const particle = new PIXI.Graphics();
            particle.beginFill(color);
            particle.drawCircle(0, 0, Math.random() * 2 + 1);
            particle.endFill();
            particle.x = x;
            particle.y = y;
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 5 + 2;
            particles.push({
                sprite: particle,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: PARTICLE_LIFETIME * (Math.random() * 0.5 + 0.5),
                initialLife: PARTICLE_LIFETIME,
            });
            particleContainer.addChild(particle);
        }
    }
    
    function emitBoostParticle(bike) {
        if (!bike.speedBoost) return;
        const isTurbo = bike.speedBoost.multiplier === POWERUP_T_BOOST;
        const color = isTurbo ? POWERUP_T_COLOR : POWERUP_S_COLOR;
        const particleCount = isTurbo ? BOOST_TURBO_PARTICLE_COUNT : BOOST_SPEED_PARTICLE_COUNT;
        for (let i = 0; i < particleCount; i++) {
            const particle = new PIXI.Graphics();
            particle.beginFill(color);
            particle.drawCircle(0, 0, Math.random() * 1.5 + 1);
            particle.endFill();
            const backOffset = TRAIL_WIDTH * 1.5;
            particle.x = bike.x - Math.sin(bike.angle) * backOffset;
            particle.y = bike.y + Math.cos(bike.angle) * backOffset;
            const angle = bike.angle + (Math.random() - 0.5) * (Math.PI / 4);
            const speed = (isTurbo ? 4 : 2) + Math.random();
            particles.push({
                sprite: particle,
                vx: -Math.sin(angle) * speed,
                vy: Math.cos(angle) * speed,
                life: PARTICLE_LIFETIME / 3,
                initialLife: PARTICLE_LIFETIME / 3
            });
            particleContainer.addChild(particle);
        }
    }

    function emitGrindParticle(bike, side) {
        for (let i = 0; i < GRIND_PARTICLE_COUNT; i++) {
            const perpAngle = bike.angle + (side === 'left' ? Math.PI / 2 : -Math.PI / 2);
            const particle = new PIXI.Graphics();
            particle.beginFill(GRIND_PARTICLE_COLOR);
            particle.drawCircle(0, 0, Math.random() * 1.5 + 0.5);
            particle.endFill();
            particle.x = bike.x + Math.sin(perpAngle) * TRAIL_WIDTH / 2;
            particle.y = bike.y - Math.cos(perpAngle) * TRAIL_WIDTH / 2;
            particles.push({
                sprite: particle,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                life: PARTICLE_LIFETIME / 2,
                initialLife: PARTICLE_LIFETIME / 2
            });
            particleContainer.addChild(particle);
        }
    }
    
    function updateParticles(delta) {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.life -= delta;
            if (p.life <= 0) {
                particleContainer.removeChild(p.sprite);
                p.sprite.destroy();
                particles.splice(i, 1);
            } else {
                p.sprite.x += p.vx * delta;
                p.sprite.y += p.vy * delta;
                p.sprite.alpha = p.life / p.initialLife;
            }
        }
    }

    function checkWallGrind(bike, allTrails) {
        bike.isGrinding = false;
        const bikeDirX = Math.sin(bike.angle);
        const bikeDirY = -Math.cos(bike.angle);
        for (const trail of allTrails) {
            for (let i = trail.length - 2; i >= 0; i--) {
                const p1 = trail[i];
                const p2 = trail[i+1];
                const segX = p2.x - p1.x;
                const segY = p2.y - p1.y;
                const bikeToP1X = p1.x - bike.x;
                const bikeToP1Y = p1.y - bike.y;
                const segLenSq = segX * segX + segY * segY;
                if (segLenSq < 1) continue;
                const t = Math.max(0, Math.min(1, (-bikeToP1X * segX - bikeToP1Y * segY) / segLenSq));
                const closestX = p1.x + t * segX;
                const closestY = p1.y + t * segY;
                const distSq = (bike.x - closestX)**2 + (bike.y - closestY)**2;
                if (distSq > 1 && distSq < GRIND_MAX_DISTANCE**2) {
                    const segLen = Math.sqrt(segLenSq);
                    const trailDirX = segX / segLen;
                    const trailDirY = segY / segLen;
                    const parallelDot = bikeDirX * trailDirX + bikeDirY * trailDirY;
                    if (Math.abs(parallelDot) > GRIND_ANGLE_THRESHOLD) {
                        const vecToClosestX = closestX - bike.x;
                        const vecToClosestY = closestY - bike.y;
                        const dist = Math.sqrt(distSq);
                        const sideDot = (bikeDirX * vecToClosestX + bikeDirY * vecToClosestY) / dist;
                        if (Math.abs(sideDot) < 0.87) { 
                            bike.isGrinding = true;
                            const crossZ = bikeDirX * vecToClosestY - bikeDirY * vecToClosestX;
                            bike.grindingSide = crossZ > 0 ? 'left' : 'right';
                            return;
                        }
                    }
                }
            }
        }
    }
    
    function activatePowerup(bike) {
        if (!bike.powerup) return;
        if (bike.powerup === 'S') {
            bike.speedBoost = { multiplier: POWERUP_S_BOOST, duration: POWERUP_S_DURATION };
        } else if (bike.powerup === 'T') {
            bike.speedBoost = { multiplier: POWERUP_T_BOOST, duration: POWERUP_T_DURATION };
        }
        bike.powerup = null;
        if (bike === player) updatePowerupUI();
    }

    function isClose(obj, point) {
         const dx = obj.x - point.x;
         const dy = obj.y - point.y;
         return (dx * dx + dy * dy) < (TRAIL_WIDTH / 1.5) ** 2;
    }

    function isPointColliding(point, allTrails) {
        if (Math.abs(point.x) > WORLD_BOUNDS || Math.abs(point.y) > WORLD_BOUNDS) {
            return true;
        }
        for(const trailPoint of allTrails) {
            const dx = point.x - trailPoint.x;
            const dy = point.y - trailPoint.y;
            if ((dx * dx + dy * dy) < (TRAIL_WIDTH) ** 2) return true;
        }
        return false;
    }

    function getAIInput() {
        if (enemy.powerup === 'T') activatePowerup(enemy);
        
        const speedMultiplier = (enemy.speedBoost ? enemy.speedBoost.multiplier : 1) * (enemy.isGrinding ? GRIND_BOOST_MULTIPLIER : 1);
        const currentSpeed = PLAYER_SPEED * speedMultiplier;
        
        const turnRadius = currentSpeed / TURN_SPEED;
        const reactionDistance = currentSpeed * AI_UPDATE_INTERVAL;
        const whiskerLength = turnRadius + reactionDistance;

        const relevantPlayerTrail = trailPoints.slice(-AI_TRAIL_HISTORY);
        const relevantEnemyTrail = enemyTrailPoints.slice(-AI_TRAIL_HISTORY, -PLAYER_COLLISION_GRACE_PERIOD);
        const allTrailsForAI = relevantPlayerTrail.concat(relevantEnemyTrail);

        const whiskerPoints = AI_WHISKER_ANGLES.map(angle => ({
            x: enemy.x + Math.sin(enemy.angle + angle) * whiskerLength,
            y: enemy.y - Math.cos(enemy.angle + angle) * whiskerLength
        }));
        
        const blocked = whiskerPoints.map(p => isPointColliding(p, allTrailsForAI));
        const [farLeft, nearLeft, center, nearRight, farRight] = blocked;

        if (center) {
            if (!nearLeft && !farLeft) return -1;
            if (!nearRight && !farRight) return 1;
            return Math.random() > 0.5 ? 1 : -1;
        }
        
        let turn = 0;
        if (nearLeft) turn += 0.5;
        if (farLeft) turn += 0.5;
        if (nearRight) turn -= 0.5;
        if (farRight) turn -= 0.5;
        
        return Math.max(-1, Math.min(1, turn));
    }

    function updateEnemyIndicator() {
        const enemyBounds = enemySprite.getBounds(true);
        const screenBounds = app.screen;
        const isVisibleOnScreen = enemyBounds.x < screenBounds.x + screenBounds.width &&
                                  enemyBounds.x + enemyBounds.width > screenBounds.x &&
                                  enemyBounds.y < screenBounds.y + screenBounds.height &&
                                  enemyBounds.y + enemyBounds.height > screenBounds.y;
        if (isVisibleOnScreen) {
            enemyIndicator.visible = false;
        } else {
            enemyIndicator.visible = true;
            const dx = enemy.x - player.x;
            const dy = enemy.y - player.y;
            const angle = -player.angle;
            const screenDx = dx * Math.cos(angle) - dy * Math.sin(angle);
            const screenDy = dx * Math.sin(angle) + dy * Math.cos(angle);
            const indicatorAngle = Math.atan2(screenDy, screenDx);
            const padding = 25;
            const screenCenterX = app.screen.width / 2;
            const screenCenterY = app.screen.height / 2;
            const halfW = screenCenterX - padding;
            const halfH = screenCenterY - padding;
            const tanAngle = Math.tan(indicatorAngle);
            if (Math.abs(halfH / tanAngle) > halfW) {
                enemyIndicator.x = screenCenterX + halfW * Math.sign(screenDx);
                enemyIndicator.y = screenCenterY + halfW * tanAngle * Math.sign(screenDx);
            } else {
                enemyIndicator.x = screenCenterX + (halfH / tanAngle) * Math.sign(screenDy);
                enemyIndicator.y = screenCenterY + halfH * Math.sign(screenDy);
            }
        }
    }
    
    function updateVignetteAndShake() {
        vignetteElement.classList.remove('grind', 'speed', 'turbo', 'active');
        let isEffectActive = false;

        if (player.isGrinding) {
            isEffectActive = true;
            vignetteElement.classList.add('grind');
        } else if (player.speedBoost) {
            isEffectActive = true;
            const isTurbo = player.speedBoost.multiplier === POWERUP_T_BOOST;
            vignetteElement.classList.add(isTurbo ? 'turbo' : 'speed');
        }

        if (isEffectActive) {
            vignetteElement.classList.add('active');
            world.position.x += (Math.random() - 0.5) * SCREEN_SHAKE_AMOUNT;
            world.position.y += (Math.random() - 0.5) * SCREEN_SHAKE_AMOUNT;
        }
    }

    function endGame(loser, loserColor, loserSprite) {
        if (gameState === 'gameOver') return;
        gameState = 'gameOver';
        createExplosion(loser.x, loser.y, loserColor);
        loserSprite.alpha = 0;
        enemyIndicator.visible = false;
        showGameOverUI(loser === enemy);
        if (powerupInterval) clearInterval(powerupInterval);
    }

    function checkCollisions() {
        if (trailPoints.some(p => isClose(enemy, p))) {
            endGame(enemy, ENEMY_COLOR, enemySprite); return;
        }
        if (enemyTrailPoints.slice(0, -PLAYER_COLLISION_GRACE_PERIOD).some(p => isClose(player, p))) {
            endGame(player, PLAYER_COLOR, playerSprite); return;
        }
        if (trailPoints.slice(0, -PLAYER_COLLISION_GRACE_PERIOD).some(p => isClose(player, p))) {
            endGame(player, PLAYER_COLOR, playerSprite); return;
        }
        if (enemyTrailPoints.slice(0, -PLAYER_COLLISION_GRACE_PERIOD).some(p => isClose(enemy, p))) {
            endGame(enemy, ENEMY_COLOR, enemySprite); return;
        }
        if (Math.abs(player.x) > WORLD_BOUNDS || Math.abs(player.y) > WORLD_BOUNDS) {
            endGame(player, PLAYER_COLOR, playerSprite); return;
        }
        if (Math.abs(enemy.x) > WORLD_BOUNDS || Math.abs(enemy.y) > WORLD_BOUNDS) {
            endGame(enemy, ENEMY_COLOR, enemySprite); return;
        }
    }

    function updatePowerups() {
        for (let i = powerups.length - 1; i >= 0; i--) {
            const p = powerups[i];
            if (!player.powerup && (player.x - p.x)**2 + (player.y - p.y)**2 < (POWERUP_SIZE + TRAIL_WIDTH)**2) {
                 player.powerup = p.type;
                 updatePowerupUI();
                 powerupContainer.removeChild(p);
                 p.destroy();
                 powerups.splice(i, 1);
                 continue;
            }
            if (!enemy.powerup && (enemy.x - p.x)**2 + (enemy.y - p.y)**2 < (POWERUP_SIZE + TRAIL_WIDTH)**2) {
                 enemy.powerup = p.type;
                 powerupContainer.removeChild(p);
                 p.destroy();
                 powerups.splice(i, 1);
            }
        }
    }

    app.ticker.add((ticker) => {
        const delta = ticker.deltaTime;
        if (gameState !== 'playing') {
            updateParticles(delta);
            return;
        }
        const left = keys['ArrowLeft'] || keys['KeyA'] || keys['touchLeft'];
        const right = keys['ArrowRight'] || keys['KeyD'] || keys['touchRight'];
        turning = (right ? 1 : 0) - (left ? 1 : 0);
        if (keys['Space'] || keys['touchCenter']) {
            activatePowerup(player);
            keys['touchCenter'] = false;
            keys['Space'] = false;
        }
        [player, enemy].forEach((bike, index) => {
            if (bike.speedBoost) {
                bike.speedBoost.duration -= delta;
                if (bike.speedBoost.duration <= 0) bike.speedBoost = null;
            }
            const trailsToCheck = index === 0 ? [enemyTrailPoints.slice(-AI_TRAIL_HISTORY), trailPoints.slice(-AI_TRAIL_HISTORY, -PLAYER_COLLISION_GRACE_PERIOD)] : [trailPoints.slice(-AI_TRAIL_HISTORY), enemyTrailPoints.slice(-AI_TRAIL_HISTORY, -PLAYER_COLLISION_GRACE_PERIOD)];
            checkWallGrind(bike, trailsToCheck);
            if (bike.isGrinding) emitGrindParticle(bike, bike.grindingSide);
            emitBoostParticle(bike);
            const speedMultiplier = (bike.speedBoost ? bike.speedBoost.multiplier : 1) * (bike.isGrinding ? GRIND_BOOST_MULTIPLIER : 1);
            if (index === 0) {
                if (turning !== 0) bike.angle += turning * TURN_SPEED * delta;
            } else {
                bike.aiUpdateCooldown -= delta;
                if (bike.aiUpdateCooldown <= 0) {
                    bike.turning = getAIInput();
                    bike.aiUpdateCooldown = AI_UPDATE_INTERVAL;
                }
                if (bike.turning !== 0) bike.angle += bike.turning * TURN_SPEED * delta;
            }
            bike.x += Math.sin(bike.angle) * PLAYER_SPEED * speedMultiplier * delta;
            bike.y -= Math.cos(bike.angle) * PLAYER_SPEED * speedMultiplier * delta;
        });
        if (((player.x - trailPoints.at(-1).x)**2 + (player.y - trailPoints.at(-1).y)**2) > (TRAIL_WIDTH/2)**2) {
            trailPoints.push(new PIXI.Point(player.x, player.y));
        }
        if (((enemy.x - enemyTrailPoints.at(-1).x)**2 + (enemy.y - enemyTrailPoints.at(-1).y)**2) > (TRAIL_WIDTH/2)**2) {
            enemyTrailPoints.push(new PIXI.Point(enemy.x, enemy.y));
        }
        checkCollisions();
        if (gameState !== 'playing') return;
        updatePowerups();
        playerSprite.position.set(player.x, player.y);
        playerSprite.rotation = player.angle;
        playerSprite.tint = player.isGrinding ? 0xFFFF00 : 0xFFFFFF;
        enemySprite.position.set(enemy.x, enemy.y);
        enemySprite.rotation = enemy.angle;
        enemySprite.tint = enemy.isGrinding ? 0xFFFF00 : 0xFFFFFF;
        world.pivot.set(player.x, player.y);
        world.position.set(app.screen.width / 2, app.screen.height * 0.9);
        updateVignetteAndShake();
        world.rotation = -player.angle;
        drawTrails();
        updateParticles(delta);
        updateEnemyIndicator();
        updateMinimap();
    });

    drawGrid();
    setupEnemyIndicator();
    setupGameOverUI();
    setupPowerupUI();
    setupMinimap();
    window.addEventListener('resize', repositionUI);
    repositionUI();
    restartGame();
})();