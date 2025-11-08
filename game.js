class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        
        // Game state
        this.gameRunning = true;
        this.distance = 0;
        this.fuel = 100;
        this.camera = { x: 0, y: 0 };
        
        // Physics constants
        this.gravity = 0.3;
        this.groundFriction = 0.8;
        this.airResistance = 0.99;
        
        // Car properties
        this.car = {
            x: 100,
            y: 200,
            width: 40,
            height: 20,
            vx: 0,
            vy: 0,
            angle: 0,
            angularVelocity: 0,
            wheelRadius: 8,
            wheels: [
                { x: -10, y: 10, radius: 8, onGround: false },
                { x: 10, y: 10, radius: 8, onGround: false }
            ],
            acceleration: 0.5,
            brakeForce: 0.3,
            maxSpeed: 8,
            fuelConsumption: 0.05
        };
        
        // Terrain
        this.terrain = [];
        this.terrainSegments = 200;
        this.segmentWidth = 50;
        this.generateTerrain();
        
        // Input
        this.keys = {};
        this.setupControls();
        
        // Start game loop
        this.lastTime = 0;
        this.gameLoop();
    }
    
    generateTerrain() {
        this.terrain = [];
        let height = this.height * 0.6;
        let slope = 0;
        
        for (let i = 0; i < this.terrainSegments; i++) {
            // Generate varied terrain with hills and valleys
            if (Math.random() < 0.1) {
                slope += (Math.random() - 0.5) * 0.3;
            }
            slope *= 0.95; // Smooth out slopes
            height += slope;
            
            // Keep terrain within reasonable bounds
            height = Math.max(this.height * 0.3, Math.min(this.height * 0.8, height));
            
            // Add some randomness
            height += (Math.random() - 0.5) * 5;
            
            this.terrain.push({
                x: i * this.segmentWidth,
                y: height
            });
        }
    }
    
    setupControls() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            
            if (e.key === ' ') {
                e.preventDefault();
                this.restart();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });
        
        document.getElementById('restartBtn').addEventListener('click', () => {
            this.restart();
        });
    }
    
    updateCar() {
        if (!this.gameRunning) return;
        
        // Handle input
        if (this.keys['ArrowRight'] && this.fuel > 0) {
            this.car.vx += this.car.acceleration * Math.cos(this.car.angle);
            this.car.vy += this.car.acceleration * Math.sin(this.car.angle);
            this.fuel -= this.car.fuelConsumption;
            this.fuel = Math.max(0, this.fuel);
        }
        
        if (this.keys['ArrowLeft']) {
            this.car.vx -= this.car.brakeForce * Math.cos(this.car.angle);
            this.car.vy -= this.car.brakeForce * Math.sin(this.car.angle);
        }
        
        // Apply physics
        this.car.vy += this.gravity;
        this.car.vx *= this.airResistance;
        this.car.vy *= this.airResistance;
        
        // Limit speed
        const speed = Math.sqrt(this.car.vx * this.car.vx + this.car.vy * this.car.vy);
        if (speed > this.car.maxSpeed) {
            this.car.vx = (this.car.vx / speed) * this.car.maxSpeed;
            this.car.vy = (this.car.vy / speed) * this.car.maxSpeed;
        }
        
        // Update position
        this.car.x += this.car.vx;
        this.car.y += this.car.vy;
        
        // Check collision with terrain
        this.checkTerrainCollision();
        
        // Update car angle based on wheels
        this.updateCarAngle();
        
        // Update camera
        this.camera.x = this.car.x - this.width / 2;
        this.camera.y = this.car.y - this.height / 2;
        
        // Update distance
        this.distance = Math.max(this.distance, Math.floor(this.car.x / 10));
        
        // Check game over conditions
        if (this.car.y > this.height + 100 || this.fuel <= 0 && Math.abs(this.car.vx) < 0.1) {
            this.gameOver();
        }
    }
    
    checkTerrainCollision() {
        let collision = false;
        
        for (let wheel of this.car.wheels) {
            const wheelX = this.car.x + wheel.x;
            const wheelY = this.car.y + wheel.y;
            
            // Find terrain height at wheel position
            const terrainHeight = this.getTerrainHeight(wheelX);
            
            if (wheelY + wheel.radius > terrainHeight) {
                // Collision detected
                wheel.onGround = true;
                collision = true;
                
                // Push wheel up
                const overlap = (wheelY + wheel.radius) - terrainHeight;
                this.car.y -= overlap;
                
                // Apply friction
                this.car.vx *= this.groundFriction;
                
                // Calculate normal force and bounce
                const terrainAngle = this.getTerrainAngle(wheelX);
                const normalX = -Math.sin(terrainAngle);
                const normalY = -Math.cos(terrainAngle);
                
                // Reflect velocity
                const dot = this.car.vx * normalX + this.car.vy * normalY;
                if (dot > 0) {
                    this.car.vx -= 1.5 * dot * normalX;
                    this.car.vy -= 1.5 * dot * normalY;
                }
            } else {
                wheel.onGround = false;
            }
        }
        
        return collision;
    }
    
    getTerrainHeight(x) {
        // Find the two terrain points that x is between
        for (let i = 0; i < this.terrain.length - 1; i++) {
            if (x >= this.terrain[i].x && x <= this.terrain[i + 1].x) {
                // Linear interpolation
                const t = (x - this.terrain[i].x) / (this.terrain[i + 1].x - this.terrain[i].x);
                return this.terrain[i].y + t * (this.terrain[i + 1].y - this.terrain[i].y);
            }
        }
        
        // If x is beyond the generated terrain, extend the last height
        return this.terrain[this.terrain.length - 1].y;
    }
    
    getTerrainAngle(x) {
        // Find the two terrain points that x is between
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
        // Calculate angle based on terrain under the car
        const frontHeight = this.getTerrainHeight(this.car.x + this.car.wheels[1].x);
        const backHeight = this.getTerrainHeight(this.car.x + this.car.wheels[0].x);
        
        const targetAngle = Math.atan2(frontHeight - backHeight, this.car.wheels[1].x - this.car.wheels[0].x);
        
        // Smooth angle transition
        const angleDiff = targetAngle - this.car.angle;
        this.car.angle += angleDiff * 0.1;
    }
    
    render() {
        // Clear canvas
        this.ctx.fillStyle = '#87CEEB';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Save context for camera transform
        this.ctx.save();
        this.ctx.translate(-this.camera.x, -this.camera.y);
        
        // Draw terrain
        this.drawTerrain();
        
        // Draw car
        this.drawCar();
        
        // Restore context
        this.ctx.restore();
        
        // Draw UI
        this.drawUI();
    }
    
    drawTerrain() {
        this.ctx.fillStyle = '#8B7355';
        this.ctx.strokeStyle = '#654321';
        this.ctx.lineWidth = 2;
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.terrain[0].x, this.terrain[0].y);
        
        for (let i = 1; i < this.terrain.length; i++) {
            this.ctx.lineTo(this.terrain[i].x, this.terrain[i].y);
        }
        
        // Fill bottom of screen
        this.ctx.lineTo(this.terrain[this.terrain.length - 1].x, this.height + 100);
        this.ctx.lineTo(this.terrain[0].x, this.height + 100);
        this.ctx.closePath();
        
        this.ctx.fill();
        this.ctx.stroke();
    }
    
    drawCar() {
        this.ctx.save();
        this.ctx.translate(this.car.x, this.car.y);
        this.ctx.rotate(this.car.angle);
        
        // Draw car body
        this.ctx.fillStyle = '#e74c3c';
        this.ctx.strokeStyle = '#c0392b';
        this.ctx.lineWidth = 2;
        
        this.ctx.fillRect(-this.car.width/2, -this.car.height/2, this.car.width, this.car.height);
        this.ctx.strokeRect(-this.car.width/2, -this.car.height/2, this.car.width, this.car.height);
        
        // Draw driver
        this.ctx.fillStyle = '#34495e';
        this.ctx.beginPath();
        this.ctx.arc(-5, -this.car.height/2 - 5, 4, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw wheels
        for (let wheel of this.car.wheels) {
            this.ctx.fillStyle = wheel.onGround ? '#2c3e50' : '#34495e';
            this.ctx.strokeStyle = '#1a1a1a';
            this.ctx.lineWidth = 2;
            
            this.ctx.beginPath();
            this.ctx.arc(wheel.x, wheel.y, wheel.radius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
            
            // Draw wheel spokes
            this.ctx.strokeStyle = '#666';
            this.ctx.lineWidth = 1;
            for (let i = 0; i < 4; i++) {
                const angle = (i * Math.PI / 2) + (this.car.x * 0.1);
                this.ctx.beginPath();
                this.ctx.moveTo(wheel.x, wheel.y);
                this.ctx.lineTo(
                    wheel.x + Math.cos(angle) * wheel.radius * 0.7,
                    wheel.y + Math.sin(angle) * wheel.radius * 0.7
                );
                this.ctx.stroke();
            }
        }
        
        this.ctx.restore();
    }
    
    drawUI() {
        // Update stats display
        document.getElementById('distance').textContent = `${this.distance}m`;
        document.getElementById('fuel').textContent = `${Math.floor(this.fuel)}%`;
        document.getElementById('speed').textContent = `${Math.floor(Math.sqrt(this.car.vx * this.car.vx + this.car.vy * this.car.vy) * 10)} km/h`;
    }
    
    gameLoop(currentTime = 0) {
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        this.updateCar();
        this.render();
        
        requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    gameOver() {
        this.gameRunning = false;
        document.getElementById('finalDistance').textContent = `${this.distance}m`;
        document.getElementById('gameOver').style.display = 'block';
    }
    
    restart() {
        this.gameRunning = true;
        this.distance = 0;
        this.fuel = 100;
        this.camera = { x: 0, y: 0 };
        
        this.car = {
            x: 100,
            y: 200,
            width: 40,
            height: 20,
            vx: 0,
            vy: 0,
            angle: 0,
            angularVelocity: 0,
            wheelRadius: 8,
            wheels: [
                { x: -10, y: 10, radius: 8, onGround: false },
                { x: 10, y: 10, radius: 8, onGround: false }
            ],
            acceleration: 0.5,
            brakeForce: 0.3,
            maxSpeed: 8,
            fuelConsumption: 0.05
        };
        
        this.generateTerrain();
        document.getElementById('gameOver').style.display = 'none';
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    new Game();
});