
var LEVEL_BOX_WIDTH = 300;
var LEVEL_BOX_HEIGHT= 200;
var LEVEL_BOX_X     = GAME_SIZE_DIV2 - LEVEL_BOX_WIDTH/2;
var LEVEL_BOX_Y     = GAME_SIZE_DIV2 - LEVEL_BOX_HEIGHT/2 + TOP_MARGIN;

// bonus level settings
var BONUS_TYPE_FASTER      = 0,
	BONUS_TYPE_SPAWN_RATE  = 1,
	BONUS_TYPE_SPAWN_RATE2 = 2;
	
	                    // faster  // spawn rate  // spawn rate 2
var BONUS_TYPE_SCORE = [   50,        25,            15];
	
var BONUS_DEFAULT_SPEED       = 240;
var BONUS_DEFAULT_LASER_POWER = 10.0;
	
var BONUS_FASTER_SPEED_INC   = 4.0;
var BONUS_FASTER_LASER_ANGLE = 0.157;
var BONUS_FASTER_SPAWN_RATE  = 0.7;
var BONUS_FASTER_SCORE_MULT  = 2.0;

var BONUS_SPAWN_RATE_INC         = 0.06;
var BONUS_SPAWN_RATE_LASER_ANGLE = 0.314;
var BONUS_SPAWN_RATE_START       = 0.8;

var BONUS_SPAWN_RATE2_INC         = 0.025;
var BONUS_SPAWN_RATE2_LASER_ANGLE = 0.714;
var BONUS_SPAWN_RATE2_LASER_POWER = 0.03;
var BONUS_SPAWN_RATE2_START       = 8.0;
var BONUS_SPAWN_RATE2_SPEED       = 22;

function Player() {

	this.shields     = SHIELDS_START;

	this.laserDir   = 0.0;
	this.laserAngle = LASER_START_ANGLE;	
	this.laserPower = 1.0;		// 1.0 = starting power, 2.0 = 2x start power, etc.
	this.laserSpans = [];
	this.laserGrad  = 0.0;

	this.pulseCharge = 0.0;	  // 0 = no charge, 1 = full charge
	this.pulseOn     = false; // true if there is a pulse currently travelling
	this.pulseRadius = 0.0;
	this.pulseSound = null;
	
	this.level           = 0;
	this.levelStarted    = false;		
	this.upgradeDone     = true;
	
	this.inHelpScreen    = false;
	this.helpScreenNum   = 0;
	
	this.inOptionsScreen = false;
	
	this.inDeathAnim       = false;
	this.deathAnimCount    = 0;
	this.deathAnimCallback = null;
	
	this.score       = 0;
	this.kills       = 0;
	this.killsNeeded = 0;	
	
	this.isGamePaused = false;
	this.isGameOver   = false;
	
	// bonus level stuff
	this.isBonusLevel    = false;
	this.bonusLevelType  = 0;
	this.bonusFactor     = 0;		// will be used for different things based on bonus level type
	this.bonusLaserAngle = 0;
	this.bonusLaserPower = 0;
	this.bonusSpawnRate  = 0;
}

Player.prototype.startBonusLevel = function(laserAngle, laserPower, spawnRate, bonusType) {

	this.shields      = 0;
	this.kills        = 0;
	this.pulseCharge  = 0.0;
	this.pulseOn      = false;
	
	this.levelStarted = false;
	this.upgradeDone  = true;
	
	this.isBonusLevel    = true;
	this.bonusLevelType  = bonusType;
	this.bonusLaserAngle = laserAngle;
	this.bonusLaserPower = laserPower;
	this.bonusSpawnRate  = spawnRate;
	
	if (bonusType == BONUS_TYPE_FASTER)
		this.bonusFactor = 100.0;		// starting speed
	else if (bonusType == BONUS_TYPE_SPAWN_RATE) {
	}
};

Player.prototype.startNewLevel = function() {

	this.shields      = SHIELDS_START;
	this.kills        = 0;
	this.pulseCharge  = 0.0;	// 0 = no charge, 1 = full charge
	this.pulseOn      = false; 	// true if there is a pulse currently travelling
	this.levelStarted = false;
	this.isBonusLevel = false;
	
	this.calcSpawnRate();
	
	this.upgradeDone    = (this.level != 0 ? false : true);		// no upgrade before first level
	this.killsNeeded    = Math.floor(SECONDS_PER_LEVEL * player.levelSpawnRate);	
};

