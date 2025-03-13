document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('#highscore-screen, #message-overlay, #easter-egg, #ui-overlay, #instructions').forEach(function(element) {
        element.classList.add('hidden');
    });
    
    document.getElementById('title-screen').classList.remove('hidden');
});

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    backgroundColor: '#000',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    },
    callbacks: {
        postBoot: function() {
        }
    }
};

let game;
let gameRunning = false;
let gameOver = false;
let gameWon = false;
let highscores = [];
let newHighscore = false;

function getElement(id) {
    const element = document.getElementById(id);
    if (!element) {
    }
    return element;
}

function addClickListener(element, handler) {
    if (element) {
        element.addEventListener('click', handler);
    } else {
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const startButton = getElement('start-button');
    const restartButton = getElement('restart-button');
    const nextLevelButton = getElement('next-level-button');
    const saveScoreButton = getElement('save-score-button');
    const playAgainButton = getElement('play-again-button');
    const clearHighscoresButton = getElement('clear-highscores-button');
    const easterEggCloseButton = getElement('easter-egg-close');
    const playerNameInput = getElement('player-name');
    
    if (playerNameInput) {
        playerNameInput.addEventListener('keydown', e => e.stopPropagation());
        playerNameInput.addEventListener('keypress', e => e.stopPropagation());
        playerNameInput.addEventListener('keyup', e => e.stopPropagation());
        
        playerNameInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (saveScoreButton) saveScoreButton.click();
            }
        });
    }
    
    addClickListener(startButton, () => {
        const titleScreen = getElement('title-screen');
        const uiOverlay = getElement('ui-overlay');
        const instructions = getElement('instructions');
        
        if (titleScreen) titleScreen.classList.add('hidden');
        if (uiOverlay) uiOverlay.classList.remove('hidden');
        if (instructions) instructions.classList.remove('hidden');
        
        try {
            if (!game) {
                game = new Phaser.Game(config);
            } else {
                startGame();
            }
        } catch (error) {
        }
    });
    
    addClickListener(restartButton, () => {
        const messageOverlay = getElement('message-overlay');
        if (messageOverlay) messageOverlay.classList.add('hidden');
        if (restartButton) restartButton.classList.add('hidden');
        startNewGame();
    });
    
    addClickListener(nextLevelButton, () => {
        const messageOverlay = getElement('message-overlay');
        if (messageOverlay) messageOverlay.classList.add('hidden');
        if (nextLevelButton) nextLevelButton.classList.add('hidden');
        
        if (game && game.scene && game.scene.scenes && game.scene.scenes[0]) {
            game.scene.scenes[0].resumeGame();
        }
    });
    
    addClickListener(saveScoreButton, () => {
        const nameInput = getElement('player-name');
        const nameInputContainer = getElement('name-input-container');
        
        if (game && game.scene && game.scene.scenes && game.scene.scenes[0]) {
            const playerName = (nameInput && nameInput.value) ? nameInput.value.trim() : "Okänd spelare";
            const score = game.scene.scenes[0].player.score;
            const level = game.scene.scenes[0].currentLevel;
            
            console.log(`Sparar highscore: ${playerName}, poäng: ${score}, nivå: ${level}`);
            saveHighscore(playerName, score, level);
            
            if (nameInputContainer) {
                nameInputContainer.classList.add('hidden');
                nameInputContainer.style.display = 'none';
            }
            
            updateHighscoreTable();
        }
    });
    
    addClickListener(playAgainButton, () => {
        const highscoreScreen = getElement('highscore-screen');
        if (highscoreScreen) highscoreScreen.classList.add('hidden');
        startNewGame();
    });
    
    addClickListener(clearHighscoresButton, () => {
        if (confirm("Är du säker på att du vill rensa topplistan?")) {
            highscores = [];
            
            try {
                localStorage.removeItem(STORAGE_KEY);
            } catch (error) {
            }
            
            updateHighscoreTable();
        }
    });
    
    addClickListener(easterEggCloseButton, () => {
        const easterEgg = getElement('easter-egg');
        if (easterEgg) easterEgg.classList.add('hidden');
        
        if (game && game.scene && game.scene.scenes && game.scene.scenes[0]) {
            game.scene.scenes[0].resumeGame();
            
            if (game.scene.scenes[0].easterEggHint) {
                game.scene.scenes[0].easterEggHint.visible = false;
            }
        }
    });
    
    try {
        highscores = loadHighscores();
    } catch (error) {
        highscores = [];
    }
    
    createStars();
    createParticles();
    
    const titleScreen = getElement('title-screen');
    if (titleScreen) {
        titleScreen.addEventListener('mousemove', handleMouseMove);
    }
});

