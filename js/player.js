// =========================
// SPELARKLASSEN
// =========================
class Player {
    constructor(scene, x, y) {
        this.scene = scene;
        
        // Grundläggande egenskaper
        this.x = x;
        this.y = y;
        this.radius = PLAYER_SIZE / 2;
        this.speed = PLAYER_SPEED;
        this.currentSpeed = PLAYER_SPEED;
        
        // Statusvariabler
        this.isSprinting = false;
        this.isTired = false;
        this.tiredUntil = 0;
        this.stamina = MAX_STAMINA;
        this.isMoving = false;
        this.direction = 0;
        
        // Ljusrelaterade egenskaper
        this.lightRadius = getMaxLightRadius(scene.currentLevel);
        this.lightIntensity = 100;
        this.isLightOn = true;
        
        // Ficklampa
        this.flashlightActive = false;
        this.flashlightEndTime = 0;
        
        // Spelrelaterade egenskaper
        this.crystalsCollected = 0;
        this.score = 0;
        
        this.container = scene.add.container(x + this.radius, y + this.radius);
        
        
        this.body = scene.add.circle(0, 0, this.radius, 0xffffff);
        this.bodyGlow = scene.add.circle(0, 0, this.radius * 1.2, 0xffffcc, 0.3);
        
        
        const eyeRadius = this.radius * 0.25;
        this.leftEye = scene.add.circle(-this.radius * 0.3, -this.radius * 0.2, eyeRadius, 0x000000);
        this.rightEye = scene.add.circle(this.radius * 0.3, -this.radius * 0.2, eyeRadius, 0x000000);
        
        
        const pupilRadius = eyeRadius * 0.6;
        this.leftPupil = scene.add.circle(-this.radius * 0.3, -this.radius * 0.2, pupilRadius, 0x4080ff);
        this.rightPupil = scene.add.circle(this.radius * 0.3, -this.radius * 0.2, pupilRadius, 0x4080ff);
        
        // Antenner
        const antennaLength = this.radius * 0.8;
        const antennaWidth = 2;
        
        // Vänster antenn grafik
        this.leftAntenna = scene.add.graphics();
        this.leftAntenna.lineStyle(antennaWidth, 0xffffff, 1);
        this.leftAntenna.lineBetween(-this.radius * 0.3, -this.radius * 0.7, -this.radius * 0.5, -this.radius * 1.3);
        this.leftAntennaTip = scene.add.circle(-this.radius * 0.5, -this.radius * 1.3, antennaWidth*1.5, 0xffffcc);
        
        // Höger antenn grafik
        this.rightAntenna = scene.add.graphics();
        this.rightAntenna.lineStyle(antennaWidth, 0xffffff, 1);
        this.rightAntenna.lineBetween(this.radius * 0.3, -this.radius * 0.7, this.radius * 0.5, -this.radius * 1.3);
        this.rightAntennaTip = scene.add.circle(this.radius * 0.5, -this.radius * 1.3, antennaWidth*1.5, 0xffffcc);
        
        // Mun
        this.mouth = scene.add.graphics();
        this.mouthHappy(); // Standard är glad mun
        
        // Lägg till allt till containern
        this.container.add([
            this.bodyGlow, 
            this.body, 
            this.leftEye, 
            this.rightEye, 
            this.leftPupil, 
            this.rightPupil, 
            this.leftAntenna,
            this.rightAntenna,
            this.leftAntennaTip,
            this.rightAntennaTip,
            this.mouth
        ]);
        
        // Förbättrad ljuseffekt med flera lager
        this.lightSprite = scene.add.circle(x + this.radius, y + this.radius, this.lightRadius, 0xffffcc, 0.4);
        
        // Inre ljuscirkel (mer intensiv)
        this.innerLightSprite = scene.add.circle(x + this.radius, y + this.radius, this.lightRadius * 0.6, 0xffffee, 0.3);
        
        // Yttre ljusglöd (subtil)
        this.outerLightSprite = scene.add.circle(x + this.radius, y + this.radius, this.lightRadius * 1.2, 0xffffcc, 0.1);
        
        this.flashlightSprite = null;
        
        // Effekter
        this.windEffects = [];
        
        // Pulseffekt timer
        this.pulseTime = 0;
    }
    
