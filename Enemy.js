
// ENEMY_A = slow moving, straight to player
// ENEMY_B = fast moving, circular orbit
// ENEMY_C = fast moving, low health, smaller radius, straight to player
// ENEMY_D = very slow moving, large radius, high health, straight to player
// ENEMY_E = very fast moving, small radius, straight to player
// ENEMY_F = average size, straight to player with side-to-side motion
// ENEMY_G = very fast moving, small radius, circular orbit

var NUM_ENEMY_TYPES = 8;

var                 ENEMY_A = 0,       ENEMY_B = 1,         ENEMY_C = 2,          ENEMY_D = 3,          ENEMY_E = 4,         ENEMY_F = 5,           ENEMY_G = 6,        ENEMY_BONUS = 7;
var ENEMY_RADIUS = [10,                10,                  5,                    35,                   3,                   10,                    3,                  3];
var ENEMY_SPEED  = [25.0,              15.0,                40.0,                 7.0,                  120,                 20,                    120.0,              100];
var ENEMY_HEALTH = [1.0,               1.0,                 0.2,                  4.0,                  0.02,                1.0,                   0.02,               0.02 ];
var ENEMY_COLOR  = [getColor(255,0,0), getColor(255,0,255), getColor(10,100,255), getColor(255, 85, 0), getColor(10,200,255),getColor(210,20,255), getColor(220,80,220),getColor(255, 0,0)];
var ENEMY_RATIO  = [1.0,               1.0,                 2.0,                  0.3,                  0.5,                 0.7,                   0.5,                0.0];
var ENEMY_VOL    = [0.7,               0.7,                 0.35,                 1.0,                  0.35,                0.7,                   0.35,               0.35];
//  for ratio : 1 = average, 2 = twice as common, .5 = half as common

// calculate the ratio totals so we don't have to do it every frame
var ENEMY_RATIO_TOTAL = 0;
for (var i = 0; i < NUM_ENEMY_TYPES; i++)
	ENEMY_RATIO_TOTAL += ENEMY_RATIO[i];
	
// precalculate the color strings
var ENEMY_COLOR_STRING      = [];
var ENEMY_DARK_COLOR_STRING = [];
for (var i = 0; i < NUM_ENEMY_TYPES; i++) {
	var c = ENEMY_COLOR[i];
	ENEMY_COLOR_STRING[i]      = c.toStringRGB();
	ENEMY_DARK_COLOR_STRING[i] = getColorStringRGB(c.r * 0.3, c.g * 0.3, c.b * 0.3);
}

function Enemy() {

	this.prePosition     = new Vector2();	// for some enemies, this may hold a different value than the final position
	this.position        = new Vector2();	// this is the calculated actual position onscreen
	this.velocity        = new Vector2();	// not actually used to move enemy, its calculated after movement, helpful for other calculations
	this.speed           = 0;				// for enemy types that may have individual speeds
	this.cycle           = 0;				// used by certain enemies that have some sort of cyclic movement
	this.closestDistance = 0.0;				// used by laser algorithm to determine which enemies are hit first
	this.span            = new Span();		// defined every frame to what angle span the enemy occupies relative to the player
	this.dirFlag         = false;			// used to make some enemies go opposite direction
	this.health          = 0.0;				// 1 = full health, 0 = dead
	this.type	         = 0;	
	this.soundCount      = 0.0;
	this.hurtThisFrame   = false;
	this.hurtLastFrame   = false;
	this.menuItem        = null;
	this.menuText        = null;
	this.sound           = null;
}

Enemy.prototype.spawn = function (type) {

	this.health     = ENEMY_HEALTH[type];
	this.type       = type;
	
	// set radius and random angle
	this.prePosition.x = GAME_SIZE_DIV2 + ENEMY_RADIUS[type] + GLOW_SIZE;	// radius
	this.prePosition.y = Math.random() * Math.PI2;							// angle
	
	if (this.type == ENEMY_B || this.type == ENEMY_G) 	
		this.dirFlag = randBool();
}

