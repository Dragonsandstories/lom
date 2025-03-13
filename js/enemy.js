// =========================
// FIENDEKLASSER
// =========================
class Enemy {
    constructor(scene, x, y, level) {
        this.scene = scene;
        
        // Grundläggande egenskaper
        this.x = x;
        this.y = y;
        this.radius = ENEMY_SIZE / 2;
        this.speed = ENEMY_SPEED * (1 + (level - 1) * 0.1);
        this.direction = Math.random() * Math.PI * 2;
        
        // AI-egenskaper
        this.detectionRadius = ENEMY_DETECTION_RADIUS;
        this.state = 'patrol';
        
        // Skjutegenskaper
        this.lastShotTime = 0;
        this.shootCooldown = 2000 + Math.random() * 3000;
        this.preparingToShoot = false;
        this.prepareTime = 0;
        
        // Statusvariabler
        this.stunned = false;
        this.stunnedUntil = 0;
        
        // Animationsvariabler
        this.shakeOffset = { x: 0, y: 0 };
        this.shakeIntensity = 0;
        
        // Grafik
        this.sprite = scene.add.circle(x, y, this.radius, 0x330000);
        this.eyesContainer = scene.add.container(x, y);
        
        // Skapa ögon
        const eyeRadius = this.radius / 4;
        const eyeDistance = this.radius / 2;
        
        this.leftEye = scene.add.circle(
            Math.cos(this.direction - 0.4) * eyeDistance,
            Math.sin(this.direction - 0.4) * eyeDistance,
            eyeRadius, 0xff0000
        );
        
        this.rightEye = scene.add.circle(
            Math.cos(this.direction + 0.4) * eyeDistance,
            Math.sin(this.direction + 0.4) * eyeDistance,
            eyeRadius, 0xff0000
        );
        
        this.eyesContainer.add([this.leftEye, this.rightEye]);
        
        // Skapa stun-effekt (inaktiv till att börja med)
        this.stunEffect = scene.add.circle(x, y, this.radius * 1.2, 0xffffff, 0);
    }
    
    update(time, delta) {
        // Kontrollera och uppdatera stun-status
        if (this.stunned && time >= this.stunnedUntil) {
            this.stunned = false;
            this.stunEffect.setAlpha(0);
        }
        
        // Skippa uppdateringar om fienden är stunnad
        if (this.stunned) {
            this.updateSprite();
            return;
        }
        
        const player = this.scene.player;
        
        // Beräkna avstånd till spelaren
        const dx = player.x + player.radius - this.x;
        const dy = player.y + player.radius - this.y;
        const distanceToPlayer = Math.hypot(dx, dy);
        
        // Detektionsradie beror på om spelaren har ljuset på
        const playerDetectionRadius = player.isLightOn ? 
            Math.min(this.detectionRadius, player.lightRadius * 1.5) : 
            this.detectionRadius / 3;
        
        if (distanceToPlayer < playerDetectionRadius && player.isLightOn) {
            // Upptäckt spelaren
            this.state = 'chase';
            this.direction = Math.atan2(dy, dx);
            
            // Hantera skjutbeteende
            if (distanceToPlayer < this.detectionRadius * 0.8) {
                if (!this.preparingToShoot) {
                    this.prepareToShoot(time);
                } else {
                    // Uppdatera skakanimation under förberedelse
                    const prepareDuration = 1000; // 1 sekund förberedelse
                    this.shakeIntensity = Math.min(1, (time - this.prepareTime) / prepareDuration);
                    this.shakeOffset.x = (Math.random() - 0.5) * this.shakeIntensity * 4;
                    this.shakeOffset.y = (Math.random() - 0.5) * this.shakeIntensity * 4;
                    
                    if (time - this.prepareTime >= prepareDuration) {
                        this.shoot();
                    }
                }
            }
        } else if (distanceToPlayer < this.radius + player.radius) {
            // Fienden har fångat spelaren
            this.scene.endGame("Spelet är över! En mörkrets varelse fångade dig!");
            return;
        } else if (this.state === 'chase' && (distanceToPlayer > this.detectionRadius || !player.isLightOn)) {
            this.state = 'patrol';
            this.direction = Math.random() * Math.PI * 2;
            
            // Avbryt eventuell förberedelse för skott
            this.preparingToShoot = false;
            this.shakeIntensity = 0;
            this.shakeOffset = { x: 0, y: 0 };
        } else if (this.state === 'patrol' && Math.random() < 0.01) {
            
            this.direction = Math.random() * Math.PI * 2;
        }
        
        // Flytta fienden
        const speedMultiplier = this.state === 'chase' ? 1.2 : 1;
        const moveDistance = this.speed * speedMultiplier * (delta / 1000);
        
        const newX = this.x + Math.cos(this.direction) * moveDistance;
        const newY = this.y + Math.sin(this.direction) * moveDistance;
        
        this.moveWithCollision(newX, newY);
        
        // Uppdatera grafik
        this.updateSprite();
    }
    