    // Olika mungrafik för olika lägen
    mouthHappy() {
        this.mouth.clear();
        this.mouth.lineStyle(2, 0x000000, 1);
        this.mouth.beginPath();
        this.mouth.arc(0, this.radius * 0.3, this.radius * 0.3, 0.1, Math.PI - 0.1, false);
        this.mouth.strokePath();
    }
    
    mouthSad() {
        this.mouth.clear();
        this.mouth.lineStyle(2, 0x000000, 1);
        this.mouth.beginPath();
        this.mouth.arc(0, this.radius * 0.5, this.radius * 0.3, Math.PI + 0.1, Math.PI * 2 - 0.1, false);
        this.mouth.strokePath();
    }
    
    mouthSurprised() {
        this.mouth.clear();
        this.mouth.fillStyle(0x000000, 1);
        this.mouth.fillCircle(0, this.radius * 0.3, this.radius * 0.15);
    }
    
    update(time, delta) {
        if (this.scene.isLevelTransitioning) {
            this.isMoving = false;
            return;
        }
        
        // Uppdatera trötthetsstatus
        if (this.isTired && time >= this.tiredUntil) {
            this.isTired = false;
        }
        
        // Uppdatera ficklampa
        this.updateFlashlight(time);
        
        // Hoppa över rörelse om ficklampa är aktiv
        if (this.flashlightActive) {
            this.isMoving = false;
            return;
        }
        
        // Hantera rörelse
        this.handleMovement(time, delta);
        
        // Uppdatera ljusradie baserat på intensitet
        if (this.isLightOn) {
            this.lightRadius = getMaxLightRadius(this.scene.currentLevel) * (this.lightIntensity / 100);
        } else {
            this.lightRadius = MIN_LIGHT_RADIUS;
        }
        
        // Uppdatera spelarens grafik
        this.updateSprites();
        
        // Kollisionshantering med kristaller
        this.checkCrystalCollisions();
    }
    
