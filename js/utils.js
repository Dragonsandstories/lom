// =========================
// KONSTANTER
// =========================
const TILE_SIZE = 40;
const PLAYER_SIZE = 20;
const MAX_LIGHT_RADIUS = 150;
const MIN_LIGHT_RADIUS = 30;
const ENEMY_SIZE = 25;
const CRYSTAL_SIZE = 15;
const PLAYER_SPEED = 160;
const PLAYER_TIRED_SPEED = 100;
const ENEMY_SPEED = 40;
const PLAYER_MAX_SPRINT_SPEED = 280;
const MAX_STAMINA = 100;
const STAMINA_DRAIN_RATE = 0.8;
const STAMINA_RECOVERY_RATE = 0.3;
const TIRED_DURATION = 2000;
const DARK_PROJECTILE_SIZE = 8;
const DARK_PROJECTILE_START_SPEED = 50;
const DARK_PROJECTILE_MAX_SPEED = 180;
const DARK_PROJECTILE_ACCEL = 3;
const ENEMY_STUN_DURATION = 2000; 
const FLASHLIGHT_DURATION = 1000;  
const FLASHLIGHT_ANGLE = Math.PI / 3;
const FLASHLIGHT_RANGE = 200;
const ENEMY_DETECTION_RADIUS = 200;
const TOTAL_CRYSTALS = 5;
const MAX_HIGHSCORES = 5;
const BASE_POINTS_PER_CRYSTAL = 100;
const LEVEL_ENEMY_INCREASE = 1;
const LEVEL_CRYSTAL_INCREASE = 1;
const POINTS_PER_LEVEL = 500;
const CRYSTAL_VISIBILITY_LEVEL = 10;
const REDUCED_LIGHT_LEVEL = 20;
const REDUCED_LIGHT_FACTOR = 0.6;
const STORAGE_KEY = 'ljusOchMorker_highscores';

// =========================
// LOKALA LAGRINGSFUNKTIONER
// =========================
function loadHighscores() {
    try {
        const savedScores = localStorage.getItem(STORAGE_KEY);
        if (savedScores) {
            return JSON.parse(savedScores);
        }
        return [];
    } catch (error) {
        console.error("Kunde inte ladda highscore:", error);
        return [];
    }
}

function saveHighscores(highscores) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(highscores));
    } catch (error) {
        console.error("Kunde inte spara highscore:", error);
    }
}

function clearHighscores() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
        console.error("Kunde inte rensa highscores:", error);
    }
}

// =========================
// HJÄLPFUNKTIONER
// =========================
function generateMaze(width, height, tileSize) {
    const rows = Math.floor(height / tileSize);
    const cols = Math.floor(width / tileSize);
    
    // Skapa ett tomt rutnät
    const grid = Array(rows).fill().map(() => Array(cols).fill(false));
    
    // Lägg till väggar runt kanterna
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            if (x === 0 || y === 0 || x === cols - 1 || y === rows - 1) {
                grid[y][x] = true; // Vägg
            }
        }
    }
    
    
    const pathWidth = 2; // Minsta öppna väg
    
    for (let y = 2; y < rows - 2; y++) {
        for (let x = 2; x < cols - 2; x++) {
            if (Math.random() < 0.22) {
                // Kontrollera angränsande väggar
                const adjacentWalls = (
                    (grid[y-1][x] ? 1 : 0) + 
                    (grid[y+1][x] ? 1 : 0) + 
                    (grid[y][x-1] ? 1 : 0) + 
                    (grid[y][x+1] ? 1 : 0)
                );
                
                // Kontrollera om vägen blockeras
                const pathBlocked = (
                    (grid[y-pathWidth][x] && grid[y+pathWidth][x]) || 
                    (grid[y][x-pathWidth] && grid[y][x+pathWidth])
                );
                
                // Lägg till vägg om det inte blockerar för mycket
                if (adjacentWalls <= 1 && !pathBlocked) {
                    grid[y][x] = true;
                }
            }
        }
    }
    
    // Verifiera med floodfill
    const visitedCells = new Set();
    floodfill(grid, 1, 1, visitedCells);
    
    
    for (let y = 1; y < rows - 1; y++) {
        for (let x = 1; x < cols - 1; x++) {
            if (!grid[y][x] && !visitedCells.has(`${x},${y}`)) {
                connectIsolatedArea(grid, x, y);
            }
        }
    }
    
    
    const walls = [];
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            if (grid[y][x]) {
                walls.push({
                    x: x * tileSize,
                    y: y * tileSize,
                    width: tileSize,
                    height: tileSize
                });
            }
        }
    }
    
    return { walls, grid };
}