Player.prototype.calcSpawnRate = function() {

	this.levelSpawnRate = SPAWN_RATE_START;

	for (var i = 0; i < this.level; i++) {
		if (i <= SPAWN_RATE_SWITCH)
			this.levelSpawnRate += SPAWN_RATE_INC;
		else
			this.levelSpawnRate += (this.levelSpawnRate * (1.0+SPAWN_RATE_MIN_PERC)) * SPAWN_RATE_MIN_PERC;
	}
};

var PLAYER_DEATH_ANIM_TIME = 0.75;

Player.prototype.update = function() {

	if (this.inDeathAnim) {
		
		this.deathAnimCount += delta;
	
		if (this.deathAnimCount - delta < PLAYER_DEATH_ANIM_TIME/2 && this.deathAnimCount > PLAYER_DEATH_ANIM_TIME/2)
			this.deathAnimCallback(true);	

		if (this.deathAnimCount > PLAYER_DEATH_ANIM_TIME) 
			this.inDeathAnim = false;
	}

	if (this.pulseOn) {

		this.pulseRadius += PULSE_SPEED * delta;

		if (this.pulseRadius > GAME_SIZE_DIV2 + PULSE_WIDTH) {
			this.pulseOn = false;
			this.pulseCharge = 0.0;
			this.pulseSound = null;
		}
	}
	else if (this.levelStarted && !this.isBonusLevel) {

		this.pulseCharge += PULSE_RECHARGE * delta;

		if (this.pulseCharge > 1.0)
			this.pulseCharge = 1.0;
	}

	// find the span of the laser
	this.laserSpans = [getSpan(this.laserDir - this.getLaserAngle()/2, this.laserDir + this.getLaserAngle()/2, 10000)];

	this.laserGrad += delta * LASER_GRAD_SPEED;
	while (this.laserGrad > 1.0) {
		this.laserGrad -= 1.0;
	}
};


var LASER_GRAD_SPEED = 4.0;
var LASER_GRAD_WIDTH = 0.2;
var LASER_GRAD_RUNOFF = 50;
var LASER_GRAD_COLOR_MAIN = 'rgba(20, 255, 0, 0.5)';
var LASER_GRAD_COLOR_ALT  = 'rgba(255, 255, 255, 1.0)';

Player.prototype.draw = function(ctx) {

	// draw shields
	ctx.lineWidth   = 5;
	ctx.strokeStyle = 'rgb(70,0,0)';

	for (var i = 0; i < this.shields; i++) {

		if (i == this.shields - 1)
			ctx.strokeStyle = 'rgb(255,0,0)';	// outer shield is brighter

		ctx.beginPath();
		ctx.arc(PLAYER_X, PLAYER_Y, PLAYER_RADIUS + SHIELDS_RADIUS_DELTA * (i + 1), 0, Math.PI2);
		ctx.stroke();
	}

	// draw pulse
	if (this.pulseOn) {
		
		var c1 = convertPolarToCartesian(this.pulseRadius + PULSE_WIDTH/2.0, this.pulseRadius * 0.3);
		var c2 = c1.negate();
		c1.addEquals(PLAYER_POSITION);
		c2.addEquals(PLAYER_POSITION);
		
		var grd = ctx.createLinearGradient(c1.x, c1.y, c2.x, c2.y);
		grd.addColorStop(0, 'rgba(0,255,0,' + this.pulseCharge + ')');
		grd.addColorStop(1, 'rgba(255,0,0,' + this.pulseCharge + ')');
		ctx.strokeStyle = grd;

		ctx.lineWidth = PULSE_WIDTH;
		
		ctx.beginPath();
		ctx.arc(PLAYER_X, PLAYER_Y, this.pulseRadius, 0, Math.PI2);
		ctx.stroke();
	}

	// draw player's ship and laser
	ctx.save();
	
	ctx.translate(PLAYER_X, PLAYER_Y);
	ctx.rotate(this.laserDir);

	ctx.fillStyle = 'rgb(100, 100, 255)';
	ctx.beginPath();
	ctx.arc(0, 0, PLAYER_RADIUS, 0, Math.PI2);
	ctx.fill();

	ctx.strokeStyle = 'rgb(200,200,200)';
	ctx.lineWidth   = 4;
	ctx.beginPath();
	ctx.moveTo(8, 0);
	ctx.lineTo(15, 0);
	ctx.stroke();

	ctx.restore();

	// draw laser
	start = getVector2(LASER_GRAD_RUNOFF, Math.PI + this.laserDir).convertToCartesian().add(PLAYER_POSITION);
	end   = getVector2(DIAG_SIZE + LASER_GRAD_RUNOFF , this.laserDir).convertToCartesian().add(PLAYER_POSITION);
	
	if (highRenderQuality) {
		grd = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
		grd.addColorStop(clamp(this.laserGrad - LASER_GRAD_WIDTH, 0, 1), LASER_GRAD_COLOR_MAIN);
		grd.addColorStop(this.laserGrad, LASER_GRAD_COLOR_ALT);
		grd.addColorStop(clamp(this.laserGrad + LASER_GRAD_WIDTH, 0, 1), LASER_GRAD_COLOR_MAIN);
		ctx.fillStyle = grd;
	}
	else
		ctx.fillStyle = LASER_GRAD_COLOR_MAIN;

	for (i = 0; i < this.laserSpans.length; i++) {

		ctx.beginPath();
		ctx.moveTo(PLAYER_X, PLAYER_Y);							// this  0.001  tries to eliminate gaps between spans
		var a1 = getVector2(this.laserSpans[i].r, this.laserSpans[i].a - 0.001).convertToCartesian();
		var a2 = getVector2(this.laserSpans[i].r, this.laserSpans[i].b).convertToCartesian();

		ctx.lineTo(a1.x + PLAYER_X, a1.y + PLAYER_Y);
		ctx.lineTo(a2.x + PLAYER_X, a2.y + PLAYER_Y);
		ctx.lineTo(PLAYER_X, PLAYER_Y);
		ctx.fill();
	}
};