function preload() {}

function create() {
    if (window.savedGameLevel) {
        this.currentLevel = window.savedGameLevel;
        window.savedGameLevel = null;
    } else if (!this.currentLevel) {
        this.currentLevel = 1;
    }
    
    this.requiredCrystals = TOTAL_CRYSTALS + (this.currentLevel - 1) * LEVEL_CRYSTAL_INCREASE;
    this.isLevelTransitioning = false;
    
    const mazeData = generateMaze(this.game.config.width, this.game.config.height, TILE_SIZE);
    this.maze = mazeData.walls;
    
    this.mazeGraphics = this.add.graphics();
    this.drawMaze = function() {
        this.mazeGraphics.clear();
        this.mazeGraphics.fillStyle(0x333333);
        
        for (const wall of this.maze) {
            this.mazeGraphics.fillRect(wall.x, wall.y, wall.width, wall.height);
        }
    };
    this.drawMaze();
    
    this.createEnemies = function(count) {
        for (const enemy of this.enemies) {
            enemy.destroy();
        }
        this.enemies = [];
        
        for (let i = 0; i < count; i++) {
            let x, y;
            let validPosition = false;
            let attempts = 0;
            
            while (!validPosition && attempts < 100) {
                attempts++;
                x = Math.random() * (this.game.config.width - 2 * ENEMY_SIZE) + ENEMY_SIZE;
                y = Math.random() * (this.game.config.height - 2 * ENEMY_SIZE) + ENEMY_SIZE;
                
                const distToPlayer = calculateDistance(
                    x, y,
                    this.player.x, this.player.y
                );
                
                if (distToPlayer < 200) continue;
                
                let collides = false;
                for (const wall of this.maze) {
                    if (checkCollision(
                        x, y, ENEMY_SIZE, ENEMY_SIZE,
                        wall.x, wall.y, wall.width, wall.height
                    )) {
                        collides = true;
                        break;
                    }
                }
                
                if (!collides) {
                    validPosition = true;
                }
            }
            
            if (!validPosition) {
                const safePos = findSafePosition(
                    this.maze,
                    this.game.config.width - TILE_SIZE * 3,
                    this.game.config.height - TILE_SIZE * 3,
                    ENEMY_SIZE,
                    this.game.config.width,
                    this.game.config.height
                );
                x = safePos.x;
                y = safePos.y;
            }
            
            const enemy = new Enemy(this, x, y, this.currentLevel);
            this.enemies.push(enemy);
        }
    };
    
    this.createCrystals = function(count) {
        for (const crystal of this.crystals) {
            if (crystal.sprite) crystal.sprite.destroy();
        }
        this.crystals = [];
        
        for (let i = 0; i < count; i++) {
            let x, y;
            let validPosition = false;
            let attempts = 0;
            
            while (!validPosition && attempts < 100) {
                attempts++;
                
                x = Math.random() * (this.game.config.width - 2 * CRYSTAL_SIZE) + CRYSTAL_SIZE;
                y = Math.random() * (this.game.config.height - 2 * CRYSTAL_SIZE) + CRYSTAL_SIZE;
                
                const distToPlayer = calculateDistance(
                    x, y,
                    this.player.x, this.player.y
                );
                
                if (distToPlayer < 100) continue;
                
                let tooCloseToWall = false;
                const minDistanceFromWalls = TILE_SIZE * 0.5;
                
                for (const wall of this.maze) {
                    const distX = Math.abs((x + CRYSTAL_SIZE/2) - (wall.x + wall.width/2)) - (wall.width/2 + CRYSTAL_SIZE/2);
                    const distY = Math.abs((y + CRYSTAL_SIZE/2) - (wall.y + wall.height/2)) - (wall.height/2 + CRYSTAL_SIZE/2);
                    
                    if (distX < minDistanceFromWalls && distY < minDistanceFromWalls) {
                        tooCloseToWall = true;
                        break;
                    }
                }
                
                if (!tooCloseToWall) {
                    validPosition = true;
                }
            }
            
            if (!validPosition) {
                const safePositions = [
                    { x: TILE_SIZE * 2.5, y: TILE_SIZE * 2.5 },
                    { x: this.game.config.width - TILE_SIZE * 3.5, y: TILE_SIZE * 2.5 },
                    { x: TILE_SIZE * 2.5, y: this.game.config.height - TILE_SIZE * 3.5 },
                    { x: this.game.config.width - TILE_SIZE * 3.5, y: this.game.config.height - TILE_SIZE * 3.5 },
                    { x: this.game.config.width / 2, y: this.game.config.height / 2 }
                ];
                
                const pos = safePositions[i % safePositions.length];
                x = pos.x;
                y = pos.y;
            }
            
            this.crystals.push({
                x: x,
                y: y,
                radius: CRYSTAL_SIZE / 2,
                points: BASE_POINTS_PER_CRYSTAL * this.currentLevel,
                collected: false,
                glow: 0,
                glowDir: 1,
                sprite: this.add.circle(x, y, CRYSTAL_SIZE / 2, 0x64c8ff),
                glowSprite: this.add.circle(x, y, CRYSTAL_SIZE * 2, 0x64c8ff, 0.15),
                
                collect: function() {
                    this.collected = true;
                    this.sprite.setVisible(false);
                    this.glowSprite.setVisible(false);
                }
            });
        }
    };
    
    this.updateCrystals = function(delta) {
        for (const crystal of this.crystals) {
            if (!crystal.collected) {
                crystal.glow += 0.05 * crystal.glowDir * (delta / 16);
                
                if (crystal.glow >= 1) {
                    crystal.glow = 1;
                    crystal.glowDir = -1;
                } else if (crystal.glow <= 0) {
                    crystal.glow = 0;
                    crystal.glowDir = 1;
                }
                
                if (this.currentLevel >= CRYSTAL_VISIBILITY_LEVEL) {
                    const distanceToCrystal = calculateDistance(
                        crystal.x, crystal.y,
                        this.player.x + this.player.radius, this.player.y + this.player.radius
                    );
                    
                    const isVisible = distanceToCrystal <= this.player.lightRadius;
                    crystal.sprite.setVisible(isVisible);
                    crystal.glowSprite.setVisible(isVisible);
                }
                
                crystal.glowSprite.setAlpha(0.1 + crystal.glow * 0.2);
            }
        }
    };
    
    this.createDarkProjectile = function(x, y, direction) {
        const projectile = new DarkProjectile(this, x, y, direction);
        this.darkProjectiles.push(projectile);
        return projectile;
    };
    
    this.createProjectileEffect = function(x, y, direction) {
        const particleCount = 10;
        
        for (let i = 0; i < particleCount; i++) {
            const spreadAngle = 0.5;
            const particleDirection = direction + (Math.random() - 0.5) * spreadAngle;
            
            this.createProjectileParticle(
                x + Math.cos(particleDirection) * 5,
                y + Math.sin(particleDirection) * 5,
                particleDirection,
                1 + Math.random() * 3,
                1 + Math.random() * 3,
                1.0,
                0.05 + Math.random() * 0.1
            );
        }
    };
    
    this.createProjectileParticle = function(x, y, direction, speed, size, life, decay) {
        const particle = new ProjectileParticle(this, x, y, direction, speed, size, life, decay);
        this.projectileParticles.push(particle);
        return particle;
    };
    
    this.createExplosionEffect = function(x, y, particleCount) {
        for (let i = 0; i < particleCount; i++) {
            const direction = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 3;
            
            this.createProjectileParticle(
                x, y, direction, speed,
                1 + Math.random() * 3,
                1.0,
                0.03 + Math.random() * 0.05
            );
        }
    };
    
    this.updateLightLevelUI = function(value) {
        document.getElementById('light-level').textContent = value;
    };
    
    this.updateCrystalsUI = function(value) {
        document.getElementById('crystals-collected').textContent = value;
    };
    
    this.updateTotalCrystalsUI = function(value) {
        document.getElementById('total-crystals').textContent = value;
    };
    
    this.updateScoreUI = function(value) {
        document.getElementById('score').textContent = value;
    };
    
    this.updateLevelUI = function(value) {
        document.getElementById('level').textContent = value;
    };
    
    this.updateStaminaUI = function(stamina, isTired) {
        const percentage = (stamina / MAX_STAMINA) * 100;
        const staminaBar = document.getElementById('stamina-bar');
        
        staminaBar.style.width = `${percentage}%`;
        
        if (percentage > 60) {
            staminaBar.style.backgroundColor = "#4CAF50";
        } else if (percentage > 30) {
            staminaBar.style.backgroundColor = "#FFC107";
        } else {
            staminaBar.style.backgroundColor = "#F44336";
        }
        
        if (isTired) {
            staminaBar.style.opacity = "0.5";
        } else {
            staminaBar.style.opacity = "1";
        }
    };
    
    this.showMessage = function(text) {
        const messageText = document.getElementById('message-text');
        messageText.textContent = text;
        const messageOverlay = document.getElementById('message-overlay');
        
        messageOverlay.style.display = 'flex';
        messageOverlay.style.flexDirection = 'column';
        messageOverlay.style.justifyContent = 'center';
        messageOverlay.style.alignItems = 'center';
        messageOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        messageOverlay.style.color = 'white';
        messageOverlay.style.fontSize = '24px';
        messageOverlay.style.padding = '20px';
        messageOverlay.style.zIndex = '1000';
        
        messageOverlay.classList.remove('hidden');
    };
    
    this.nextLevel = function() {
        try {
            this.isLevelTransitioning = true;
            gameRunning = false;
            
            if (this.currentLevel === 1 && this.easterEggHint) {
                this.easterEggHint.destroy();
                this.easterEggHint = null;
            }
            
            this.player.score += POINTS_PER_LEVEL * this.currentLevel;
            this.updateScoreUI(this.player.score);
            
            const oldLevel = this.currentLevel;
            this.currentLevel++;
            this.updateLevelUI(this.currentLevel);
            
            const crystalCount = TOTAL_CRYSTALS + (this.currentLevel - 1) * LEVEL_CRYSTAL_INCREASE;
            const enemyCount = 3 + (this.currentLevel - 1) * LEVEL_ENEMY_INCREASE;
            
            const mazeData = generateMaze(this.game.config.width, this.game.config.height, TILE_SIZE);
            this.maze = mazeData.walls;
            this.drawMaze();
            
            const safeStart = findSafePosition(
                this.maze, TILE_SIZE * 2, TILE_SIZE * 2, PLAYER_SIZE,
                this.game.config.width, this.game.config.height
            );
            
            for (const proj of this.darkProjectiles) {
                proj.destroy();
            }
            this.darkProjectiles = [];
            
            for (const part of this.projectileParticles) {
                part.destroy();
            }
            this.projectileParticles = [];
            
            this.player.resetForNewLevel(safeStart.x, safeStart.y);
            
            this.requiredCrystals = crystalCount;
            this.updateTotalCrystalsUI(crystalCount);
            
            this.createEnemies(enemyCount);
            this.createCrystals(crystalCount);
            
            let levelMessage = `Nivå ${this.currentLevel} - Hitta ${crystalCount} kristaller!`;
            
            if (this.currentLevel === CRYSTAL_VISIBILITY_LEVEL) {
                levelMessage += "\nKristallerna syns nu bara inom ljuset!";
            } else if (this.currentLevel === REDUCED_LIGHT_LEVEL) {
                levelMessage += "\nDitt ljus har blivit svagare!";
            }
            
            this.showMessage(levelMessage);
            
            const messageOverlay = document.getElementById('message-overlay');
            const restartButton = document.getElementById('restart-button');
            const nextLevelButton = document.getElementById('next-level-button');
            
            if (messageOverlay) {
                messageOverlay.style.display = 'flex';
                messageOverlay.style.flexDirection = 'column';
                messageOverlay.style.justifyContent = 'center';
                messageOverlay.style.alignItems = 'center';
                messageOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                messageOverlay.style.zIndex = '1000';
            }
            
            if (restartButton) {
                restartButton.classList.add('hidden');
            }
            
            if (nextLevelButton) {
                nextLevelButton.style.display = 'block';
                nextLevelButton.classList.remove('hidden');
            }
        } catch (error) {
            this.isLevelTransitioning = false;
        }
    };
    
    this.endGame = function(message) {
        gameRunning = false;
        gameOver = true;
        
        // Kontrollera highscore innan vi visar meddelanden
        const finalScore = this.player.score;
        console.log("Spelet slut, poäng:", finalScore);
        checkHighscore(finalScore);
        
        this.showMessage(message);
        
        const restartButton = document.getElementById('restart-button');
        const nextLevelButton = document.getElementById('next-level-button');
        
        if (restartButton) {
            restartButton.style.display = 'block';
            restartButton.classList.remove('hidden');
        }
        
        if (nextLevelButton) {
            nextLevelButton.classList.add('hidden');
        }
        
        this.time.delayedCall(1100, () => {
            const messageOverlay = document.getElementById('message-overlay');
            if (messageOverlay) {
                messageOverlay.classList.add('hidden');
            }
            showHighscoreScreen();
        });
    };
    
    this.pauseGame = function() {
        gameRunning = false;
    };
    
    this.resumeGame = function() {
        gameRunning = true;
        this.isLevelTransitioning = false;
    };
    
    const playerStart = findSafePosition(
        this.maze, TILE_SIZE * 2, TILE_SIZE * 2, PLAYER_SIZE,
        this.game.config.width, this.game.config.height
    );
    
    this.player = new Player(this, playerStart.x, playerStart.y);
    
    const enemyCount = 3 + (this.currentLevel - 1) * LEVEL_ENEMY_INCREASE;
    
    const crystalCount = TOTAL_CRYSTALS + (this.currentLevel - 1) * LEVEL_CRYSTAL_INCREASE;
    
    this.enemies = [];
    this.createEnemies(enemyCount);
    
    this.crystals = [];
    this.createCrystals(crystalCount);
    
    if (this.currentLevel === 1) {
        const eggHintX = this.game.config.width / 2;
        const eggHintY = this.game.config.height / 2;
        
        this.easterEggHint = this.add.text(eggHintX, eggHintY, "E", {
            fontFamily: 'Arial',
            fontSize: '20px',
            color: '#ffff00',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5, 0.5);
        
        this.tweens.add({
            targets: this.easterEggHint,
            alpha: { from: 0.4, to: 1 },
            scale: { from: 0.8, to: 1.2 },
            duration: 1500,
            yoyo: true,
            repeat: -1
        });
    } else if (this.easterEggHint) {
        this.easterEggHint.destroy();
        this.easterEggHint = null;
    }
    
    this.darkProjectiles = [];
    this.projectileParticles = [];
    
    this.cursors = this.input.keyboard.createCursorKeys();
    
    this.keys = {
        W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
        F: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F)
    };
    
    this.input.keyboard.on('keydown-SPACE', () => {
        if (gameRunning) this.player.toggleLight();
    });
    
    this.input.keyboard.on('keydown-F', () => {
        if (gameRunning && !this.player.flashlightActive) {
            this.player.activateFlashlight();
        }
    });
    
    this.input.keyboard.on('keydown-E', () => {
        if (gameRunning && this.currentLevel === 1) {
            this.pauseGame();
            document.getElementById('easter-egg').classList.remove('hidden');
            
            if (this.easterEggHint) {
                this.easterEggHint.setScale(2);
                this.easterEggHint.setAlpha(1);
                this.tweens.add({
                    targets: this.easterEggHint,
                    scale: { from: 2, to: 0 },
                    alpha: { from: 1, to: 0 },
                    duration: 500,
                    onComplete: () => {
                        this.easterEggHint.visible = false;
                    }
                });
            }
        }
    });
    
    this.updateLightLevelUI(100);
    this.updateCrystalsUI(0);
    this.updateScoreUI(0);
    this.updateLevelUI(this.currentLevel);
    this.updateTotalCrystalsUI(this.requiredCrystals);
    this.updateStaminaUI(MAX_STAMINA, false);
    
    gameRunning = true;
    gameOver = false;
    gameWon = false;
}