    handleMovement(time, delta) {
        const cursors = this.scene.cursors;
        const keys = this.scene.keys;
        
        // Beräkna rörelseriktning
        let dx = 0, dy = 0;
        
        if (cursors.up.isDown || keys.W.isDown) dy -= 1;
        if (cursors.down.isDown || keys.S.isDown) dy += 1;
        if (cursors.left.isDown || keys.A.isDown) dx -= 1;
        if (cursors.right.isDown || keys.D.isDown) dx += 1;
        
        // Normalisera diagonal rörelse
        if (dx !== 0 && dy !== 0) {
            dx *= 0.7071;
            dy *= 0.7071;
        }
        
        this.isMoving = (dx !== 0 || dy !== 0);
        
        if (this.isMoving) {
            this.direction = Math.atan2(dy, dx);
            
            // Hantera sprint och stamina
            const wantToSprint = (cursors.shift.isDown && !this.isTired && this.stamina > 0);
            
            if (wantToSprint) {
                this.isSprinting = true;
                this.stamina = Math.max(0, this.stamina - STAMINA_DRAIN_RATE * (delta / 16));
                
                if (this.stamina <= 0) {
                    this.isTired = true;
                    this.tiredUntil = time + TIRED_DURATION;
                    this.isSprinting = false;
                }
                
                // Öka hastighet gradvis
                this.currentSpeed = Phaser.Math.Linear(
                    this.currentSpeed,
                    PLAYER_MAX_SPRINT_SPEED,
                    0.1
                );
                
                // Minska ljusintensitet vid löpning
                if (this.isLightOn) {
                    this.lightIntensity = Math.max(50, this.lightIntensity - 0.1 * (delta / 16));
                    this.scene.updateLightLevelUI(Math.floor(this.lightIntensity));
                }
            } else {
                this.isSprinting = false;
                
                // Målhastighet beror på om spelaren är trött
                const targetSpeed = this.isTired ? PLAYER_TIRED_SPEED : PLAYER_SPEED;
                
                // Mjuk övergång till målhastigheten
                this.currentSpeed = Phaser.Math.Linear(
                    this.currentSpeed,
                    targetSpeed,
                    0.1
                );
            }
            
            // Beräkna ny position
            const newX = this.x + dx * this.currentSpeed * (delta / 1000);
            const newY = this.y + dy * this.currentSpeed * (delta / 1000);
            
            // Kollisionshantering
            this.moveWithCollision(newX, newY);
        } else {
            // Sakta ner när vi inte rör oss
            if (this.currentSpeed > this.speed) {
                this.currentSpeed = Phaser.Math.Linear(
                    this.currentSpeed,
                    this.speed,
                    0.15
                );
            }
            this.isSprinting = false;
        }
        
        // Återhämta stamina när vi inte springer
        if (!this.isSprinting && this.stamina < MAX_STAMINA) {
            this.stamina = Math.min(MAX_STAMINA, this.stamina + STAMINA_RECOVERY_RATE * (delta / 16));
        }
        
        // Återställ ljuset sakta om vi inte springer
        if (this.isLightOn && this.lightIntensity < 100 && (!this.isSprinting || !this.isMoving)) {
            this.lightIntensity = Math.min(100, this.lightIntensity + 0.01 * (delta / 16));
            this.scene.updateLightLevelUI(Math.floor(this.lightIntensity));
        }
        
        this.scene.updateStaminaUI(this.stamina, this.isTired);
    }
    
    moveWithCollision(newX, newY) {
        // Kontrollera x-rörelse
        if (!this.collideWithWalls(newX, this.y)) {
            this.x = newX;
        } else {
            // Försök glida längs väggen i x-led
            for (let offset = 1; offset <= this.radius; offset++) {
                if (!this.collideWithWalls(newX, this.y - offset)) {
                    this.x = newX;
                    this.y -= offset;
                    break;
                } else if (!this.collideWithWalls(newX, this.y + offset)) {
                    this.x = newX;
                    this.y += offset;
                    break;
                }
            }
        }
        
        // Kontrollera y-rörelse
        if (!this.collideWithWalls(this.x, newY)) {
            this.y = newY;
        } else {
            // Försök glida längs väggen i y-led
            for (let offset = 1; offset <= this.radius; offset++) {
                if (!this.collideWithWalls(this.x - offset, newY)) {
                    this.x -= offset;
                    this.y = newY;
                    break;
                } else if (!this.collideWithWalls(this.x + offset, newY)) {
                    this.x += offset;
                    this.y = newY;
                    break;
                }
            }
        }
    }
    
    collideWithWalls(x, y) {
        const playerObj = {
            x: x,
            y: y,
            width: this.radius * 2,
            height: this.radius * 2
        };
        
        for (const wall of this.scene.maze) {
            if (checkCollision(
                playerObj.x, playerObj.y, playerObj.width, playerObj.height,
                wall.x, wall.y, wall.width, wall.height
            )) {
                return true;
            }
        }
        return false;
    }
    
    toggleLight() {
        this.isLightOn = !this.isLightOn;
        
        if (this.isLightOn) {
            this.lightRadius = getMaxLightRadius(this.scene.currentLevel) * (this.lightIntensity / 100);
        } else {
            this.lightRadius = MIN_LIGHT_RADIUS;
        }
        
        this.scene.updateLightLevelUI(this.isLightOn ? Math.floor(this.lightIntensity) : 0);
    }
    