Player.prototype.mouseMove = function (mx, my) {
	
	if (this.isGamePaused)
		return;

	this.laserDir   = Math.atan2(my - PLAYER_Y, mx - PLAYER_X);
};

Player.prototype.mouseDown = function (mx, my) {

	if (!pointInRect(mx, my, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT))
		return;

	if (this.levelStarted) {
	
		if (this.isGamePaused) {	// unpause game
		
			this.isGamePaused = false;
			this.mouseMove(mx, my);		// little trick to move laser immediately under the mouse
			createjs.Sound.setVolume(MASTER_VOLUME);
		}
		else if (my >= TOP_MARGIN)
			this.startPulse();
	}
};

Player.prototype.getShieldRadius = function() {
	return ( PLAYER_RADIUS + SHIELDS_RADIUS_DELTA * this.shields );
};

Player.prototype.getSpawnRate = function() {
	return (this.isBonusLevel ? this.bonusSpawnRate : this.levelSpawnRate);
};

Player.prototype.getLaserAngle = function() {
	if (this.levelStarted)
		return (this.isBonusLevel ? this.bonusLaserAngle : this.laserAngle);
	else
		return LASER_START_ANGLE;
};

Player.prototype.getLaserPower = function() {
	if (this.levelStarted)
		return (this.isBonusLevel ? this.bonusLaserPower : this.laserPower);
	else
		return 1.0;
};

Player.prototype.startPulse = function () {

	if (this.pulseOn || this.pulseCharge < 0.02) return;

	this.pulseOn = true;
	this.pulseRadius = this.getShieldRadius();
	
	if (isSoundOn) {
		this.pulseSound = createjs.Sound.play("pulse");
		this.pulseSound.setVolume(PULSE_VOLUME); 
	}
};

Player.prototype.killShield = function() {

	createjs.Sound.play('player_damage').setVolume(PLAYER_DAMAGE_VOLUME);
	this.shields--;
};

/*
- cookie values cannot contain whitespace, commas, or semicolins
	* format : "levelNum-score-laserPower-laserAngle-soundOn-musicOn-highQuality"
*/
Player.prototype.writeSaveCookie = function() {
	
	var value;
	value  = this.level.toString() + '-';
	value += this.score.toString() + '-';
	value += this.laserAngle.toFixed(7).toString() + '-';
	value += this.laserPower.toFixed(7).toString() + '-';
	value += Number(isSoundOn).toString() + '-';
	value += Number(isMusicOn).toString() + '-';	
	value += Number(highRenderQuality).toString();
	
	setCookie('perpetual_save', value, 90);
};

Player.prototype.readSaveCookie = function() {
	
	var values = getCookie('perpetual_save');
	if (values == null)
		return;
		
	values = values.split('-');

	this.level          = parseInt(values[0]);
	this.score          = parseInt(values[1]);
	this.laserAngle     = parseFloat(values[2]);
	this.laserPower     = parseFloat(values[3]);
	isSoundOn           = (values[4] == '1');
	isMusicOn           = (values[5] == '1');
	highRenderQuality   = (values[6] == '1');
	
	this.upgradeDone    = (this.level == 0);
	this.isBonusLevel   = false;					
};