function update(time, delta) {
    if (!gameRunning) return;
    
    if (!this.isLevelTransitioning) {
        this.player.update(time, delta);
        
        for (let i = 0; i < this.enemies.length; i++) {
            this.enemies[i].update(time, delta);
        }
        
        for (let i = this.darkProjectiles.length - 1; i >= 0; i--) {
            const removed = this.darkProjectiles[i].update(time, delta);
            if (removed) {
                this.darkProjectiles.splice(i, 1);
            }
        }
        
        for (let i = this.projectileParticles.length - 1; i >= 0; i--) {
            const removed = this.projectileParticles[i].update(delta);
            if (removed) {
                this.projectileParticles.splice(i, 1);
            }
        }
    }
    
    this.updateCrystals(delta);
}

function startGame() {
    try {
        if (game && game.scene && game.scene.scenes && game.scene.scenes[0]) {
            const currentLevel = game.scene.scenes[0].currentLevel || 1;
            
            document.getElementById('highscore-screen').classList.add('hidden');
            
            window.savedGameLevel = currentLevel;
            
            game.scene.scenes[0].scene.restart();
        } else {
            window.savedGameLevel = 1;
            game = new Phaser.Game(config);
        }
    } catch (error) {
    }
}

function startNewGame() {
    try {
        document.getElementById('highscore-screen').classList.add('hidden');
        
        window.savedGameLevel = 1;
        
        if (game && game.scene && game.scene.scenes && game.scene.scenes[0]) {
            game.scene.scenes[0].scene.restart();
        } else {
            game = new Phaser.Game(config);
        }
    } catch (error) {
    }
}