function floodfill(grid, x, y, visited) {
    const rows = grid.length;
    const cols = grid[0].length;
    
    // Kontrollera gränser och om rutan är en vägg eller besökt
    if (x < 0 || y < 0 || x >= cols || y >= rows || grid[y][x] || visited.has(`${x},${y}`)) {
        return;
    }
    
    // Markera som besökt
    visited.add(`${x},${y}`);
    
    // Besök grannar
    floodfill(grid, x + 1, y, visited);
    floodfill(grid, x - 1, y, visited);
    floodfill(grid, x, y + 1, visited);
    floodfill(grid, x, y - 1, visited);
}

function connectIsolatedArea(grid, x, y) {
    const rows = grid.length;
    const cols = grid[0].length;
    
    const directions = [
        {dx: 1, dy: 0}, {dx: -1, dy: 0}, {dx: 0, dy: 1}, {dx: 0, dy: -1}
    ];
    
    for (let radius = 1; radius < Math.max(rows, cols); radius++) {
        for (let dir of directions) {
            const newX = x + dir.dx * radius;
            const newY = y + dir.dy * radius;
            
            if (newX >= 0 && newY >= 0 && newX < cols && newY < rows) {
                if (grid[newY][newX]) {
                    grid[newY][newX] = false; 
                    return;
                }
            }
        }
    }
}

function findSafePosition(walls, x, y, objectSize, gameWidth, gameHeight) {
    
    const startPositions = [
        { x: TILE_SIZE * 2, y: TILE_SIZE * 2 },
        { x: gameWidth / 2, y: gameHeight / 2 },
        { x: TILE_SIZE * 2, y: gameHeight / 2 },
        { x: gameWidth / 2, y: TILE_SIZE * 2 },
        { x: gameWidth - TILE_SIZE * 3, y: gameHeight - TILE_SIZE * 3 }
    ];
    
    
    for (const pos of startPositions) {
        let collisionFound = false;
        
        for (const wall of walls) {
            if (checkCollision(
                pos.x, pos.y, objectSize, objectSize,
                wall.x, wall.y, wall.width, wall.height)) {
                collisionFound = true;
                break;
            }
        }
        
        if (!collisionFound) {
            return pos;
        }
    }
    
  
    const gridSize = TILE_SIZE / 2;
    const rows = Math.floor(gameHeight / gridSize);
    const cols = Math.floor(gameWidth / gridSize);
    
    for (let y = 1; y < rows - 1; y++) {
        for (let x = 1; x < cols - 1; x++) {
            const testX = x * gridSize;
            const testY = y * gridSize;
            
            let collisionFound = false;
            
            for (const wall of walls) {
                if (checkCollision(
                    testX, testY, objectSize, objectSize,
                    wall.x, wall.y, wall.width, wall.height)) {
                    collisionFound = true;
                    break;
                }
            }
            
            if (!collisionFound) {
                return { x: testX, y: testY };
            }
        }
    }
    
    // Fallback
    return { x: gameWidth / 2, y: gameHeight / 2 };
}

function checkCollision(x1, y1, width1, height1, x2, y2, width2, height2) {
    return (
        x1 < x2 + width2 &&
        x1 + width1 > x2 &&
        y1 < y2 + height2 &&
        y1 + height1 > y2
    );
}

function calculateDistance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

function getRandomColor(alpha) {
    const r = Math.floor(Math.random() * 255);
    const g = Math.floor(Math.random() * 255);
    const b = Math.floor(Math.random() * 255);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getMaxLightRadius(currentLevel) {
    if (currentLevel >= REDUCED_LIGHT_LEVEL) {
        return MAX_LIGHT_RADIUS * REDUCED_LIGHT_FACTOR;
    }
    return MAX_LIGHT_RADIUS;
}