    activateFlashlight() {
        if (this.flashlightActive) return;
        
        this.flashlightActive = true;
        this.flashlightEndTime = this.scene.time.now + FLASHLIGHT_DURATION;
        
        // Skapa ficklampskon om den inte redan finns
        if (!this.flashlightSprite) {
            this.createFlashlightSprite();
        }
        
        // Stanna fiender inom ficklampsområdet
        this.scene.enemies.forEach(enemy => {
            const dx = enemy.x - this.x;
            const dy = enemy.y - this.y;
            const distanceToEnemy = Math.sqrt(dx * dx + dy * dy);
            
            if (distanceToEnemy <= FLASHLIGHT_RANGE) {
                const angleToEnemy = Math.atan2(dy, dx);
                
                let angleDiff = angleToEnemy - this.direction;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                
                if (Math.abs(angleDiff) <= FLASHLIGHT_ANGLE / 2) {
                    enemy.stun(this.scene.time.now + ENEMY_STUN_DURATION);
                }
            }
        });
    }
    
    updateFlashlight(time) {
        if (this.flashlightActive && time >= this.flashlightEndTime) {
            this.flashlightActive = false;
            
            // Ta bort ficklampsgrafikobjektet när det inte används
            if (this.flashlightSprite) {
                this.flashlightSprite.clear(); // Rensa grafiken
                this.flashlightSprite.destroy();
                this.flashlightSprite = null;
            }
        }
        
        // Uppdatera ficklampsposition om den är aktiv
        if (this.flashlightActive && this.flashlightSprite) {
            this.updateFlashlightSprite();
        }
    }
    
    createFlashlightSprite() {
        // Skapa ett mer realistiskt ficklampsljus
        const centerX = this.x + this.radius;
        const centerY = this.y + this.radius;
        
        // Ta bort befintlig ficklampa om den finns
        if (this.flashlightSprite) {
            this.flashlightSprite.destroy();
        }
        
        // Skapa Graphics-objekt för ficklampan
        this.flashlightSprite = this.scene.add.graphics();
        
        // Definiera ficklampans form med mjukare kanter
        const startAngle = this.direction - FLASHLIGHT_ANGLE / 2;
        const endAngle = this.direction + FLASHLIGHT_ANGLE / 2;
        
        // Skapa en gradient från centrum till ytterkanterna
        // Inre glöd (intensiv)
        this.flashlightSprite.fillStyle(0xffffcc, 0.9);
        this.flashlightSprite.beginPath();
        this.flashlightSprite.moveTo(centerX, centerY);
        
        // Rita en båge med fler punkter för mjukare form
        const steps = 25;
        const shortRadius = FLASHLIGHT_RANGE * 0.1;
        
        for (let i = 0; i <= steps; i++) {
            const angle = startAngle + (endAngle - startAngle) * (i / steps);
            const x = centerX + Math.cos(angle) * shortRadius;
            const y = centerY + Math.sin(angle) * shortRadius;
            this.flashlightSprite.lineTo(x, y);
        }
        this.flashlightSprite.closePath();
        this.flashlightSprite.fill();
        
        // Mellanskikt (medium intensitet)
        this.flashlightSprite.fillStyle(0xffffaa, 0.6);
        this.flashlightSprite.beginPath();
        this.flashlightSprite.moveTo(centerX, centerY);
        
        const mediumRadius = FLASHLIGHT_RANGE * 0.5;
        for (let i = 0; i <= steps; i++) {
            const angle = startAngle + (endAngle - startAngle) * (i / steps);
            const x = centerX + Math.cos(angle) * mediumRadius;
            const y = centerY + Math.sin(angle) * mediumRadius;
            this.flashlightSprite.lineTo(x, y);
        }
        this.flashlightSprite.closePath();
        this.flashlightSprite.fill();
        
        // Yttre skikt (svag intensitet)
        this.flashlightSprite.fillStyle(0xffff88, 0.3);
        this.flashlightSprite.beginPath();
        this.flashlightSprite.moveTo(centerX, centerY);
        
        for (let i = 0; i <= steps; i++) {
            const angle = startAngle + (endAngle - startAngle) * (i / steps);
            const x = centerX + Math.cos(angle) * FLASHLIGHT_RANGE;
            const y = centerY + Math.sin(angle) * FLASHLIGHT_RANGE;
            this.flashlightSprite.lineTo(x, y);
        }
        this.flashlightSprite.closePath();
        this.flashlightSprite.fill();
        
        // Lägg till ljusstrålar för realism
        this.flashlightSprite.lineStyle(1, 0xffffdd, 0.2);
        for (let i = 0; i <= 5; i++) {
            const rayAngle = startAngle + (endAngle - startAngle) * (i / 5);
            this.flashlightSprite.beginPath();
            this.flashlightSprite.moveTo(centerX, centerY);
            const rayX = centerX + Math.cos(rayAngle) * FLASHLIGHT_RANGE;
            const rayY = centerY + Math.sin(rayAngle) * FLASHLIGHT_RANGE;
            this.flashlightSprite.lineTo(rayX, rayY);
            this.flashlightSprite.strokePath();
        }
    }
    