function pauseGame() {
    if (game && game.scene && game.scene.scenes && game.scene.scenes[0]) {
        game.scene.scenes[0].pauseGame();
    } else {
        gameRunning = false;
    }
}

function resumeGame() {
    if (game && game.scene && game.scene.scenes && game.scene.scenes[0]) {
        game.scene.scenes[0].resumeGame();
    } else {
        gameRunning = true;
    }
}

function checkHighscore(score) {
    highscores.sort((a, b) => b.score - a.score);
    
    if (highscores.length < MAX_HIGHSCORES || score > (highscores.length > 0 ? highscores[highscores.length - 1].score : 0)) {
        newHighscore = true;
    } else {
        newHighscore = false;
    }
}

function saveHighscore(name, score, level) {
    console.log(`Sparar highscore i arrayen: ${name}, ${score}, ${level}`);
    
    // Lägg till den nya poängen
    highscores.push({
        name: name,
        score: score,
        level: level,
        date: new Date().toISOString().split('T')[0]
    });
    
    // Sortera highscores i fallande ordning
    highscores.sort((a, b) => b.score - a.score);
    
    // Begränsa till MAX_HIGHSCORES
    if (highscores.length > MAX_HIGHSCORES) {
        highscores = highscores.slice(0, MAX_HIGHSCORES);
    }
    
    // Spara till localStorage
    try {
        saveHighscores(highscores);
        console.log("Sparade highscores till localStorage:", highscores);
    } catch (error) {
        console.error("Fel vid sparande av highscores:", error);
    }
    
    // Återställ newHighscore-flaggan
    newHighscore = false;
}

