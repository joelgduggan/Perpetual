
var MAX_PARTICLES = 1500;
var particles  = [];

var PARTICLE_SPARK       = 0;		// type of particle that occurs when enemy is being hit by laser
var PARTICLE_WAVE        = 1;		// shock-wave caused by enemy exploding

var PARTICLE_LIFETIME = [0.3, 14];	// lifetimes for each particle type
var PARTICLE_NUM      = [2,  1 ];	// number of particles spawned in each type

var SPARK_SIZE           = 1.5;		// size of the spark particles
var WAVE_WIDTH           = 15;		// width of wave particles

//
// Particle - a single particle
//

function Particle() {

	this.active    = false;
	this.type      = 0;
	this.position  = new Vector2();
	this.velocity  = new Vector2();
	this.aliveTime = 0;
	this.lifeTime  = 0;
	this.color     = null;
	this.radius    = null;
}

Particle.prototype.spawn = function(type, position) {

	this.active   = true;
	this.type     = type;
	this.position.setVector2(position);
	this.aliveTime= 0;
	this.lifeTime = PARTICLE_LIFETIME[this.type];	
	
	if (type == PARTICLE_WAVE) 
		this.velocity.set(0, 0);
};

Particle.prototype.update = function() {

	this.position.x += this.velocity.x * delta;
	this.position.y += this.velocity.y * delta;

	if ((this.aliveTime += delta) >= this.lifeTime)
		this.active = false;
};

Particle.prototype.drawWave = function(ctx) {

	var r = this.aliveTime * 150.0 + this.radius;
	var x = 1.0 - this.aliveTime / this.lifeTime;
	
	this.color.a = x * 0.8;
	if (this.color.a < 0.001) this.color.a = 0;		// sometimes this would cause color string to revert to scientific notation, which caused an invalid string error
	
	ctx.lineWidth   = WAVE_WIDTH * x;
	if (highRenderQuality)
		ctx.strokeStyle = this.color.toStringRGBA();
	else
		ctx.strokeStyle = this.color.toStringRGB();
	ctx.beginPath();
	ctx.arc(this.position.x, this.position.y, r, 0, Math.PI2);
	ctx.stroke();
};


//
// ParticleEngine - does all the work of containg the particles
//

function ParticleEngine() {

	for (var i = 0; i < MAX_PARTICLES; i++)
		particles[i] = new Particle();
	this.hasParticles = false;
}

ParticleEngine.prototype.clear = function() {

	for (var i = 0; i < MAX_PARTICLES; i++)
		particles[i].active = false;
};

ParticleEngine.prototype.addSparkParticles = function (position, enemyPosition, enemyVelocity, relativeAmount) {

	var num = (highRenderQuality ? PARTICLE_NUM[PARTICLE_SPARK] : 1) * relativeAmount;
	var a   = position.sub(enemyPosition).getAngle() - Math.PIOVER2;

	for (var i = 0; i < MAX_PARTICLES; i++) {
		
		if (!particles[i].active) {
			particles[i].spawn(PARTICLE_SPARK, position);
			
			// find a random velocity that points outward from the center of the enemy
			particles[i].velocity.set(Math.random() * 60.0, a + Math.random() * Math.PI).convertToCartesianEquals();	
			particles[i].velocity.addEquals(enemyVelocity);
			
			if (--num <= 0)
				break;
		}
	}
};

ParticleEngine.prototype.addWaveParticle = function(position, color, radius) {

	for (var i = 0; i < MAX_PARTICLES; i++) {
		if (!particles[i].active) {
		
			particles[i].spawn(PARTICLE_WAVE, position, null);
			particles[i].color    = color;
			particles[i].radius   = radius;

			if      (radius > 15) radius = 18;
			else if (radius < 5)  radius = 7;
			particles[i].lifeTime = radius / PARTICLE_LIFETIME[PARTICLE_WAVE];
			
			if (!highRenderQuality)
				particles[i].lifeTime *= 0.5;
			
			break;
		}
	}
};


//var maxCount = 0;

ParticleEngine.prototype.updateAndDraw = function (gamePaused, ctx) {
	//var count = 0;
	this.hasParticles = false;
	
	// if paused, don't update particles
	if (!gamePaused) {		
		for (var i = 0; i < MAX_PARTICLES; i++) {
			if (particles[i].active) 
				particles[i].update();	
		}	
	}
	
	// draw all sparks first
	ctx.strokeStyle = 'rgb(255,255,150)';
	ctx.lineWidth = SPARK_SIZE;
	ctx.beginPath();
	var m;
	
	for (i = 0; i < MAX_PARTICLES; i++) {
		if (particles[i].active && particles[i].type == PARTICLE_SPARK) {
			
			ctx.moveTo(particles[i].position.x, particles[i].position.y);
			m = i % 4;	
			
			switch (m) {
				case 0:  ctx.lineTo(particles[i].position.x, particles[i].position.y+0.5);	
						 break;
				case 1:  ctx.lineTo(particles[i].position.x, particles[i].position.y-0.5);
						 break;
				case 2:  ctx.lineTo(particles[i].position.x+0.5, particles[i].position.y);	
						 break;
				default: ctx.lineTo(particles[i].position.x-0.5, particles[i].position.y);	
			}
			this.hasParticles = true;
			//count++;
		}
	}
	ctx.stroke();
	
	// now anything else
	for (i = 0; i < MAX_PARTICLES; i++) {
		if (particles[i].active && particles[i].type == PARTICLE_WAVE) {
			//count++;
			particles[i].drawWave(ctx);		
			this.hasParticles = true;
		}
	}	
	
	/*
	if (count > maxCount) {
		maxCount = count;
		console.log('new max particles = ' + count);
	}*/
};