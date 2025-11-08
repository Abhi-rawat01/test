if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, width, height, radius) {
        this.moveTo(x + radius, y);
        this.lineTo(x + width - radius, y);
        this.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.lineTo(x + width, y + height - radius);
        this.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.lineTo(x + radius, y + height);
        this.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.lineTo(x, y + radius);
        this.quadraticCurveTo(x, y, x + radius, y);
    };
}

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        
        this.gameState = 'menu';
        this.distance = 0;
        this.fuel = 100;
        this.camera = { x: 0, y: 0 };
        
        this.gravity = 0.4;
        this.groundFriction = 0.85;
        this.airResistance = 0.99;
        
        this.car = this.createCar();
        this.terrain = [];
        this.collectibles = [];
        this.parallaxLayers = [];
        
        this.terrainSegments = 300;
        this.segmentWidth = 50;
        
        this.keys = {};
        this.sounds = this.createSounds();
        
        this.setupControls();
        this.generateTerrain();
        this.generateParallax();
        
        this.lastTime = 0;
        this.gameLoop();
    }
    
    createCar() {
        return {
            x: 100,
            y: 200,
            width: 50,
            height: 25,
            vx: 0,
            vy: 0,
            angle: 0,
            angularVelocity: 0,
            wheelBase: 25,
            suspension: 10,
            suspensionStiffness: 0.3,
            suspensionDamping: 0.8,
            wheels: [
                { 
                    x: -15, 
                    y: 12, 
                    radius: 10, 
                    onGround: false,
                    rotation: 0,
                    compression: 0
                },
                { 
                    x: 15, 
                    y: 12, 
                    radius: 10, 
                    onGround: false,
                    rotation: 0,
                    compression: 0
                }
            ],
            acceleration: 0.6,
            brakeForce: 0.4,
            maxSpeed: 10,
            fuelConsumption: 0.03,
            tiltForce: 0.002
        };
    }
    
    createSounds() {
        const audioContext = typeof AudioContext !== 'undefined' ? new AudioContext() : null;
        return {
            context: audioContext,
            playTone: (frequency, duration, volume = 0.1) => {
                if (!audioContext) return;
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.value = frequency;
                oscillator.type = 'square';
                
                gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + duration);
            },
            engine: () => {
                if (audioContext && Math.random() < 0.05) {
                    const speed = Math.abs(this.car.vx);
                    this.sounds.playTone(100 + speed * 20, 0.1, 0.05);
                }
            },
            collect: () => {
                this.sounds.playTone(800, 0.1, 0.1);
                this.sounds.playTone(1000, 0.1, 0.08);
            },
            crash: () => {
                this.sounds.playTone(100, 0.3, 0.15);
            }
        };
    }
    
    generateParallax() {
        this.parallaxLayers = [
            { 
                objects: this.generateMountains(5), 
                speed: 0.2, 
                color: '#9B9B9B',
                yOffset: 50
            },
            { 
                objects: this.generateMountains(8), 
                speed: 0.4, 
                color: '#ABABAB',
                yOffset: 80
            },
            { 
                objects: this.generateTrees(20), 
                speed: 0.7, 
                color: '#2ECC71',
                yOffset: 0
            }
        ];
    }
    
    generateMountains(count) {
        const mountains = [];
        for (let i = 0; i < count; i++) {
            mountains.push({
                x: i * 300,
                width: 200 + Math.random() * 100,
                height: 80 + Math.random() * 60
            });
        }
        return mountains;
    }
    
    generateTrees(count) {
        const trees = [];
        for (let i = 0; i < count; i++) {
            trees.push({
                x: i * 400 + Math.random() * 200,
                height: 30 + Math.random() * 20
            });
        }
        return trees;
    }
    
    generateTerrain() {
        this.terrain = [];
        this.collectibles = [];
        let height = this.height * 0.6;
        let slope = 0;
        
        for (let i = 0; i < this.terrainSegments; i++) {
            const random = Math.random();
            
            if (random < 0.15) {
                slope += (Math.random() - 0.5) * 0.5;
            }
            
            if (random > 0.9 && i > 10) {
                slope += (Math.random() > 0.5 ? 1 : -1) * 0.3;
            }
            
            slope *= 0.92;
            height += slope;
            
            height = Math.max(this.height * 0.3, Math.min(this.height * 0.75, height));
            
            height += Math.sin(i * 0.1) * 3;
            height += (Math.random() - 0.5) * 8;
            
            this.terrain.push({
                x: i * this.segmentWidth,
                y: height
            });
            
            if (i > 5 && i % 15 === 0 && Math.random() > 0.3) {
                this.collectibles.push({
                    x: i * this.segmentWidth,
                    y: height - 40,
                    type: 'fuel',
                    collected: false,
                    radius: 12,
                    bobOffset: 0
                });
            }
        }
    }
    
    setupControls() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            
            if (e.key === ' ' && this.gameState === 'playing') {
                e.preventDefault();
                this.restart();
            }
            
            if (e.key === 'Escape' && this.gameState === 'playing') {
                e.preventDefault();
                this.pauseGame();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });
        
        document.getElementById('startBtn').addEventListener('click', () => {
            this.startGame();
        });
        
        document.getElementById('pauseBtn').addEventListener('click', () => {
            this.pauseGame();
        });
        
        document.getElementById('homeBtn').addEventListener('click', () => {
            this.showMenu();
        });
        
        document.getElementById('resumeBtn').addEventListener('click', () => {
            this.resumeGame();
        });
        
        document.getElementById('restartFromPauseBtn').addEventListener('click', () => {
            this.restart();
        });
        
        document.getElementById('quitBtn').addEventListener('click', () => {
            this.showMenu();
        });
        
        document.getElementById('restartBtn').addEventListener('click', () => {
            this.restart();
        });
        
        document.getElementById('menuBtn').addEventListener('click', () => {
            this.showMenu();
        });
    }
    
    startGame() {
        this.gameState = 'playing';
        document.getElementById('menuOverlay').style.display = 'none';
        this.restart();
    }
    
    pauseGame() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            document.getElementById('pauseOverlay').style.display = 'flex';
        }
    }
    
    resumeGame() {
        if (this.gameState === 'paused') {
            this.gameState = 'playing';
            document.getElementById('pauseOverlay').style.display = 'none';
        }
    }
    
    showMenu() {
        this.gameState = 'menu';
        document.getElementById('menuOverlay').style.display = 'flex';
        document.getElementById('pauseOverlay').style.display = 'none';
        document.getElementById('gameOver').style.display = 'none';
    }
    
    updateCar(deltaTime) {
        if (this.gameState !== 'playing') return;
        
        if (this.keys['ArrowRight'] && this.fuel > 0) {
            const wheelForce = this.car.acceleration;
            this.car.vx += wheelForce * Math.cos(this.car.angle);
            this.car.vy += wheelForce * Math.sin(this.car.angle);
            this.fuel -= this.car.fuelConsumption;
            this.fuel = Math.max(0, this.fuel);
            this.sounds.engine();
        }
        
        if (this.keys['ArrowLeft']) {
            this.car.vx -= this.car.brakeForce * Math.cos(this.car.angle);
            this.car.vy -= this.car.brakeForce * Math.sin(this.car.angle);
        }
        
        if (this.keys['ArrowUp']) {
            this.car.angularVelocity += this.car.tiltForce;
        }
        
        if (this.keys['ArrowDown']) {
            this.car.angularVelocity -= this.car.tiltForce;
        }
        
        this.car.vy += this.gravity;
        this.car.vx *= this.airResistance;
        this.car.vy *= this.airResistance;
        
        const speed = Math.sqrt(this.car.vx * this.car.vx + this.car.vy * this.car.vy);
        if (speed > this.car.maxSpeed) {
            this.car.vx = (this.car.vx / speed) * this.car.maxSpeed;
            this.car.vy = (this.car.vy / speed) * this.car.maxSpeed;
        }
        
        this.car.x += this.car.vx;
        this.car.y += this.car.vy;
        
        this.car.angle += this.car.angularVelocity;
        this.car.angularVelocity *= 0.95;
        
        this.checkTerrainCollision();
        this.updateCarAngle();
        this.checkCollectibles();
        
        this.camera.x = this.car.x - this.width / 3;
        this.camera.y = this.car.y - this.height / 2;
        
        this.distance = Math.max(this.distance, Math.floor(this.car.x / 10));
        
        const isUpsideDown = Math.abs(this.car.angle % (Math.PI * 2)) > Math.PI / 2 && 
                            Math.abs(this.car.angle % (Math.PI * 2)) < Math.PI * 1.5;
        const headTouchingGround = this.car.wheels.some(w => w.onGround) && isUpsideDown;
        
        if (this.car.y > this.height + 100 || 
            (this.fuel <= 0 && Math.abs(this.car.vx) < 0.1) ||
            headTouchingGround) {
            this.gameOver();
        }
    }
    
    checkTerrainCollision() {
        let anyWheelOnGround = false;
        
        for (let wheel of this.car.wheels) {
            const cos = Math.cos(this.car.angle);
            const sin = Math.sin(this.car.angle);
            const wheelX = this.car.x + wheel.x * cos - wheel.y * sin;
            const wheelY = this.car.y + wheel.x * sin + wheel.y * cos;
            
            const terrainHeight = this.getTerrainHeight(wheelX);
            
            if (wheelY + wheel.radius > terrainHeight) {
                wheel.onGround = true;
                anyWheelOnGround = true;
                
                const overlap = (wheelY + wheel.radius) - terrainHeight;
                wheel.compression = Math.min(overlap, this.car.suspension);
                
                const suspensionForce = wheel.compression * this.car.suspensionStiffness;
                const dampingForce = this.car.vy * this.car.suspensionDamping;
                
                this.car.vy -= (suspensionForce + dampingForce);
                this.car.y -= overlap * 0.5;
                
                if (wheel.onGround) {
                    this.car.vx *= this.groundFriction;
                    wheel.rotation += this.car.vx * 0.2;
                }
                
                const terrainAngle = this.getTerrainAngle(wheelX);
                const normalX = -Math.sin(terrainAngle);
                const normalY = -Math.cos(terrainAngle);
                
                const dot = this.car.vx * normalX + this.car.vy * normalY;
                if (dot > 0) {
                    this.car.vx -= 1.3 * dot * normalX;
                    this.car.vy -= 1.3 * dot * normalY;
                }
            } else {
                wheel.onGround = false;
                wheel.compression = 0;
            }
        }
        
        return anyWheelOnGround;
    }
    
    getTerrainHeight(x) {
        for (let i = 0; i < this.terrain.length - 1; i++) {
            if (x >= this.terrain[i].x && x <= this.terrain[i + 1].x) {
                const t = (x - this.terrain[i].x) / (this.terrain[i + 1].x - this.terrain[i].x);
                return this.terrain[i].y + t * (this.terrain[i + 1].y - this.terrain[i].y);
            }
        }
        return this.terrain[this.terrain.length - 1].y;
    }
    
    getTerrainAngle(x) {
        for (let i = 0; i < this.terrain.length - 1; i++) {
            if (x >= this.terrain[i].x && x <= this.terrain[i + 1].x) {
                const dx = this.terrain[i + 1].x - this.terrain[i].x;
                const dy = this.terrain[i + 1].y - this.terrain[i].y;
                return Math.atan2(dy, dx);
            }
        }
        return 0;
    }
    
    updateCarAngle() {
        if (this.car.wheels[0].onGround || this.car.wheels[1].onGround) {
            const cos = Math.cos(this.car.angle);
            const sin = Math.sin(this.car.angle);
            
            const wheel1X = this.car.x + this.car.wheels[0].x * cos;
            const wheel2X = this.car.x + this.car.wheels[1].x * cos;
            
            const frontHeight = this.getTerrainHeight(wheel2X);
            const backHeight = this.getTerrainHeight(wheel1X);
            
            const targetAngle = Math.atan2(frontHeight - backHeight, this.car.wheels[1].x - this.car.wheels[0].x);
            
            const angleDiff = targetAngle - this.car.angle;
            this.car.angle += angleDiff * 0.15;
        }
    }
    
    checkCollectibles() {
        for (let collectible of this.collectibles) {
            if (!collectible.collected) {
                const dx = this.car.x - collectible.x;
                const dy = this.car.y - collectible.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < this.car.width / 2 + collectible.radius) {
                    collectible.collected = true;
                    this.fuel = Math.min(100, this.fuel + 25);
                    this.sounds.collect();
                }
            }
        }
    }
    
    render() {
        this.ctx.fillStyle = '#87CEEB';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        this.ctx.save();
        this.ctx.translate(-this.camera.x, -this.camera.y);
        
        this.drawParallax();
        this.drawTerrain();
        this.drawCollectibles();
        this.drawCar();
        
        this.ctx.restore();
        
        this.drawUI();
    }
    
    drawParallax() {
        for (let layer of this.parallaxLayers) {
            const offsetX = this.camera.x * layer.speed;
            
            if (layer.objects[0].width) {
                for (let mountain of layer.objects) {
                    const x = mountain.x - offsetX;
                    
                    if (x + mountain.width > this.camera.x && x < this.camera.x + this.width) {
                        this.ctx.fillStyle = layer.color;
                        this.ctx.beginPath();
                        this.ctx.moveTo(x, this.height);
                        this.ctx.lineTo(x, this.height - mountain.height + layer.yOffset);
                        this.ctx.lineTo(x + mountain.width / 2, this.height - mountain.height - 30 + layer.yOffset);
                        this.ctx.lineTo(x + mountain.width, this.height - mountain.height + layer.yOffset);
                        this.ctx.lineTo(x + mountain.width, this.height);
                        this.ctx.closePath();
                        this.ctx.fill();
                    }
                }
            } else {
                for (let tree of layer.objects) {
                    const x = tree.x - offsetX;
                    const terrainY = this.getTerrainHeight(tree.x);
                    
                    if (x > this.camera.x && x < this.camera.x + this.width) {
                        this.ctx.fillStyle = '#8B4513';
                        this.ctx.fillRect(x - 3, terrainY - tree.height, 6, tree.height);
                        
                        this.ctx.fillStyle = layer.color;
                        this.ctx.beginPath();
                        this.ctx.arc(x, terrainY - tree.height, 10, 0, Math.PI * 2);
                        this.ctx.fill();
                    }
                }
            }
        }
    }
    
    drawTerrain() {
        this.ctx.fillStyle = '#8B7355';
        this.ctx.strokeStyle = '#654321';
        this.ctx.lineWidth = 3;
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.terrain[0].x, this.terrain[0].y);
        
        for (let i = 1; i < this.terrain.length; i++) {
            this.ctx.lineTo(this.terrain[i].x, this.terrain[i].y);
        }
        
        this.ctx.lineTo(this.terrain[this.terrain.length - 1].x, this.height + 100);
        this.ctx.lineTo(this.terrain[0].x, this.height + 100);
        this.ctx.closePath();
        
        this.ctx.fill();
        this.ctx.stroke();
        
        this.ctx.strokeStyle = '#7CB342';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(this.terrain[0].x, this.terrain[0].y);
        for (let i = 1; i < this.terrain.length; i++) {
            this.ctx.lineTo(this.terrain[i].x, this.terrain[i].y);
        }
        this.ctx.stroke();
    }
    
    drawCollectibles() {
        for (let collectible of this.collectibles) {
            if (!collectible.collected) {
                collectible.bobOffset += 0.1;
                const bobY = Math.sin(collectible.bobOffset) * 5;
                
                this.ctx.save();
                this.ctx.translate(collectible.x, collectible.y + bobY);
                
                this.ctx.fillStyle = '#F39C12';
                this.ctx.strokeStyle = '#E67E22';
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                this.ctx.roundRect(
                    -collectible.radius, 
                    -collectible.radius, 
                    collectible.radius * 2, 
                    collectible.radius * 2, 
                    3
                );
                this.ctx.fill();
                this.ctx.stroke();
                
                this.ctx.fillStyle = '#E67E22';
                this.ctx.font = 'bold 14px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText('⛽', 0, 0);
                
                this.ctx.restore();
            }
        }
    }
    
    drawCar() {
        this.ctx.save();
        this.ctx.translate(this.car.x, this.car.y);
        this.ctx.rotate(this.car.angle);
        
        for (let wheel of this.car.wheels) {
            const springCompression = wheel.compression / this.car.suspension;
            
            this.ctx.save();
            this.ctx.translate(wheel.x, wheel.y - wheel.compression);
            
            if (springCompression > 0) {
                this.ctx.strokeStyle = '#34495e';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                const springSegments = 5;
                for (let i = 0; i <= springSegments; i++) {
                    const t = i / springSegments;
                    const x = Math.sin(t * Math.PI * 4) * 3;
                    const y = t * wheel.compression;
                    if (i === 0) this.ctx.moveTo(x, -y);
                    else this.ctx.lineTo(x, -y);
                }
                this.ctx.stroke();
            }
            
            this.ctx.fillStyle = wheel.onGround ? '#2c3e50' : '#34495e';
            this.ctx.strokeStyle = '#1a1a1a';
            this.ctx.lineWidth = 3;
            
            this.ctx.beginPath();
            this.ctx.arc(0, 0, wheel.radius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
            
            this.ctx.save();
            this.ctx.rotate(wheel.rotation);
            this.ctx.strokeStyle = '#666';
            this.ctx.lineWidth = 2;
            for (let i = 0; i < 4; i++) {
                const angle = (i * Math.PI / 2);
                this.ctx.beginPath();
                this.ctx.moveTo(0, 0);
                this.ctx.lineTo(
                    Math.cos(angle) * wheel.radius * 0.6,
                    Math.sin(angle) * wheel.radius * 0.6
                );
                this.ctx.stroke();
            }
            this.ctx.restore();
            
            this.ctx.restore();
        }
        
        this.ctx.fillStyle = '#e74c3c';
        this.ctx.strokeStyle = '#c0392b';
        this.ctx.lineWidth = 3;
        
        this.ctx.fillRect(-this.car.width/2, -this.car.height/2, this.car.width, this.car.height);
        this.ctx.strokeRect(-this.car.width/2, -this.car.height/2, this.car.width, this.car.height);
        
        this.ctx.fillStyle = '#c0392b';
        this.ctx.fillRect(-this.car.width/2 + 5, -this.car.height/2 + 5, this.car.width - 10, this.car.height - 10);
        
        this.ctx.fillStyle = '#3498db';
        this.ctx.fillRect(this.car.width/2 - 20, -this.car.height/2 + 3, 15, 8);
        
        this.ctx.fillStyle = '#34495e';
        this.ctx.beginPath();
        this.ctx.arc(-5, -this.car.height/2 - 8, 6, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.strokeStyle = '#2c3e50';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        this.ctx.restore();
    }
    
    drawUI() {
        document.getElementById('distance').textContent = `${this.distance}m`;
        document.getElementById('fuel').textContent = `${Math.floor(this.fuel)}%`;
        
        const fuelBar = document.getElementById('fuelBar');
        fuelBar.style.width = `${this.fuel}%`;
        
        if (this.fuel < 20) {
            fuelBar.style.background = 'linear-gradient(90deg, #e74c3c, #c0392b)';
        } else if (this.fuel < 50) {
            fuelBar.style.background = 'linear-gradient(90deg, #f39c12, #e67e22)';
        } else {
            fuelBar.style.background = 'linear-gradient(90deg, #27ae60, #229954)';
        }
        
        const speed = Math.sqrt(this.car.vx * this.car.vx + this.car.vy * this.car.vy);
        document.getElementById('speed').textContent = `${Math.floor(speed * 10)} km/h`;
    }
    
    gameLoop(currentTime = 0) {
        const deltaTime = Math.min((currentTime - this.lastTime) / 16.67, 2);
        this.lastTime = currentTime;
        
        if (this.gameState === 'playing') {
            this.updateCar(deltaTime);
        }
        
        this.render();
        
        requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    gameOver() {
        if (this.gameState === 'playing') {
            this.gameState = 'gameOver';
            this.sounds.crash();
            document.getElementById('finalDistance').textContent = `${this.distance}m`;
            document.getElementById('gameOver').style.display = 'flex';
        }
    }
    
    restart() {
        this.gameState = 'playing';
        this.distance = 0;
        this.fuel = 100;
        this.camera = { x: 0, y: 0 };
        
        this.car = this.createCar();
        this.generateTerrain();
        this.generateParallax();
        
        document.getElementById('gameOver').style.display = 'none';
        document.getElementById('pauseOverlay').style.display = 'none';
    }
}

window.addEventListener('load', () => {
    new Game();
});