function updateHighscoreTable() {
    const tbody = document.getElementById('highscore-body');
    if (!tbody) {
        return;
    }
    
    while (tbody.firstChild) {
        tbody.removeChild(tbody.firstChild);
    }
    
    if (highscores.length === 0) {
        const emptyRow = document.createElement('tr');
        const emptyCell = document.createElement('td');
        emptyCell.colSpan = 4;
        emptyCell.textContent = "Inga highscores än!";
        emptyCell.style.textAlign = "center";
        emptyRow.appendChild(emptyCell);
        tbody.appendChild(emptyRow);
    } else {
        highscores.forEach((score, index) => {
            const row = document.createElement('tr');
            
            const placeCell = document.createElement('td');
            placeCell.textContent = index + 1;
            row.appendChild(placeCell);
            
            const nameCell = document.createElement('td');
            nameCell.textContent = score.name;
            row.appendChild(nameCell);
            
            const scoreCell = document.createElement('td');
            scoreCell.textContent = score.score;
            row.appendChild(scoreCell);
            
            const levelCell = document.createElement('td');
            levelCell.textContent = score.level;
            row.appendChild(levelCell);
            
            tbody.appendChild(row);
        });
    }
}

function showHighscoreScreen() {
    updateHighscoreTable();
    
    gameRunning = false;
    
    const nameInputContainer = document.getElementById('name-input-container');
    const highscoreScreen = document.getElementById('highscore-screen');
    const playerNameInput = document.getElementById('player-name');
    const playAgainButton = document.getElementById('play-again-button');
    const clearHighscoresButton = document.getElementById('clear-highscores-button');
    
    if (newHighscore) {
        console.log("Visar formulär för nytt highscore");
        if (nameInputContainer) {
            nameInputContainer.classList.remove('hidden');
            nameInputContainer.style.display = 'block';
            
            if (playerNameInput) {
                playerNameInput.value = "";
                playerNameInput.focus();
                
                playerNameInput.addEventListener('keydown', function(e) {
                    e.stopPropagation();
                });
            }
        }
    } else if (nameInputContainer) {
        nameInputContainer.classList.add('hidden');
    }
    
    if (highscoreScreen) {
        highscoreScreen.style.display = 'flex';
        highscoreScreen.classList.remove('hidden');
    }
    
    if (playAgainButton) {
        playAgainButton.style.display = 'inline-block';
    }
    
    if (clearHighscoresButton) {
        clearHighscoresButton.style.display = 'inline-block';
    }
}