    updateFlashlightSprite() {
        this.createFlashlightSprite();
    }
    
    updateSprites() {
        this.container.setPosition(this.x + this.radius, this.y + this.radius);
        
        // Pulseffekt för varelsen och ljuset
        this.pulseTime += 0.03;
        const pulse = Math.sin(this.pulseTime) * 0.1 + 0.9; // Mellan 0.8 och 1.0
        
        // Ögonriktning baserad på rörelseriktning
        if (this.isMoving) {
            // Flytta pupillerna i riktningen varelsen rör sig
            const eyeOffset = this.radius * 0.1;
            const pupilDx = Math.cos(this.direction) * eyeOffset;
            const pupilDy = Math.sin(this.direction) * eyeOffset;
            
            this.leftPupil.setPosition(-this.radius * 0.3 + pupilDx, -this.radius * 0.2 + pupilDy);
            this.rightPupil.setPosition(this.radius * 0.3 + pupilDx, -this.radius * 0.2 + pupilDy);
        } else {
            // Återställ pupillerna till centrum när varelsen inte rör sig
            this.leftPupil.setPosition(-this.radius * 0.3, -this.radius * 0.2);
            this.rightPupil.setPosition(this.radius * 0.3, -this.radius * 0.2);
        }
        
        // Animera antennerna baserat på hastighet och riktning
        if (this.isMoving) {
            const antennaAngle = Math.sin(this.pulseTime * 3) * 0.2;
            
            // Vänster antenn
            this.leftAntenna.clear();
            this.leftAntenna.lineStyle(2, 0xffffff, 1);
            const leftAntennaEndX = -this.radius * 0.5 - Math.cos(this.direction + antennaAngle) * this.radius * 0.3;
            const leftAntennaEndY = -this.radius * 1.3 - Math.sin(this.direction + antennaAngle) * this.radius * 0.3;
            this.leftAntenna.lineBetween(-this.radius * 0.3, -this.radius * 0.7, leftAntennaEndX, leftAntennaEndY);
            this.leftAntennaTip.setPosition(leftAntennaEndX, leftAntennaEndY);
            
            // Höger antenn
            this.rightAntenna.clear();
            this.rightAntenna.lineStyle(2, 0xffffff, 1);
            const rightAntennaEndX = this.radius * 0.5 - Math.cos(this.direction - antennaAngle) * this.radius * 0.3;
            const rightAntennaEndY = -this.radius * 1.3 - Math.sin(this.direction - antennaAngle) * this.radius * 0.3;
            this.rightAntenna.lineBetween(this.radius * 0.3, -this.radius * 0.7, rightAntennaEndX, rightAntennaEndY);
            this.rightAntennaTip.setPosition(rightAntennaEndX, rightAntennaEndY);
        }
        
        // Uppdatera ansikte baserat på tillstånd
        if (this.isTired) {
            this.mouthSad();
        } else if (this.isSprinting) {
            this.mouthSurprised();
        } else {
            this.mouthHappy();
        }
        
        // Pulserande glödeffekt
        this.bodyGlow.setAlpha(0.3 * pulse);
        
        const lightX = this.x + this.radius;
        const lightY = this.y + this.radius;
        
        // Bestäm ljusstyrka baserat på om ljuset är på
        const mainLightAlpha = this.isLightOn ? 0.4 * pulse : 0.15;
        const innerLightAlpha = this.isLightOn ? 0.3 * pulse : 0.1;
        const outerLightAlpha = this.isLightOn ? 0.15 * pulse : 0.05;
        
        this.lightSprite.setPosition(lightX, lightY);
        this.lightSprite.setRadius(this.lightRadius);
        this.lightSprite.setAlpha(mainLightAlpha);
        
        // Uppdatera inre ljus
        this.innerLightSprite.setPosition(lightX, lightY);
        this.innerLightSprite.setRadius(this.lightRadius * 0.6);
        this.innerLightSprite.setAlpha(innerLightAlpha);
        
        // Uppdatera yttre ljus
        this.outerLightSprite.setPosition(lightX, lightY);
        this.outerLightSprite.setRadius(this.lightRadius * 1.2);
        this.outerLightSprite.setAlpha(outerLightAlpha);
    }
    
