(async () => {
    // --- Game Configuration ---
    const PLAYER_SPEED = 4.6;
    const PLAYER_TRAIL_HISTORY = Infinity;
    const TURN_SPEED = 0.05;
    const TRAIL_WIDTH = 6;
    const GRID_SIZE = 50;
    const COLLISION_GRACE_DISTANCE = 30;
    const WORLD_BOUNDS = 1500;
    const SEGMENTFADE_DELTA = 0.01

    const DOTS_PER_LEVEL = 5;
    const DOT_SIZE = 10;
    const DOT_PICKUP_RADIUS = 30;
    const DOT_COLOR = 0xFFFFFF;

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

    const POWERUP_SPAWN_INTERVAL = 15000; // ms
    const POWERUP_SIZE = 12;
    const POWERUP_S_BOOST = 1.3;
    const POWERUP_S_DURATION = 5 * 60;
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
    const AI_UPDATE_INTERVAL = 2;
    const AI_TRAIL_HISTORY = Infinity;
    const AI_WHISKER_SAFETY_MULTIPLIER = 1.2;
    const AI_WALL_AVOID_DISTANCE = 250;
    const AI_WALL_AVOID_STRENGTH = 2.0;
    const ENEMY_RESPAWN_DELAY = 3000; // ms

    // --- UI Configuration ---
    const MINIMAP_SIZE = 180;
    const MINIMAP_PADDING = 20;
    const UI_PADDING = 20;
    const FADE_DURATION = 30; // frames
    const PAUSE_AREA_HEIGHT = 80; // pixels from the top

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
    const dotContainer = new PIXI.Container();
    world.addChild(dotContainer);
    const playerSprite = new PIXI.Graphics();
    world.addChild(playerSprite);
    
    // --- UI Objects ---
    let enemyIndicator, gameOverUI, powerupIndicator, scoreText, levelText, screenFade, splashScreenElement;
    let gameOverTitle, gameOverSubtitle;
    let minimapContainer, minimapTrails, minimapPlayer, minimapEnemies, minimapPowerups, minimapDots;
    let pauseOverlay;

    // --- Game State ---
    let player, enemies = [];
    let trailPoints, enemyTrails = [];
    let turning, keys = {};
    let gameState = 'splash', playerScore, currentLevel;
    let particles = [];
    let powerups = [];
    let dots = [];
    let fadingTrails = [];
    let powerupInterval;
    let vignetteElement;
    let transitionTimer = 0;
    let activeTouches = 0;

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
            fontFamily: 'Sixtyfour', fontSize: 64, fontWeight: 'bold', fill: 0xFFFFFF,
            stroke: { color: 0x000000, width: 5 }, align: 'center'
        })});
        gameOverTitle.anchor.set(0.5);
        gameOverSubtitle = new PIXI.Text({text: '', style: new PIXI.TextStyle({
            fontFamily: 'Sixtyfour', fontSize: 24, fill: 0xCCCCCC, align: 'center'
        })});
        gameOverSubtitle.anchor.set(0.5);
        gameOverSubtitle.y = 60;
        levelText = new PIXI.Text({text: '', style: new PIXI.TextStyle({
            fontFamily: 'Sixtyfour', fontSize: 28, fontWeight: 'bold', fill: 0xCCCCCC, align: 'center'
        })});
        levelText.anchor.set(0.5);
        levelText.y = -60;
        gameOverUI.addChild(gameOverTitle, gameOverSubtitle, levelText);
        gameOverUI.visible = false;
        app.stage.addChild(gameOverUI);
    }
    
    function setupScoreUI() {
        scoreText = new PIXI.Text({text: '', style: new PIXI.TextStyle({
            fontFamily: 'Sixtyfour', fontSize: 32, fontWeight: 'bold', fill: 0xFFFFFF,
            align: 'right', stroke: {color: 0x000000, width: 4}
        })});
        scoreText.anchor.set(1, 0);
        app.stage.addChild(scoreText);
    }
    
    function updateScoreUI() {
        scoreText.text = `${playerScore} / ${DOTS_PER_LEVEL}`;
    }

    function showGameOverUI() {
        gameOverTitle.text = 'GAME OVER';
        gameOverTitle.style.fill = ENEMY_COLOR;
        levelText.text = `You reached level ${currentLevel}`;
        gameOverSubtitle.text = 'Tap to Restart';
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
            fontFamily: 'Sixtyfour', fontSize: 20, fontWeight: 'bold', fill: color
        })});
        text.anchor.set(0.5);
        powerupIndicator.addChild(bg, text);
    }
    
    function setupMinimap() {
        minimapContainer = new PIXI.Container();
        const bg = new PIXI.Graphics();
        bg.beginFill(0x010101);
        bg.lineStyle(1, 0x30304a);
        bg.drawRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);
        bg.endFill();
        minimapContainer.addChild(bg);
        
        minimapDots = new PIXI.Graphics();
        minimapContainer.addChild(minimapDots);
        minimapPowerups = new PIXI.Graphics();
        minimapContainer.addChild(minimapPowerups);
        minimapTrails = new PIXI.Graphics();
        minimapContainer.addChild(minimapTrails);
        minimapPlayer = new PIXI.Graphics();
        minimapPlayer.beginFill(PLAYER_COLOR);
        minimapPlayer.drawRect(-2, -2, 4, 4);
        minimapPlayer.endFill();
        minimapContainer.addChild(minimapPlayer);
        minimapEnemies = new PIXI.Container();
        minimapContainer.addChild(minimapEnemies);
        
        app.stage.addChild(minimapContainer);
    }
    
    function updateMinimap() {
        const scale = MINIMAP_SIZE / (WORLD_BOUNDS * 2);
        const transformX = (worldX) => (worldX + WORLD_BOUNDS) * scale;
        const transformY = (worldY) => (worldY + WORLD_BOUNDS) * scale;
        minimapTrails.clear();

        if (trailPoints.length > 1) {
            minimapTrails.moveTo(transformX(trailPoints[0].x), transformY(trailPoints[0].y));
            for (let i = 1; i < trailPoints.length; i++) minimapTrails.lineTo(transformX(trailPoints[i].x), transformY(trailPoints[i].y));
            minimapTrails.stroke({ width: 1.5, color: PLAYER_COLOR });
        }
        
        const allEnemyTrails = [...enemyTrails, ...fadingTrails];
        allEnemyTrails.forEach(trail => {
            if (trail && trail.length > 1) {
                minimapTrails.moveTo(transformX(trail[0].x), transformY(trail[0].y));
                for (let j = 1; j < trail.length; j++) {
                    minimapTrails.lineTo(transformX(trail[j].x), transformY(trail[j].y));
                }
                minimapTrails.stroke({ width: 1.5, color: ENEMY_COLOR });
            }
        });

        minimapPowerups.clear();
        for (const p of powerups) {
            const color = p.type === 'S' ? POWERUP_S_COLOR : POWERUP_T_COLOR;
            minimapPowerups.beginFill(color);
            minimapPowerups.drawCircle(transformX(p.x), transformY(p.y), 2.5);
            minimapPowerups.endFill();
        }
        
        minimapDots.clear();
        for (const d of dots) {
            minimapDots.beginFill(DOT_COLOR);
            minimapDots.drawCircle(transformX(d.x), transformY(d.y), 2.0);
            minimapDots.endFill();
        }

        minimapPlayer.x = transformX(player.x);
        minimapPlayer.y = transformY(player.y);
        
        minimapEnemies.children.forEach(c => c.visible = false);
        enemies.forEach((enemy, i) => {
             if (enemy) {
                const sprite = minimapEnemies.children[i];
                if (sprite) {
                    sprite.x = transformX(enemy.x);
                    sprite.y = transformY(enemy.y);
                    sprite.visible = true;
                }
            }
        });
    }

    function repositionUI() {
        gameOverUI.x = app.screen.width / 2;
        gameOverUI.y = app.screen.height / 2;
        powerupIndicator.x = 30;
        powerupIndicator.y = app.screen.height - 50;
        scoreText.x = app.screen.width - UI_PADDING;
        scoreText.y = UI_PADDING;
        if (screenFade) {
            screenFade.width = app.screen.width;
            screenFade.height = app.screen.height;
        }
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
            fontFamily: 'Sixtyfour', fontSize: 14, fontWeight: 'bold', fill: color
        })});
        text.anchor.set(0.5);
        powerup.addChild(bg, text);
        powerup.x = (Math.random() - 0.5) * WORLD_BOUNDS * 1.8;
        powerup.y = (Math.random() - 0.5) * WORLD_BOUNDS * 1.8;
        powerup.type = type;
        powerups.push(powerup);
        powerupContainer.addChild(powerup);
    }
    
    function spawnDot() {
        const dot = new PIXI.Container();
        const g = new PIXI.Graphics();
        g.beginFill(DOT_COLOR);
        g.drawCircle(0, 0, DOT_SIZE);
        g.endFill();
        
        const text = new PIXI.Text({text: '!', style: new PIXI.TextStyle({
            fontFamily: 'Sixtyfour',
            fontSize: 14,
            fill: 0x000000,
            fontWeight: 'bold'
        })});
        text.anchor.set(0.5);

        dot.addChild(g, text);
        
        do {
            dot.x = (Math.random() - 0.5) * WORLD_BOUNDS * 1.8;
            dot.y = (Math.random() - 0.5) * WORLD_BOUNDS * 1.8;
        } while (dot.x**2 + dot.y**2 < (DOT_PICKUP_RADIUS * 3)**2);

        dots.push(dot);
        dotContainer.addChild(dot);
    }
    
    function spawnSingleEnemy() {
        if (gameState !== 'playing' && gameState !== 'levelTransition') return;
        
        const enemySprite = new PIXI.Graphics();
        setupBike(enemySprite, ENEMY_COLOR);
        world.addChild(enemySprite);

        const startPos = {
            x: (Math.random() - 0.5) * WORLD_BOUNDS,
            y: (Math.random() - 0.5) * WORLD_BOUNDS
        };

        const enemy = {
            x: startPos.x, y: startPos.y, angle: Math.random() * Math.PI * 2,
            turning: 0, aiUpdateCooldown: 0, isGrinding: false,
            speedBoost: null, powerup: null, aiTurnBias: 0,
            aiBiasCooldown: Math.random() * 120, sprite: enemySprite
        };
        enemies.push(enemy);
        enemyTrails.push([new PIXI.Point(startPos.x, startPos.y)]);

        const minimapSprite = new PIXI.Graphics();
        minimapSprite.beginFill(ENEMY_COLOR);
        minimapSprite.drawRect(-2, -2, 4, 4);
        minimapSprite.endFill();
        minimapEnemies.addChild(minimapSprite);
    }

    function startLevel(levelNum) {
        player = { x: 0, y: 0, angle: 0, isGrinding: false, speedBoost: null, powerup: null };
        player.sprite = playerSprite;
        playerSprite.alpha = 1;
        world.addChild(playerSprite);

        trailPoints = [new PIXI.Point(player.x, player.y)];
        turning = 0;
        playerScore = 0;
        updateScoreUI();
        
        dotContainer.removeChildren();
        dots = [];
        for (let i = 0; i < DOTS_PER_LEVEL; i++) spawnDot();

        enemies.forEach(e => e.sprite.destroy());
        enemies = [];
        enemyTrails = [];
        minimapEnemies.removeChildren();
        trailGraphics.clear();
        enemyTrailGraphics.clear();

        for (let i = 0; i < levelNum; i++) {
             const enemySprite = new PIXI.Graphics();
            setupBike(enemySprite, ENEMY_COLOR);
            world.addChild(enemySprite);

            const startPos = {
                x: (Math.random() - 0.5) * WORLD_BOUNDS,
                y: (Math.random() - 0.5) * WORLD_BOUNDS
            };

            const enemy = {
                x: startPos.x, y: startPos.y, angle: Math.random() * Math.PI * 2,
                turning: 0, aiUpdateCooldown: 0, isGrinding: false,
                speedBoost: null, powerup: null, aiTurnBias: 0,
                aiBiasCooldown: Math.random() * 120, sprite: enemySprite
            };
            enemies.push(enemy);
            enemyTrails.push([new PIXI.Point(startPos.x, startPos.y)]);
            
            const minimapSprite = new PIXI.Graphics();
            minimapSprite.beginFill(ENEMY_COLOR);
            minimapSprite.drawRect(-2, -2, 4, 4);
            minimapSprite.endFill();
            minimapEnemies.addChild(minimapSprite);
        }

        if(levelNum === 1) gameState = 'playing';
        updatePowerupUI();
    }
    
    function startGame() {
        if (gameState !== 'splash') return;
        
        splashScreenElement.style.display = 'none';

        currentLevel = 1;
        keys = {};
        activeTouches = 0;
        fadingTrails = [];
        vignetteElement = document.getElementById('grind-vignette');
        vignetteElement.classList.remove('grind', 'speed', 'turbo', 'active');
        particleContainer.removeChildren();
        particles = [];
        powerupContainer.removeChildren();
        powerups = [];
        if (powerupInterval) clearInterval(powerupInterval);
        spawnPowerup();
        powerupInterval = setInterval(spawnPowerup, POWERUP_SPAWN_INTERVAL);
        enemyIndicator.visible = true;
        gameOverUI.visible = false;
        
        if (pauseOverlay.style.display === 'flex') {
            togglePause();
        }

        setupBike(playerSprite, PLAYER_COLOR);
        startLevel(currentLevel);
    }
    
    function restartGame() {
        gameState = 'splash';
        splashScreenElement.style.display = 'flex';
        gameOverUI.visible = false;
    }
    
    function nextLevel() {
        gameState = 'levelTransition';
        transitionTimer = FADE_DURATION;
    }
    
    function togglePause() {
        if (gameState === 'gameOver' || gameState === 'levelTransition' || gameState === 'splash') return;
        
        if (gameState === 'paused') {
            gameState = 'playing';
            pauseOverlay.style.display = 'none';
        } else {
            gameState = 'paused';
            pauseOverlay.style.display = 'flex';
        }
    }
    
    function handlePowerupActivation() {
        if (keys['Space'] || (keys['touchLeft'] && keys['touchRight'])) {
            activatePowerup(player);
            keys['Space'] = false; // Consume the key press
        }
    }

    app.stage.eventMode = 'static';
    app.stage.hitArea = app.screen;
    app.stage.on('pointerdown', (event) => {
        if (gameState === 'paused') {
            togglePause();
            return;
        }
        if (gameState === 'gameOver') {
            restartGame();
            return;
        }

        if (event.global.y < PAUSE_AREA_HEIGHT && activeTouches === 0) {
            togglePause();
            return;
        }

        if (gameState === 'playing') {
            activeTouches++;
            if (event.global.x < window.innerWidth / 2) keys['touchLeft'] = true;
            else keys['touchRight'] = true;
        }
    });

    app.stage.on('pointerup', (event) => {
        activeTouches = Math.max(0, activeTouches - 1);
        if (event.global.x < window.innerWidth / 2) keys['touchLeft'] = false;
        else keys['touchRight'] = false;
        if (activeTouches === 0) {
            keys['touchLeft'] = false;
            keys['touchRight'] = false;
        }
    });
    
    app.stage.on('pointerupoutside', (event) => {
        activeTouches = Math.max(0, activeTouches - 1);
         if (activeTouches === 0) {
            keys['touchLeft'] = false;
            keys['touchRight'] = false;
        }
    });

    window.addEventListener('keydown', (e) => {
        if (gameState === 'splash' && e.code === 'Space') {
            e.preventDefault();
            startGame();
            return;
        }
        if (e.code === 'Escape') {
            e.preventDefault();
            togglePause();
            return;
        }
        keys[e.code] = true;
        if (gameState === 'gameOver' && e.code === 'Space') restartGame();
    });
    window.addEventListener('keyup', (e) => { keys[e.code] = false; });
    
    document.addEventListener('contextmenu', e => e.preventDefault());

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
        if (trailPoints.length > 1) {
            trailGraphics.moveTo(trailPoints[0].x, trailPoints[0].y);
            for (let i = 1; i < trailPoints.length; i++) trailGraphics.lineTo(trailPoints[i].x, trailPoints[i].y);
            trailGraphics.stroke({width: TRAIL_WIDTH, color: TRAIL_COLOR, cap: 'round', join: 'round'});
        }
        
        enemyTrailGraphics.clear();
        const allEnemyTrails = [...enemyTrails, ...fadingTrails];
        allEnemyTrails.forEach(trail => {
            if (trail && trail.length >= 2) {
                enemyTrailGraphics.moveTo(trail[0].x, trail[0].y);
                for (let j = 1; j < trail.length; j++) enemyTrailGraphics.lineTo(trail[j].x, trail[j].y);
                enemyTrailGraphics.stroke({width: TRAIL_WIDTH, color: ENEMY_TRAIL_COLOR, cap: 'round', join: 'round'});
            }
        });
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

    function updateFadingTrails(delta) {
        const segmentsToRemove = Math.max(1, Math.floor(SEGMENTFADE_DELTA * delta));
        for (let i = fadingTrails.length - 1; i >= 0; i--) {
            const trail = fadingTrails[i];
            for (let j = 0; j < segmentsToRemove && trail.length > 1; j++) {
                trail.shift();
            }
            if (trail.length < 2) {
                fadingTrails.splice(i, 1);
            }
        }
    }
    
    function getSafeTrail(bike, trail) {
        if (!trail) return [];
        for (let i = trail.length - 1; i >= 0; i--) {
            const p = trail[i];
            const distSq = (bike.x - p.x)**2 + (bike.y - p.y)**2;
            if (distSq > COLLISION_GRACE_DISTANCE**2) {
                return trail.slice(0, i + 1);
            }
        }
        return [];
    }

    function checkWallGrind(bike, allTrails) {
        bike.isGrinding = false;
        const bikeDirX = Math.sin(bike.angle);
        const bikeDirY = -Math.cos(bike.angle);
        for (const trail of allTrails) {
             if (!trail) continue;
            for (let i = trail.length - 2; i >= 0; i--) {
                const p1 = trail[i];
                const p2 = trail[i+1];
                const distSq = pointToSegmentDistanceSq(bike, p1, p2);

                if (distSq > (TRAIL_WIDTH/2)**2 && distSq < GRIND_MAX_DISTANCE**2) {
                    const segX = p2.x - p1.x;
                    const segY = p2.y - p1.y;
                    const segLen = Math.sqrt(segX*segX + segY*segY);
                    if (segLen < 1) continue;
                    const trailDirX = segX / segLen;
                    const trailDirY = segY / segLen;
                    const parallelDot = bikeDirX * trailDirX + bikeDirY * trailDirY;

                    if (Math.abs(parallelDot) > GRIND_ANGLE_THRESHOLD) {
                        bike.isGrinding = true;
                        const crossZ = bikeDirX * (p1.y - bike.y) - bikeDirY * (p1.x - bike.x);
                        bike.grindingSide = crossZ > 0 ? 'left' : 'right';
                        return;
                    }
                }
            }
        }
    }
    
    function activatePowerup(bike) {
        if (!bike || !bike.powerup) return;
        if (bike.powerup === 'S') {
            bike.speedBoost = { multiplier: POWERUP_S_BOOST, duration: POWERUP_S_DURATION };
        } else if (bike.powerup === 'T') {
            bike.speedBoost = { multiplier: POWERUP_T_BOOST, duration: POWERUP_T_DURATION };
        }
        bike.powerup = null;
        if (bike === player) updatePowerupUI();
    }
    
    function pointToSegmentDistanceSq(point, segP1, segP2) {
        const segX = segP2.x - segP1.x;
        const segY = segP2.y - segP1.y;
        const pointToP1X = segP1.x - point.x;
        const pointToP1Y = segP1.y - point.y;
    
        const segLenSq = segX * segX + segY * segY;
        if (segLenSq === 0) return (point.x - segP1.x)**2 + (point.y - segP1.y)**2;
    
        const t = Math.max(0, Math.min(1, (-pointToP1X * segX - pointToP1Y * segY) / segLenSq));
        const closestX = segP1.x + t * segX;
        const closestY = segP1.y + t * segY;
    
        return (point.x - closestX)**2 + (point.y - closestY)**2;
    }

    function isBikeCollidingWithTrail(bike, trail) {
        if (!trail || trail.length < 2) return false;
        for (let i = 0; i < trail.length - 1; i++) {
            const distSq = pointToSegmentDistanceSq(bike, trail[i], trail[i+1]);
            if (distSq < (TRAIL_WIDTH / 2)**2) {
                return true;
            }
        }
        return false;
    }

    function isPointColliding(point, allTrails) {
        if (Math.abs(point.x) > WORLD_BOUNDS || Math.abs(point.y) > WORLD_BOUNDS) {
            return true;
        }
        for (const trail of allTrails) {
             if (!trail || trail.length < 2) continue;
             for (let i = 0; i < trail.length - 1; i++) {
                const distSq = pointToSegmentDistanceSq(point, trail[i], trail[i+1]);
                if (distSq < TRAIL_WIDTH**2) {
                    return true;
                }
            }
        }
        return false;
    }

    function getAIInput(enemy, enemyTrail) {
        if (enemy.powerup === 'T') activatePowerup(enemy);
        
        const speedMultiplier = (enemy.speedBoost ? enemy.speedBoost.multiplier : 1) * (enemy.isGrinding ? GRIND_BOOST_MULTIPLIER : 1);
        const currentSpeed = PLAYER_SPEED * speedMultiplier;
        
        const turnRadius = currentSpeed / TURN_SPEED;
        const reactionDistance = currentSpeed * AI_UPDATE_INTERVAL;
        const whiskerLength = (turnRadius + reactionDistance) * AI_WHISKER_SAFETY_MULTIPLIER;
    
        const myIndex = enemies.indexOf(enemy);
        const safeEnemyTrail = getSafeTrail(enemy, enemyTrail);
    
        const allTrailsForAI = [getSafeTrail(player, trailPoints)];
        enemyTrails.forEach((trail, i) => {
            if (i === myIndex) {
                allTrailsForAI.push(safeEnemyTrail);
            } else if (enemies[i]) {
                allTrailsForAI.push(getSafeTrail(enemies[i], trail));
            }
        });
    
        const whiskerPoints = AI_WHISKER_ANGLES.map(angle => ({
            x: enemy.x + Math.sin(enemy.angle + angle) * whiskerLength,
            y: enemy.y - Math.cos(enemy.angle + angle) * whiskerLength
        }));
        
        const blocked = whiskerPoints.map(p => isPointColliding(p, allTrailsForAI));
        const [farLeft, nearLeft, center, nearRight, farRight] = blocked;
    
        if (center) {
            if (!nearLeft && !farLeft) return -1;
            if (!nearRight && !farRight) return 1;
            return enemy.aiTurnBias > 0 ? 1 : -1;
        }
        
        let turn = 0;
        if (nearLeft) turn += 0.5;
        if (farLeft) turn += 0.5;
        if (nearRight) turn -= 0.5;
        if (farRight) turn -= 0.5;
        
        let wallTurn = 0;
        const dirX = Math.sin(enemy.angle);
        const dirY = -Math.cos(enemy.angle);
    
        let xProximity = 0;
        if (dirX > 0) xProximity = (enemy.x - (WORLD_BOUNDS - AI_WALL_AVOID_DISTANCE)) / AI_WALL_AVOID_DISTANCE;
        else if (dirX < 0) xProximity = ((-WORLD_BOUNDS + AI_WALL_AVOID_DISTANCE) - enemy.x) / AI_WALL_AVOID_DISTANCE;
    
        let yProximity = 0;
        if (dirY > 0) yProximity = (enemy.y - (WORLD_BOUNDS - AI_WALL_AVOID_DISTANCE)) / AI_WALL_AVOID_DISTANCE;
        else if (dirY < 0) yProximity = ((-WORLD_BOUNDS + AI_WALL_AVOID_DISTANCE) - enemy.y) / AI_WALL_AVOID_DISTANCE;
        
        xProximity = Math.max(0, xProximity);
        yProximity = Math.max(0, yProximity);
    
        if (xProximity > yProximity && xProximity > 0) {
            wallTurn = -Math.sign(dirX) * AI_WALL_AVOID_STRENGTH * xProximity * xProximity;
        } else if (yProximity > 0) {
            wallTurn = -Math.sign(dirY) * AI_WALL_AVOID_STRENGTH * yProximity * yProximity;
        }
    
        const finalTurn = turn + wallTurn + enemy.aiTurnBias;
        return Math.max(-1, Math.min(1, finalTurn));
    }

    function updateEnemyIndicator() {
        const offscreenEnemies = enemies.filter(enemy => {
            if (!enemy) return false;
            const screenPos = world.toGlobal(enemy);
            return screenPos.x < 0 || screenPos.x > app.screen.width || screenPos.y < 0 || screenPos.y > app.screen.height;
        });

        if (offscreenEnemies.length === 0) {
            enemyIndicator.visible = false;
            return;
        }

        let closestDistSq = Infinity;
        let closestEnemy = null;
        for (const enemy of offscreenEnemies) {
            const distSq = (player.x - enemy.x)**2 + (player.y - enemy.y)**2;
            if (distSq < closestDistSq) {
                closestDistSq = distSq;
                closestEnemy = enemy;
            }
        }
        
        if (closestEnemy) {
            enemyIndicator.visible = true;
            const dx = closestEnemy.x - player.x;
            const dy = closestEnemy.y - player.y;
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

    function endGame(playerWon = false) {
        if (gameState === 'gameOver') return;
        gameState = 'gameOver';
        if (!playerWon) {
            createExplosion(player.x, player.y, PLAYER_COLOR);
            playerSprite.alpha = 0;
        }
        enemyIndicator.visible = false;
        showGameOverUI(playerWon);
        if (powerupInterval) clearInterval(powerupInterval);
    }
    
    function handleEnemyDeath(enemy) {
        const index = enemies.indexOf(enemy);
        if (index === -1) return;
        
        createExplosion(enemy.x, enemy.y, ENEMY_COLOR);
        
        if (enemyTrails[index] && enemyTrails[index].length > 1) {
            fadingTrails.push(enemyTrails[index]);
        }
        
        world.removeChild(enemy.sprite);
        enemy.sprite.destroy();
        
        enemies.splice(index, 1);
        enemyTrails.splice(index, 1);

        minimapEnemies.removeChildAt(index).destroy();
        
        setTimeout(spawnSingleEnemy, ENEMY_RESPAWN_DELAY);
    }

    function checkCollisions() {
        // --- Player Collisions ---
        const playerTrailSafe = getSafeTrail(player, trailPoints);
        if (isBikeCollidingWithTrail(player, playerTrailSafe)) { endGame(); return; }
        if (Math.abs(player.x) > WORLD_BOUNDS || Math.abs(player.y) > WORLD_BOUNDS) { endGame(); return; }
        for (const trail of enemyTrails) {
            if (trail && trail.length > 0 && isBikeCollidingWithTrail(player, trail)) {
                endGame();
                return;
            }
        }

        // --- Enemy Collisions ---
        for (let i = enemies.length - 1; i >= 0; i--) {
            const enemy = enemies[i];
            
            const enemyTrail = enemyTrails[i];
            const enemyTrailSafe = getSafeTrail(enemy, enemyTrail);

            let didDie = false;
            if (isBikeCollidingWithTrail(enemy, trailPoints)) { didDie = true; }
            if (!didDie && isBikeCollidingWithTrail(enemy, enemyTrailSafe)) { didDie = true; }
            if (!didDie && (Math.abs(enemy.x) > WORLD_BOUNDS || Math.abs(enemy.y) > WORLD_BOUNDS)) { didDie = true; }
            
            if (!didDie) {
                for (let j = 0; j < enemyTrails.length; j++) {
                    if (i === j) continue;
                    if (enemyTrails[j] && enemyTrails[j].length > 0 && isBikeCollidingWithTrail(enemy, enemyTrails[j])) {
                        didDie = true;
                        break;
                    }
                }
            }
            if (didDie) {
                handleEnemyDeath(enemy);
            }
        }
    }

    function updatePowerups() {
        for (let i = powerups.length - 1; i >= 0; i--) {
            const p = powerups[i];
            if (!p || !p.parent) continue;
            if (!player.powerup && (player.x - p.x)**2 + (player.y - p.y)**2 < (POWERUP_SIZE + TRAIL_WIDTH)**2) {
                 player.powerup = p.type;
                 updatePowerupUI();
                 powerupContainer.removeChild(p);
                 p.destroy();
                 powerups.splice(i, 1);
                 continue;
            }
            
            for (const enemy of enemies) {
                if (enemy && !enemy.powerup && (enemy.x - p.x)**2 + (enemy.y - p.y)**2 < (POWERUP_SIZE + TRAIL_WIDTH)**2) {
                    enemy.powerup = p.type;
                    powerupContainer.removeChild(p);
                    p.destroy();
                    powerups.splice(i, 1);
                    break;
                }
            }
        }
    }
    
    function checkDotCollection() {
        for (let i = dots.length - 1; i >= 0; i--) {
            const d = dots[i];
            if ((player.x - d.x)**2 + (player.y - d.y)**2 < DOT_PICKUP_RADIUS**2) {
                 playerScore++;
                 updateScoreUI();
                 dotContainer.removeChild(d);
                 d.destroy({children:true});
                 dots.splice(i, 1);
                 if (playerScore >= DOTS_PER_LEVEL) {
                     nextLevel();
                 }
                 return;
            }
        }
    }

    app.ticker.add((ticker) => {
        const delta = ticker.deltaTime;

        if (gameState === 'splash' || gameState === 'paused') {
            return;
        }

        updateParticles(delta);
        updateFadingTrails(delta);

        if (gameState === 'levelTransition') {
            transitionTimer -= delta;
            screenFade.alpha = 1 - Math.abs(transitionTimer) / FADE_DURATION;
            if (transitionTimer <= -FADE_DURATION) {
                gameState = 'playing';
            } else if (transitionTimer < 0 && transitionTimer + delta >=0) {
                 currentLevel++;
                 startLevel(currentLevel);
            }
            return;
        }

        if (gameState !== 'playing') {
            return;
        }

        handlePowerupActivation();
        
        const left = keys['ArrowLeft'] || keys['KeyA'] || (activeTouches > 0 && keys['touchLeft']);
        const right = keys['ArrowRight'] || keys['KeyD'] || (activeTouches > 0 && keys['touchRight']);
        turning = (right ? 1 : 0) - (left ? 1 : 0);

        const bikes = [player, ...enemies];

        bikes.forEach((bike) => {
            if (!bike) return;

            if (bike.speedBoost) {
                bike.speedBoost.duration -= delta;
                if (bike.speedBoost.duration <= 0) bike.speedBoost = null;
            }
            
            const myTrail = bike === player ? trailPoints : enemyTrails[enemies.indexOf(bike)];
            const safeMyTrail = getSafeTrail(bike, myTrail);
            
            const otherTrails = [];
            if (bike === player) {
                enemyTrails.forEach(trail => { if (trail && trail.length > 0) otherTrails.push(trail) });
            } else {
                otherTrails.push(trailPoints);
                const bikeIndex = enemies.indexOf(bike);
                enemyTrails.forEach((trail, i) => {
                    if (i !== bikeIndex && trail && trail.length > 0) otherTrails.push(trail);
                });
            }
            checkWallGrind(bike, [safeMyTrail, ...otherTrails]);

            if (bike.isGrinding) emitGrindParticle(bike, bike.grindingSide);
            emitBoostParticle(bike);
            const speedMultiplier = (bike.speedBoost ? bike.speedBoost.multiplier : 1) * (bike.isGrinding ? GRIND_BOOST_MULTIPLIER : 1);

            if (bike === player) {
                if (turning !== 0) bike.angle += turning * TURN_SPEED * delta;
            } else { // Enemy
                bike.aiBiasCooldown -= delta;
                if (bike.aiBiasCooldown <= 0) {
                    bike.aiTurnBias = (Math.random() - 0.5) * 0.4;
                    bike.aiBiasCooldown = Math.random() * 120 + 60;
                }

                bike.aiUpdateCooldown -= delta;
                if (bike.aiUpdateCooldown <= 0) {
                    bike.turning = getAIInput(bike, myTrail);
                    bike.aiUpdateCooldown = AI_UPDATE_INTERVAL;
                }
                if (bike.turning !== 0) bike.angle += bike.turning * TURN_SPEED * delta;
            }
            bike.x += Math.sin(bike.angle) * PLAYER_SPEED * speedMultiplier * delta;
            bike.y -= Math.cos(bike.angle) * PLAYER_SPEED * speedMultiplier * delta;
        });
        
        if (trailPoints.length === 0 || ((player.x - trailPoints.at(-1).x)**2 + (player.y - trailPoints.at(-1).y)**2) > (TRAIL_WIDTH/2)**2) {
            trailPoints.push(new PIXI.Point(player.x, player.y));
            if (trailPoints.length > PLAYER_TRAIL_HISTORY) {
                trailPoints.shift();
            }
        }

        enemies.forEach((enemy, i) => {
            if (enemy) {
                const trail = enemyTrails[i];
                if (trail && (trail.length === 0 || ((enemy.x - trail.at(-1).x)**2 + (enemy.y - trail.at(-1).y)**2) > (TRAIL_WIDTH/2)**2)) {
                    trail.push(new PIXI.Point(enemy.x, enemy.y));
                    if (trail.length > AI_TRAIL_HISTORY) {
                        trail.shift();
                    }
                }
            }
        });
        
        checkCollisions();
        if (gameState !== 'playing') return;
        
        updatePowerups();
        checkDotCollection();

        playerSprite.position.set(player.x, player.y);
        playerSprite.rotation = player.angle;
        playerSprite.tint = player.isGrinding ? 0xFFFF00 : 0xFFFFFF;
        
        enemies.forEach(enemy => {
            if (enemy) {
                enemy.sprite.position.set(enemy.x, enemy.y);
                enemy.sprite.rotation = enemy.angle;
                enemy.sprite.tint = enemy.isGrinding ? 0xFFFF00 : 0xFFFFFF;
            }
        });
        
        world.pivot.set(player.x, player.y);
        world.position.set(app.screen.width / 2, app.screen.height * 0.9);
        updateVignetteAndShake();
        world.rotation = -player.angle;
        
        drawTrails();
        updateEnemyIndicator();
        updateMinimap();
    });
    
    // --- Initial Setup ---
    pauseOverlay = document.getElementById('pause-overlay');
    splashScreenElement = document.getElementById('splash-screen');
    drawGrid();
    setupEnemyIndicator();
    setupGameOverUI();
    setupPowerupUI();
    setupScoreUI();
    setupMinimap();
    
    screenFade = new PIXI.Graphics();
    screenFade.beginFill(0x000000);
    screenFade.drawRect(0, 0, app.screen.width, app.screen.height);
    screenFade.endFill();
    screenFade.alpha = 0;
    app.stage.addChild(screenFade);

    window.addEventListener('resize', repositionUI);
    repositionUI();
    
    splashScreenElement.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        startGame();
    });
})();