function createStars() {
    const starsContainer = document.getElementById('stars-container');
    if (!starsContainer) return;
    
    const numStars = 100;
    
    for (let i = 0; i < numStars; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        
        const size = Math.random() * 3 + 1;
        const opacity = Math.random() * 0.7 + 0.3;
        
        const twinkleDuration = Math.random() * 5 + 3 + 's';
        const twinkleDelay = Math.random() * 5 + 's';
        
        star.style.left = `${x}%`;
        star.style.top = `${y}%`;
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;
        star.style.setProperty('--star-opacity', opacity);
        star.style.setProperty('--twinkle-duration', twinkleDuration);
        star.style.setProperty('--twinkle-delay', twinkleDelay);
        
        starsContainer.appendChild(star);
    }
}

function createParticles() {
    const particlesContainer = document.getElementById('particles-container');
    if (!particlesContainer) return;
    
    const numParticles = 30;
    
    for (let i = 0; i < numParticles; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        setInterval(() => {
            const startX = Math.random() * 40 - 20;
            const startY = Math.random() * 40 - 20;
            
            const moveX = (Math.random() - 0.5) * 200;
            const moveY = (Math.random() - 0.5) * 200;
            
            const scale = Math.random() * 2 + 0.5;
            const opacity = Math.random() * 0.7 + 0.3;
            const duration = Math.random() * 3 + 2 + 's';
            
            particle.style.left = `${30 + startX}px`;
            particle.style.top = `${30 + startY}px`;
            particle.style.setProperty('--move-x', `${moveX}px`);
            particle.style.setProperty('--move-y', `${moveY}px`);
            particle.style.setProperty('--scale-to', scale);
            particle.style.setProperty('--particle-opacity', opacity);
            particle.style.setProperty('--particle-duration', duration);
            particle.style.setProperty('--particle-delay', '0s');
            
            const hue = Math.floor(Math.random() * 40) + 200;
            const saturation = Math.floor(Math.random() * 20) + 80;
            const lightness = Math.floor(Math.random() * 30) + 60;
            
            particle.style.backgroundColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
            
            particle.style.animation = 'none';
            particle.offsetHeight;
            particle.style.animation = `particleMove ${duration} 1 forwards`;
            
        }, 200 + Math.random() * 300);
        
        particlesContainer.appendChild(particle);
    }
}