    moveWithCollision(newX, newY) {
        // Kontrollera x-rörelse
        const potentialX = {
            x: newX,
            y: this.y,
            width: this.radius * 2,
            height: this.radius * 2
        };
        
        let xCollision = false;
        for (const wall of this.scene.maze) {
            if (checkCollision(
                potentialX.x, potentialX.y, potentialX.width, potentialX.height,
                wall.x, wall.y, wall.width, wall.height
            )) {
                xCollision = true;
                break;
            }
        }
        
        if (!xCollision) {
            this.x = newX;
        }
        
        // Kontrollera y-rörelse
        const potentialY = {
            x: this.x,
            y: newY,
            width: this.radius * 2,
            height: this.radius * 2
        };
        
        let yCollision = false;
        for (const wall of this.scene.maze) {
            if (checkCollision(
                potentialY.x, potentialY.y, potentialY.width, potentialY.height,
                wall.x, wall.y, wall.width, wall.height
            )) {
                yCollision = true;
                break;
            }
        }
        
        if (!yCollision) {
            this.y = newY;
        } else if (this.state === 'patrol' && (xCollision || yCollision)) {
            // Byt riktning om fienden träffar en vägg under patrull
            this.direction = Math.random() * Math.PI * 2;
        }
    }
    
    prepareToShoot(time) {
        if (time - this.lastShotTime < this.shootCooldown || this.preparingToShoot) {
            return;
        }
        
        // Börja förbereda skott
        this.preparingToShoot = true;
        this.prepareTime = time;
        this.shakeIntensity = 0;
    }
    
    shoot() {
        // Skapa projektil i scenen
        const dx = this.scene.player.x + this.scene.player.radius - this.x;
        const dy = this.scene.player.y + this.scene.player.radius - this.y;
        const angle = Math.atan2(dy, dx);
        
        // Skapa projektileffekten
        this.scene.createProjectileEffect(this.x, this.y, angle);
        
        // Skapa själva projektilen
        this.scene.createDarkProjectile(this.x, this.y, angle);
        
        // Återställ fiendestatus
        this.preparingToShoot = false;
        this.shakeIntensity = 0;
        this.shakeOffset = { x: 0, y: 0 };
        this.lastShotTime = this.scene.time.now;
        this.shootCooldown = 2000 + Math.random() * 3000;
    }
    
    stun(endTime) {
        this.stunned = true;
        this.stunnedUntil = endTime;
        this.stunEffect.setAlpha(0.5);
    }
    
    updateSprite() {
        const player = this.scene.player;
        
        // Beräkna avstånd till spelaren för att avgöra synlighet
        const distanceToPlayer = calculateDistance(
            this.x, this.y,
            player.x + player.radius, player.y + player.radius
        );
        
        // Kontrollera om fienden är inom ljusradien
        const isInLight = distanceToPlayer <= player.lightRadius;
        const visibilityFactor = isInLight ? 1 : 0;
        
        // Uppdatera huvudposition
        const spriteX = this.x + this.shakeOffset.x;
        const spriteY = this.y + this.shakeOffset.y;
        
        this.sprite.setPosition(spriteX, spriteY);
        this.eyesContainer.setPosition(spriteX, spriteY);
        this.stunEffect.setPosition(this.x, this.y);
        
        // Sätt synlighet baserat på om fienden är i ljuset
        this.sprite.setAlpha(visibilityFactor);
        this.eyesContainer.setAlpha(visibilityFactor);
        this.stunEffect.setAlpha(this.stunned ? 0.5 * visibilityFactor : 0);
        
        // Uppdatera färg baserat på skjutförberedelse
        const preparingColor = this.preparingToShoot ? 
            Math.min(50, this.shakeIntensity * 20) : 0;
        
        this.sprite.setFillStyle(0x330000 + preparingColor * 0x001100);
        
        // Uppdatera ögonposition
        const eyeDistance = this.radius / 2;
        
        this.leftEye.setPosition(
            Math.cos(this.direction - 0.4) * eyeDistance,
            Math.sin(this.direction - 0.4) * eyeDistance
        );
        
        this.rightEye.setPosition(
            Math.cos(this.direction + 0.4) * eyeDistance,
            Math.sin(this.direction + 0.4) * eyeDistance
        );
    }
    
    destroy() {
        this.sprite.destroy();
        this.leftEye.destroy();
        this.rightEye.destroy();
        this.eyesContainer.destroy();
        this.stunEffect.destroy();
    }
}

// =========================
// PROJEKTILKLASSER
// =========================
class DarkProjectile {
    constructor(scene, x, y, direction) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.radius = DARK_PROJECTILE_SIZE;
        this.speed = DARK_PROJECTILE_START_SPEED;
        this.direction = direction;
        this.age = 0;
        