    checkCrystalCollisions() {
        for (let i = 0; i < this.scene.crystals.length; i++) {
            const crystal = this.scene.crystals[i];
            
            if (!crystal.collected) {
                const distance = calculateDistance(
                    this.x + this.radius, this.y + this.radius,
                    crystal.x, crystal.y
                );
                
                if (distance < this.radius + crystal.radius) {
                    crystal.collect();
                    this.crystalsCollected++;
                    this.score += crystal.points;
                    
                    // Uppdatera UI
                    this.scene.updateCrystalsUI(this.crystalsCollected);
                    this.scene.updateScoreUI(this.score);
                    
                    // Kontrollera om nivån är avklarad
                    if (this.crystalsCollected >= this.scene.requiredCrystals) {
                        this.scene.nextLevel();
                    }
                }
            }
        }
    }
    
    resetForNewLevel(x, y) {
        // Återställ position
        this.x = x;
        this.y = y;
        
        // Återställ rörelsevariabler
        this.currentSpeed = this.speed;
        this.isSprinting = false;
        this.isTired = false;
        
        // Återställ ljus - anpassa till nivån
        this.lightRadius = getMaxLightRadius(this.scene.currentLevel);
        this.lightIntensity = 100;
        this.isLightOn = true;
        
        // Återställ ficklampa
        this.flashlightActive = false;
        if (this.flashlightSprite) {
            this.flashlightSprite.destroy();
            this.flashlightSprite = null;
        }
        
        // Återställ kristaller för DENNA nivå, men behåll totalräkningen
        this.crystalsCollected = 0;
        
        // Återställ stamina
        this.stamina = MAX_STAMINA;
        
        // Uppdatera UI för den nya nivån
        this.scene.updateLightLevelUI(100);
        this.scene.updateStaminaUI(this.stamina, false);
        this.scene.updateCrystalsUI(0);
        
        // Återställ ansiktsuttryck
        this.mouthHappy();
        
        // Uppdatera spelarens position
        this.updateSprites();
        
        console.log("Spelare återställd för nivå", this.scene.currentLevel, "med ljusradie", this.lightRadius);
    }
    
    destroy() {
        // Ta bort alla grafiska element
        this.container.destroy(); // Detta tar bort alla element i containern
        this.lightSprite.destroy();
        this.innerLightSprite.destroy();
        this.outerLightSprite.destroy();
        
        if (this.flashlightSprite) {
            this.flashlightSprite.destroy();
        }
    }
}