function handleMouseMove(event) {
    const titleScreen = document.getElementById('title-screen');
    if (!titleScreen) return;
    
    const player = document.querySelector('.player-3d');
    if (!player) return;
    
    const rect = titleScreen.getBoundingClientRect();
    const mouseX = ((event.clientX - rect.left) / rect.width) - 0.5;
    const mouseY = ((event.clientY - rect.top) / rect.height) - 0.5;
    
    const moveX = mouseX * 30;
    const moveY = mouseY * 20;
    
    player.style.transform = `translate(calc(-50% + ${moveX}px), calc(-50% + ${moveY}px)) translateZ(50px)`;
    
    const pupils = document.querySelectorAll('.player-pupil');
    pupils.forEach(pupil => {
        pupil.style.transform = `translate(${mouseX * 3}px, ${mouseY * 3}px)`;
    });
    
    const enemies = document.querySelectorAll('.enemy');
    enemies.forEach((enemy, index) => {
        const depth = 1 - (index * 0.2);
        enemy.style.marginLeft = `${-mouseX * 20 * depth}px`;
        enemy.style.marginTop = `${-mouseY * 10 * depth}px`;
    });
    
    const floor = document.querySelector('.maze-floor');
    if (floor) {
        floor.style.marginLeft = `${-mouseX * 40}px`;
        floor.style.marginTop = `${-mouseY * 40}px`;
    }
}