        this.sprite = scene.add.circle(x, y, this.radius, 0x500050);
        this.coreSprite = scene.add.circle(x, y, this.radius * 0.5, 0x800080);
        this.auraSprite = scene.add.circle(x, y, this.radius * 3, 0x400040, 0.3);
    }
    
    update(time, delta) {
        this.age += delta;
        
        // Öka hastighet gradvis
        this.speed = Math.min(
            DARK_PROJECTILE_MAX_SPEED,
            this.speed + DARK_PROJECTILE_ACCEL
        );
        
        
        const moveDistance = this.speed * (delta / 1000);
        this.x += Math.cos(this.direction) * moveDistance;
        this.y += Math.sin(this.direction) * moveDistance;
        
        
        if (Math.random() < 0.3) {
            this.createTailParticle();
        }
        
        // Kontrollera kollision med spelaren
        this.checkPlayerCollision();
        
        // Kontrollera kollision med väggar
        if (this.checkWallCollision()) {
            this.scene.createExplosionEffect(this.x, this.y, 10);
            this.destroy();
            return true;
        }
        
        // Ta bort projektil utanför skärmen
        if (
            this.x < -this.radius || 
            this.x > this.scene.game.config.width + this.radius ||
            this.y < -this.radius || 
            this.y > this.scene.game.config.height + this.radius
        ) {
            this.destroy();
            return true;
        }
        
        // Uppdatera grafik
        this.updateSprite();
        
        return false;
    }
    
    checkPlayerCollision() {
        const player = this.scene.player;
        const distance = calculateDistance(
            this.x, this.y,
            player.x + player.radius, player.y + player.radius
        );
        
        if (distance < this.radius + player.radius) {
            // Projektil träffade spelaren
            this.scene.createExplosionEffect(this.x, this.y, 20);
            this.scene.endGame("Spelet är över! Du träffades av en mörk projektil!");
            this.destroy();
            return true;
        }
        
        return false;
    }
    
    checkWallCollision() {
        for (const wall of this.scene.maze) {
            if (checkCollision(
                this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2,
                wall.x, wall.y, wall.width, wall.height
            )) {
                return true;
            }
        }
        return false;
    }
    
    createTailParticle() {
        this.scene.createProjectileParticle(
            this.x, this.y,
            this.direction + Math.PI + (Math.random() - 0.5) * 0.5,
            0.5 + Math.random() * 1,
            1 + Math.random() * 2,
            0.6,
            0.03 + Math.random() * 0.05
        );
    }
    
    updateSprite() {
        const player = this.scene.player;
        
        // Beräkna avstånd till spelaren för att avgöra synlighet
        const distanceToPlayer = calculateDistance(
            this.x, this.y,
            player.x + player.radius, player.y + player.radius
        );
        
        
        const isInLight = distanceToPlayer <= player.lightRadius;
        const visibilityFactor = isInLight ? 1 : 0;
        
        
        const pulseEffect = 0.2 * Math.sin(this.age * 0.001) + 0.8;
        
        
        this.sprite.setPosition(this.x, this.y);
        this.coreSprite.setPosition(this.x, this.y);
        this.auraSprite.setPosition(this.x, this.y);
        
        
        this.sprite.setAlpha(visibilityFactor);
        this.coreSprite.setAlpha(visibilityFactor);
        this.auraSprite.setAlpha(0.3 * pulseEffect * visibilityFactor);
    }
    
    destroy() {
        this.sprite.destroy();
        this.coreSprite.destroy();
        this.auraSprite.destroy();
    }
}

// =========================
// PARTIKELKLASSER
// =========================
class ProjectileParticle {
    constructor(scene, x, y, direction, speed, size, life, decay) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.direction = direction;
        this.speed = speed;
        this.size = size;
        this.life = life;
        this.decay = decay;
        
        // Grafik
        this.sprite = scene.add.circle(x, y, size, 0x500050);
    }
    
    update(delta) {
        // Flytta partikeln
        const moveDistance = this.speed * (delta / 1000);
        this.x += Math.cos(this.direction) * moveDistance;
        this.y += Math.sin(this.direction) * moveDistance;
        
        // Minska livslängd
        this.life -= this.decay * (delta / 16);
        
        if (this.life <= 0) {
            this.destroy();
            return true;
        }
        
        
        const player = this.scene.player;
        const distanceToPlayer = calculateDistance(
            this.x, this.y,
            player.x + player.radius, player.y + player.radius
        );
        
        // Kontrollera om partikeln är inom ljusradien
        const isInLight = distanceToPlayer <= player.lightRadius;
        const visibilityFactor = isInLight ? 1 : 0;
        
        // Uppdatera grafik
        this.sprite.setPosition(this.x, this.y);
        this.sprite.setAlpha(this.life * visibilityFactor);
        
        return false;
    }
    
    destroy() {
        this.sprite.destroy();
    }
}