Enemy.prototype.update = function (delta) {		

	this.velocity.setVector2(this.position);	// used to calculate velocity after new position found

	if (this.type == ENEMY_B || this.type == ENEMY_G) {		// move in circular orbit
		
		var speed = (this.type == ENEMY_B ? 0.7 : 0.9);
		this.prePosition.x -= ENEMY_SPEED[this.type] * delta;						// radius
		this.prePosition.y += ((this.dirFlag) ? (-1) : (1)) * speed * delta;		// angle
	}
	else if (this.type == ENEMY_BONUS) 
		this.prePosition.x -= this.speed * delta;
	else 
		this.prePosition.x -= ENEMY_SPEED[this.type] * delta;	// standard movement goes straight towards player
	
	this.position.setVector2(this.prePosition);	
	
	if (this.type == ENEMY_F) {		// these enemies move towards player like normal, but also have perpendicular cyclic movement
	
		var ENEMY_F_CYCLE_SPEED = 3.0;
		var ENEMY_F_CYCLE_SPAN = 0.2;
		
		this.cycle += delta * ENEMY_F_CYCLE_SPEED;

		var x = Math.sin(this.cycle);

		var coeff = x;
		this.position.y = this.prePosition.y + coeff * (ENEMY_F_CYCLE_SPAN + (1.0-this.prePosition.x / GAME_SIZE_DIV2)*0.5);
	}

	// NOTE **************************************************************
	// At this point, position should have the final enemy position for this frame (before conversion to cartesian)
	// prePosition may have the same value, or may have a different value depending on the enemy type
	
	// convert polar position to cartesian
	this.position.convertToCartesianEquals();
	this.position.addEquals(PLAYER_POSITION);	
	
	// store velocity (used externally)
	this.velocity = this.position.sub(this.velocity);

	// used by ordering function to sort enemies
	var dist             = this.position.distance(PLAYER_POSITION);
	this.closestDistance = dist - ENEMY_RADIUS[this.type];
	
	// calculate the span
	var r     = PLAYER_POSITION.sub(this.position).resizeEquals(ENEMY_RADIUS[this.type]).perpendicularEquals();
	var left  = this.position.add(r).subEquals(PLAYER_POSITION);											
	var right = this.position.sub(r).subEquals(PLAYER_POSITION);
	this.span.set(left.getAngle(), right.getAngle(), dist);

	this.hurtLastFrame = this.hurtThisFrame;
	this.hurtThisFrame = false;
}

Enemy.prototype.draw = function (ctx) {

	var h = this.health / ENEMY_HEALTH[this.type];	

	ctx.fillStyle   = ENEMY_DARK_COLOR_STRING[this.type];
	ctx.strokeStyle = ENEMY_COLOR_STRING[this.type];
	ctx.beginPath();
	ctx.arc(this.position.x, this.position.y, ENEMY_RADIUS[this.type], 0, Math.PI2);
	ctx.fill();
	ctx.stroke();

	ctx.fillStyle = ENEMY_COLOR_STRING[this.type];
	ctx.beginPath();
	ctx.arc(this.position.x, this.position.y, ENEMY_RADIUS[this.type] * h, 0, Math.PI2);
	ctx.fill();		
	
	if (this.menuText != null) { 		// if it's a menu enemy, add it's text
		ctx.fillStyle = WHITE;
		ctx.fillTextAlign(this.menuText, this.position.x, this.position.y - ENEMY_RADIUS[this.type] - 20, 'center');
	}
}


// returns -1 if does not hit, otherwise returns the distance at which the laser hits this enemy
Enemy.prototype.checkLaserHit = function (rStartA, rStartB, rDir) {

	var a = checkRayCircleIntersect(rStartA, rDir, this.position, ENEMY_RADIUS[this.type]);
	var b = checkRayCircleIntersect(rStartB, rDir, this.position, ENEMY_RADIUS[this.type]);
		
	if      (a == -1) return b;
	else if (b == -1) return a;
	else              return Math.min(a,b);
}

// returns true if this enemy has entered inside of the player's shield radius
Enemy.prototype.checkShieldHit = function (shieldRadius) {

	if (this.position.distance(PLAYER_POSITION) <= shieldRadius + ENEMY_RADIUS[this.type])
		return true;
	else
		return false;
}

// returns true if this enemy is being hit by the pulse
Enemy.prototype.checkPulseHit = function (pulseRadius) {

	var dist = Math.abs(this.position.distance(PLAYER_POSITION) - pulseRadius);

	if (dist <= PULSE_WIDTH/2 + ENEMY_RADIUS[this.type])
		return true;
	else
		return false;

}

// applies laser damage, returns true if it was killed this frame
Enemy.prototype.applyDamage = function (laserPower) {

	this.hurtThisFrame = true;
	this.health -= delta * laserPower * LASER_DAMAGE_FACTOR;
	
	if (this.health <= 0.0) 
		return true;

	return false;
}
