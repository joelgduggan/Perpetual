
// Perpetual, Javascript/HTML5 Shooter Game
// Created by : Joel Duggan (joelgduggan@gmail.com), May 2013

/*
	Todo :
	
		- get rid of laser angle/power and spawn rate display
		- change kills to a progress bar
		- move score to upper-left, and level # and progress bar to upper right (so only one row)
		- add the current level/upgrade level for laser angle/power beneath the upgrade buttons
		- once they reach the needed # of kills, explode all the other on-screen enemies
	
		- sound
			- figure out why firefox cuts out
		- game over needs to be done
		- in help, add new slide that explains saving (misc.) (also note that p = pause)
		- move all enemy updating/drawing code into enemy file
		- pre-render any text that doesn't change
		- balancing
		- high score system
			- high score list menu choice (not needed for kongregate)
		- possibly create an enemy pool so that they aren't constantly created and destroyed
		- append a checksum to the end of the save cookie
		- change bonus levels to every other round, or maybe every third
		- powerups
			- when enemy dies, they spawn and head straight for player, if player does not touch it with laser, then they get it
				- that will add a little challenge to getting a powerup, and they may take risks in trying to get one (good thing)
				- problem, when enemy spawns get crazy, powerups will be hard to see or avoid hitting with laser
			- power goes really high for limited time
			- angle goes really high for limited time
			- screen clear
			- instant pulse charge 100%
			- add another shield (limit max)
				- what if shileds didn't regenerate after levels, but these powerups existed?
			- score boost
*/


var lastAnimRequest;			// returned by requestAnimationFrame
var lastFrameMillis = 0;		// holds the time in milliseconds that the last frame was rendered at
var delta           = 0;
var canvas          = null;
var ctx       		= null;		
var backCanvas      = null;
var prevWindowWidth = 0;
var prevWindowHeight= 0;
var scaleFactor     = 1.0;		// how much game is scaled relative to the default size (determined by browser size)

var touchTime = 0;
var touchX, touchY;

var animFrame = window.requestAnimationFrame       ||
				window.webkitRequestAnimationFrame ||
				window.mozRequestAnimationFrame    ||
				window.oRequestAnimationFrame      ||
				window.msRequestAnimationFrame     ||
				function( callback ) { window.setTimeout(callback, 1000 / 60); };	// for browsers that don't support requestAnimationFrame(yet)
	
var player = null;				
var enemies = [];					// this list is maintained (nulls are removed at end of frame)
var sortedEnemyRadius = [];			// used to draw enemies in order based on radius size
var particleEngine = null;

//var enemyGlowGrads = [];			// color gradients for the different enemy glows

var HELP_SCREEN_FILENAMES = [ 'Images/help1.png', 'Images/help2.png'];
var helpScreenImages = [];				

var EXPLOSION_NAMES = [ 'explode1', 'explode2', 'explode3' ];
var SPARK_NAMES     = [ 'laser_damage1_long', 'laser_damage2', 'laser_damage3', 'laser_damage4' ];
 	

//var camera = new Vector2();		// (-1 to 1, -1 to 1)

var stars = [];
var starRotation = 0;

function Star() {				
	this.respawn();
}

Star.prototype.respawn = function() {

	this.pos = new Vector2();
	this.pos.x = Math.random() * 4.0 - 2.0;		// -2 to 2
	this.pos.y = Math.random() * 4.0 - 2.0;		// -2 to 2
	//this.d     = clamp(Math.random() * 0.15, 0.02, 1.0);	
	this.d = Math.random() * 0.3;
	
	var c = Math.floor(Math.random() * 170) + 75;
	this.color = getColorStringRGB(c,c,c);
	
	this.radius = 0.6 + Math.random() * 0.5;
};

Star.prototype.draw = function() {

	//var p = this.pos.sub(camera.mul(this.d));
	var p;
	if (player.level % 2 == 0)
		p = convertPolarToCartesian(this.pos.length(), this.pos.getAngle() + starRotation * this.d);//player.laserDir * this.d);
	else
		p = convertPolarToCartesian(this.pos.length(), this.pos.getAngle() - starRotation * this.d);//player.laserDir * this.d);

	if (p.x > 1.0 || p.x < -1.0 || p.y < -1.0 || p.y > 1.0)
		return;
		
	p.x = (p.x + 1.0) * CANVAS_WIDTH/2.0;
	p.y = (p.y + 1.0) * CANVAS_WIDTH/2.0;		

	ctx.fillStyle = this.color;
	
	ctx.beginPath();
	ctx.arc(p.x, p.y, this.radius, 0, Math.PI2);
	ctx.fill();
};



//
// Called once when the script is executed
//
function oneTimeInitialization() {

	// attempt to get canvas context
	canvas = document.getElementById('canvas');
	if (canvas.getContext) {
		ctx = canvas.getContext('2d');
		resizeCanvas();
	}
	else {
		alert('HTML5 Canvas not supported. Sorry.');
		return;
	}
		
	// define a helper function to use a different text alignment (default center if not defined)
	ctx.fillTextAlign = function(text, x, y, alignment) {
		ctx.textAlign = alignment || 'center';
		ctx.fillText(text, x, y);
		ctx.textAlign = 'start';
	};

	// sound initialization
	
	var loadCount = 0;
	createjs.Sound.addEventListener('fileload', preLoad);
	function preLoad() {
		loadCount++;
		if (loadCount >= 10)
			console.log('finished loading all sounds');
	}

	var manifest = [
		{src:'Sounds/pulse.mp3', id:'pulse', data:1 },
		{src:'Sounds/player_damage.mp3', id:'player_damage', data:2 },
		{src:'Sounds/player_death.mp3', id:'player_death', data:1 },
		{src:'Sounds/laser_damage1_long.mp3', id:'laser_damage1_long', data:4 },
		{src:'Sounds/laser_damage2.mp3', id:'laser_damage2', data:4 },
		{src:'Sounds/laser_damage3.mp3', id:'laser_damage3', data:4 },
		{src:'Sounds/laser_damage4.mp3', id:'laser_damage4', data:4 },
		{src:'Sounds/explode1.mp3', id:'explode1', data:4 },
		{src:'Sounds/explode2.mp3', id:'explode2', data:4 },
		{src:'Sounds/explode3.mp3', id:'explode3', data:4 }
	];	
	createjs.Sound.registerManifest(manifest);
	createjs.Sound.alternateExtensions = ["ogg"];
	createjs.Sound.setVolume(MASTER_VOLUME);
	createjs.Sound.defaultInterruptBehavior = createjs.Sound.INTERRUPT_EARLY;
	console.log(createjs.Sound.activePlugin);

	// create the background image
	backCanvas = document.createElement('canvas');
	backCanvas.width  = 160;
	backCanvas.height = 160;
	var bctx = backCanvas.getContext('2d');

	var grad = bctx.createRadialGradient(80, 80, 0.0, 80, 80, 80);	
	grad.addColorStop(0.0, 'rgb(0,0,150)');
	grad.addColorStop(1.0, 'rgb(0,0,0)');	
	bctx.fillStyle = grad;
	bctx.beginPath();
	bctx.arc(80, 80, 81, 0, Math.PI2);
	bctx.fill();	
	
	// load help screen images
	for (var i = 0; i < HELP_SCREEN_FILENAMES.length; i++) {
		helpScreenImages[i] = new Image();
		helpScreenImages[i].src = HELP_SCREEN_FILENAMES[i];
	}

	particleEngine = new ParticleEngine();
	
	for (i = 0; i < 300; i++)
		stars[i] = new Star();
	
	startNewGame();		
	
	document.onmousemove = mouseMove;
	document.onmousedown = mouseDown;
	document.onkeydown   = keyDown;
	document.onkeyup     = keyUp;
	
	// for mobile support
	document.ontouchstart = function(e) {
		e.preventDefault();
		touchTime = (new Date()).getTime();
		touchX = e.touches[0].pageX;
		touchY = e.touches[0].pageY;
		mouseMove(e.touches[0]);
	};
	document.ontouchmove = function(e){
		e.preventDefault();
		mouseMove(e.touches[0]);
	};
	document.ontouchend = function(e) {
		e.preventDefault();
		if ((new Date()).getTime() - touchTime < 400) 
			mouseDownCoords(touchX, touchY);
	};
	
	// create a list of all enemy radii's in descending order (remove duplicates)
	for (i = 0; i < ENEMY_RADIUS.length; i++) {
		var exists = false;
		for (var j = 0; j < sortedEnemyRadius.length; j++) {
			if (ENEMY_RADIUS[i] == sortedEnemyRadius[j])
				exists = true;
		}
		if (!exists)
			sortedEnemyRadius.push(ENEMY_RADIUS[i]);
	}
	sortedEnemyRadius.sort( function(a,b) {return (b-a);} );	// descending
	
	// create the radial gradients for the enemy glows
	/*
	for (var i = 0; i < NUM_ENEMY_TYPES; i++) {
	
		var c    = ENEMY_COLOR[i];
		var grad = ctx.createRadialGradient(0, 0, ENEMY_RADIUS[i], 0, 0, ENEMY_RADIUS[i] + GLOW_SIZE);	
		grad.addColorStop(0.0, getColorStringRGBA(c.r, c.g, c.b, GLOW_BRIGHTNESS));
		grad.addColorStop(1.0, getColorStringRGBA(c.r, c.g, c.b, 0.0));
		enemyGlowGrads[i] = grad;
	}
	*/
	
	// start animation request loop
	lastAnimRequest = animFrame( recursiveMainLoop );
}

var startNewGame = function() {
	
	createjs.Sound.stop();	

	if (player != null) {
		var oldLaserDir       = player.laserDir;
		var oldDeathAnim      = player.deathAnimCount;
		player                = new Player();
		player.laserDir       = oldLaserDir;
		player.inDeathAnim    = true;
		player.deathAnimCount = oldDeathAnim + 0.001;
	}
	else {
		player = new Player();
		player.readSaveCookie();
	}
		
	loadNewLevel(!player.upgradeDone);
};

var loadNewLevel = function(selectUpgradeFirst) {

	enemies = [];
	createjs.Sound.stop();
	particleEngine.clear();
	
	player.writeSaveCookie();

	if (player.isBonusLevel) {	// start bonus level?
	
		if (player.level % 3 == 0)
			player.startBonusLevel(BONUS_FASTER_LASER_ANGLE, BONUS_DEFAULT_LASER_POWER, BONUS_FASTER_SPAWN_RATE, BONUS_TYPE_FASTER);
		else if (player.level % 3 == 1)
			player.startBonusLevel(BONUS_SPAWN_RATE_LASER_ANGLE, BONUS_DEFAULT_LASER_POWER, BONUS_SPAWN_RATE_START, BONUS_TYPE_SPAWN_RATE);
		else if (player.level % 3 == 2)
			player.startBonusLevel(BONUS_SPAWN_RATE2_LASER_ANGLE, BONUS_SPAWN_RATE2_LASER_POWER, BONUS_SPAWN_RATE2_START, BONUS_TYPE_SPAWN_RATE2);
	}
	else {
		player.startNewLevel();
		player.upgradeDone = !selectUpgradeFirst;
	}
	
	initMenuScreen();
	
	for (var i = 0; i < stars.length; i++)
		stars[i].respawn();
};

function killPlayer() {

	if (isSoundOn) {
		createjs.Sound.stop();	
		createjs.Sound.play('player_death').setVolume(PLAYER_DAMAGE_VOLUME);
	}
	
	enemies               = [];
	player.inDeathAnim    = true;
	player.deathAnimCount = 0;

	if (!player.isBonusLevel) {
		
		if (player.kills >= player.killsNeeded) {
			
			player.level++;
			player.deathAnimCallback = loadNewLevel;		
		}
		else
			player.deathAnimCallback = doGameOver;
	}
	else {
		player.deathAnimCallback = loadNewLevel;	
		player.isBonusLevel = false;
	}
}

var doGameOver = function() {
	
	player.isGameOver = true;
};

function mouseMove(e) {

	var mx = (e.pageX - canvas.offsetLeft) / scaleFactor;
	var my = (e.pageY - canvas.offsetTop)  / scaleFactor;
	
	player.mouseMove(mx, my);
}

function mouseDown(e) {

	var mx = (e.pageX - canvas.offsetLeft) / scaleFactor;
	var my = (e.pageY - canvas.offsetTop)  / scaleFactor;
	mouseDownCoords(mx, my);
}

function mouseDownCoords(mx, my) {
	
	if (player.isGamePaused) {		// player class will take care of resetting this variable
		
		// unpause sounds
		for (var i = 0; i < enemies.length; i++) {
			if (enemies[i].sound != null)
				enemies[i].sound.resume();
		}
		if (player.pulseSound != null)
			player.pulseSound.resume();
	}
	
	player.mouseDown(mx, my);
	
	if (pointInRect(mx, my, 0, 0, GAME_SIZE, TOP_MARGIN)) {			// CHEAT****************************************
		
		if (!player.isBonusLevel) {
		
			if (!player.upgradeDone) {
				player.laserAngle += ANGLE_UPGRADE/2;
				player.laserPower += POWER_UPGRADE/2;
			}
			player.level++;
			if (player.shields == SHIELDS_START)
				player.isBonusLevel = true;
			loadNewLevel(player.upgradeDone);
		}
		else {
			player.isBonusLevel = false;
			loadNewLevel(true);
		}
	}	
}

function keyDown(e) {
	var key = (e ? e:event).keyCode;
	
	if (key == 80) {		// 'p' for pause game
		if (player.levelStarted) {
			player.isGamePaused = true;
			createjs.Sound.setVolume(0.0);
			
			// pause sounds
			for (var i = 0; i < enemies.length; i++) {
				if (enemies[i].sound != null)
					enemies[i].sound.pause();
			}
			if (player.pulseSound != null)
				player.pulseSound.pause();			
		}
	}
}

function keyUp(e) {
	//var key = (e ? e:event).keyCode;
}

function resizeCanvas() {
	
	prevWindowWidth = window.innerWidth;
	prevWindowHeight= window.innerHeight;

	canvas.height   = window.innerHeight - CANVAS_MARGIN;	
	canvas.width    = Math.round(canvas.height * ASPECT_RATIO);
	
	if (canvas.width > window.innerWidth) {
		canvas.width  = window.innerWidth - CANVAS_MARGIN;
		canvas.height = Math.round(canvas.width / ASPECT_RATIO);
	}
	
	scaleFactor     = canvas.height / CANVAS_HEIGHT;		
	
	// scale canvas to fit it's new size
	ctx.setTransform(scaleFactor, 0.0, 0.0, scaleFactor, 0.0, 0.0);
	ctx.textBaseline = 'top';
}


function updateFrame() {
	if (ctx == null)
		return;
	if (delta > 1.0)
		delta = 0.17;
		
	// check for window being resized
	if (window.innerWidth != prevWindowWidth || window.innerHeight != prevWindowHeight)
		resizeCanvas();
	
	//***************************************
	// UPDATE GAME
	//***************************************
	
	if (player.isGamePaused == false) {
	
		player.update();
		
		if (!player.isGameOver) {
			spawnNewEnemies();	
			updateEnemies();

			if (player.levelStarted && !player.isBonusLevel && player.kills >= player.killsNeeded && enemies.length == 0 && !particleEngine.hasParticles)  {
				player.level++;
				if (player.shields == SHIELDS_START)
					player.isBonusLevel = true;						
				loadNewLevel(true);	
			}
		}
	}

	//**************************************
	// DRAW GAME
	//**************************************	

	ctx.fillStyle = BLACK;
	ctx.fillRect(0,0,CANVAS_WIDTH, CANVAS_HEIGHT);
	if (highRenderQuality)
		ctx.drawImage(backCanvas, GAME_SIZE_DIV2 - 80, GAME_SIZE_DIV2 - 80 + TOP_MARGIN);
	
	ctx.save();		// needed before we clip the drawing region
	drawGameBoundary(true);
	
	drawBackground();
	
	if (player.inHelpScreen)
		ctx.drawImage(helpScreenImages[player.helpScreenNum], 0, 0);

	player.draw(ctx);
	
	drawEnemies();	
		
	particleEngine.updateAndDraw(player.isGamePaused, ctx);
	
	ctx.restore();			// get rid of clipping region
	
	drawGameBoundary(false);// draw white boundary over clipped region
	
	drawTextDisplays();		// text that shows up before level started or when game paused
	drawStatusDisplays();	// text that is always on the screen
	
	if (player.inDeathAnim) {
		var x = 1.0 - Math.abs(player.deathAnimCount / PLAYER_DEATH_ANIM_TIME - 0.5) * 2.0;
		ctx.fillStyle = 'rgba(255, 0, 0,' + x + ')';
		ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
	}
	
	drawFPS();
}

function spawnNewEnemies() {
	if (!player.levelStarted || player.inDeathAnim || (!player.isBonusLevel && player.kills >= player.killsNeeded)) 
		return;

	var chance = player.getSpawnRate() * delta;

	while (chance > 0) {

		if (Math.random() < chance || enemies.length == 0) {	
																			
			var type = 0;

			if (!player.isBonusLevel) {
				// find a random enemy type based on enemy ratio's
				var r = Math.random() * ENEMY_RATIO_TOTAL;

				while (r > ENEMY_RATIO[type]) {
					r -= ENEMY_RATIO[type];
					type++;
				}
			}
			else
				type = ENEMY_BONUS;

			var i = enemies.length;
			enemies[i] = new Enemy();
			enemies[i].spawn(type);

			if (type == ENEMY_BONUS)  {		// add speed for bonus levels
				if      (player.bonusLevelType == BONUS_TYPE_FASTER)      enemies[i].speed = player.bonusFactor;
				else if (player.bonusLevelType == BONUS_TYPE_SPAWN_RATE)  enemies[i].speed = BONUS_DEFAULT_SPEED;
				else if (player.bonusLevelType == BONUS_TYPE_SPAWN_RATE2) enemies[i].speed = BONUS_SPAWN_RATE2_SPEED;
			}
		}
		chance -= 1.0;
	}
}


function orderEnemyByClosestPoint(a, b) { return (a.closestDistance < b.closestDistance ? -1 : 1); }

function updateEnemies() {

	// sort enemy list by closest point on enemy to player
	enemies.sort(orderEnemyByClosestPoint);
	
	var enemyPos;
	var l,e;
	var result;
	var spanRatio, numSpans;
	var r, d1, d2, a, b, t, arc;
	
	for (var i = 0; i < enemies.length; i++) {
	
		enemies[i].update(player.levelStarted ? delta : 0);		// if level not started, don't move enemy
		enemyPos = enemies[i].position;

		spanRatio = -1;	

		// check for laser hitting this enemy, note : one enemy could intersect two different spans
		numSpans = player.laserSpans.length;
		for (var j = 0; j < numSpans; j++) {
			if (player.laserSpans[j].r < 5000) continue;	// if a span already hit an enemy, it can't hit another
		
			l = player.laserSpans[j];
			e = enemies[i].span;
			result = spansIntersect(l, e);
		
			// check for intersection and the span goes past the enemy for collision
			if (result != SPANS_NO_INTERSECT && l.r > enemies[i].closestDistance) {
				
				switch (result) {
				
					// laser is completely inside enemy span
					case SPAN2_CONTAINS_SPAN1 :   l.r = e.r; 		
				 							      break;
				 							    
				 	// enemy span completely inside laser
					case SPAN1_CONTAINS_SPAN2 : { player.laserSpans.push(getSpan(l.a, e.a, l.r));
											  	  player.laserSpans.push(getSpan(e.b, l.b, l.r));
											  	  l.set(e.a, e.b, e.r);
											  	  break;
												} 
					// left side of laser is inside enemy span							
					case SPANS_INTERSECT_2 :  	{					
											  	  player.laserSpans.push(getSpan(e.b, l.b, l.r));
											  	  l.set(l.a, e.b, e.r);
											  	  break;
										 		} 
					// right side of laser is inside enemy span					 		
					default :					{					
												  player.laserSpans.push(getSpan(l.a, e.a, l.r));
												  l.set(e.a, l.b, e.r);				
												}
				}
				
				// set hurt flag and calculate ratio of span, add sparks
				if ( Math.abs(l.midAngle - e.midAngle) < Math.PI)
					spanRatio = 1.0 - Math.abs(l.midAngle - e.midAngle) / e.halfLength;
				else
					spanRatio = 1.0 - (Math.PI2 - Math.abs(l.midAngle - e.midAngle)) / e.halfLength;

				// add particles around edge of enemy that is being hit by laser
				r = ENEMY_RADIUS[enemies[i].type];
				
				d1 = checkRayCircleIntersect(PLAYER_POSITION, convertRadiansToVector2(l.a), enemyPos, r);
				d2 = checkRayCircleIntersect(PLAYER_POSITION, convertRadiansToVector2(l.b), enemyPos, r);
				a  = convertPolarToCartesian(d1, l.a).addEquals(PLAYER_POSITION);													
				b  = convertPolarToCartesian(d2, l.b).addEquals(PLAYER_POSITION);
				a  = a.subEquals(enemyPos).getAngle();
				b  = b.subEquals(enemyPos).getAngle();
				
				if (a > b) { t = a; a = b; b = t; }
				if (Math.abs(b-a) > Math.PI) {
					 t = a; a = b; b = t;
					 b += Math.PI2;
				}
				
				arc = 3.0 / ENEMY_RADIUS[enemies[i].type];
			 	while (a < b) {
			 		particleEngine.addSparkParticles( convertPolarToCartesian(r, a).addEquals(enemyPos), enemyPos, enemies[i].velocity, 1 );
			 		a += arc;
			 	}
					
			}	// end if span collision
			
		}	// end for each span
		
		// hurt by laser?
		if (spanRatio > 0.0) {			
			applyDamageToEnemy(i, player.getLaserPower());
		}
		
		// check pulse hitting enemy
		if (enemies[i] != null && player.pulseOn && enemies[i].checkPulseHit(player.pulseRadius)) {
		
			d1 = (player.pulseRadius - enemyPos.distance(PLAYER_POSITION)) / (PULSE_WIDTH/2 + ENEMY_RADIUS[enemies[i].type]);
			a  = enemyPos.sub(PLAYER_POSITION).resizeEquals(ENEMY_RADIUS[enemies[i].type] * d1);
			
			particleEngine.addSparkParticles( enemyPos.add(a), enemyPos, enemies[i].velocity, 6 );
			
			applyDamageToEnemy(i, player.pulseCharge * PULSE_DAMAGE);
		}
		
		// check if we need to end the hurt sound
		if (enemies[i] != null && !enemies[i].hurtThisFrame && enemies[i].hurtLastFrame && enemies[i].sound != null) {
			//enemies[i].soundOffset = enemies[i].sound.getPosition();
			enemies[i].sound.stop();
		}
		
		// check enemy for hitting shield or player
		if (enemies[i] != null && player.shields > 0 && enemies[i].checkShieldHit(player.getShieldRadius())) {
			killEnemy(i);
			enemies[i] = null;
			player.killShield();
		}
		
		// is player dead?
		if (enemies[i] != null && player.shields == 0 && enemies[i].checkShieldHit(player.getShieldRadius())) {
			killEnemy(i);	
			killPlayer();
			break;
		}
		
	}	// end for each enemy
	
	// if any enemies were removed, go through the list and fill in holes
	for (i = 0; i < enemies.length; i++) {
		while (i < enemies.length && enemies[i] == null) {
			enemies[i] = enemies[enemies.length-1];
			enemies.length--;
		}
	}
}

function applyDamageToEnemy(i, damage) {

	// play hurt sound
	
	if (isSoundOn && !enemies[i].hurtLastFrame && (ENEMY_RADIUS[enemies[i].type] >= 5 || (player.isBonusLevel && player.bonusLevelType == BONUS_TYPE_SPAWN_RATE2))) {
		
		if (enemies[i].sound == null) {
			
			var vol = SPARK_VOLUME * ENEMY_VOL[enemies[i].type];
			
			if (enemies[i].type != ENEMY_D)
				enemies[i].sound = createjs.Sound.play(SPARK_NAMES[randInt(SPARK_NAMES.length-1) + 1], {volume:vol});
			else
				enemies[i].sound = createjs.Sound.play(SPARK_NAMES[0], {volume:vol});		// large enemy uses the long sound at index 0
		}
		else{
			enemies[i].sound.play();
			//enemies[i].sound.play({offset: enemies[i].soundOffset});
		}
	}
	
	if (enemies[i].applyDamage(damage)) {
	
		if (player.levelStarted)
			player.kills++;
		killEnemy(i);
	}
}

function killEnemy(i) {

	var type	   = enemies[i].type;
	//var steps      = Math.floor(ENEMY_RADIUS[type]);
	//var spawnPoint = getVector2(ENEMY_RADIUS[type], 0.0);
	
	particleEngine.addWaveParticle( enemies[i].position, ENEMY_COLOR[type], ENEMY_RADIUS[type]);
	
	if (isSoundOn) {

		if (enemies[i].sound != null)
			enemies[i].sound.stop();
	
		if (player.levelStarted || enemies[i].menuItem != 'options_sound_off') 
			createjs.Sound.play(EXPLOSION_NAMES[randInt(EXPLOSION_NAMES.length)]).setVolume(EXPLOSION_VOLUME * ENEMY_VOL[type]); 
	}	
	
	if (player.levelStarted)  {		// calculate score

		if (!player.isBonusLevel)
			player.score += clamp(Math.floor(ENEMY_HEALTH[type] * SCORE_NORMAL), SCORE_MIN, SCORE_MAX);
		else
			player.score += BONUS_TYPE_SCORE[player.bonusLevelType];
		
		if (player.isBonusLevel) {	// bonus level always get harder somehow after a kill
		
			if      (player.bonusLevelType == BONUS_TYPE_FASTER)      player.bonusFactor    += BONUS_FASTER_SPEED_INC;
			else if (player.bonusLevelType == BONUS_TYPE_SPAWN_RATE)  player.bonusSpawnRate += BONUS_SPAWN_RATE_INC;
			else if (player.bonusLevelType == BONUS_TYPE_SPAWN_RATE2) player.bonusSpawnRate += BONUS_SPAWN_RATE2_INC;
		}
		
		enemies[i] = null;
	}
	else 	// must have been a menu enemy
		processMenuItem(enemies[i].menuItem);
}

function processMenuItem(menuItem) {

	enemies = [];

	switch (menuItem) {

		case 'help_previous' : 		player.helpScreenNum--;
		break;
		case 'help_next' : 			player.helpScreenNum++;
		break;
		case 'help_back' : 			player.inHelpScreen = false;
		break;
		case 'options_sound_off' : 	isSoundOn = false;
		break;
		case 'options_sound_on' : 	isSoundOn = true;
								    createjs.Sound.play(EXPLOSION_NAMES[randInt(EXPLOSION_NAMES.length)]).setVolume(EXPLOSION_VOLUME);
		break;
		case 'options_music_off' : 	isMusicOn = false;
		break;
		case 'options_music_on' : 	isMusicOn = true;
		break;
		case 'options_quality_high':highRenderQuality = true;
		break;
		case 'options_quality_low' :highRenderQuality = false;
		break;
		case 'options_restart_game':player.inDeathAnim       = true;
									player.deathAnimCount    = 0;
									player.deathAnimCallback = startNewGame;
		break;
		case 'options_back' : 		player.inOptionsScreen = false;
		break;
		case 'help' : 				player.inHelpScreen = true;
		break;
		case 'options' : 			player.inOptionsScreen = true;
		break;
		case 'upgrade_angle' : 		player.laserAngle += ANGLE_UPGRADE;
							   		player.upgradeDone = true;
		break;
		case 'upgrade_power' : 		player.laserPower += POWER_UPGRADE;
							   		player.upgradeDone = true;
		break;
		case 'start' : 				player.levelStarted = true;
		break;
	}

	if (menuItem != 'start')
		initMenuScreen();
}

function initMenuScreen() {

	enemies = [];

	if (player.inHelpScreen)
		spawnHelpEnemies();
	else if (player.inOptionsScreen)
		spawnOptionsEnemies();
	else if (!player.upgradeDone) {
		spawnUpgradeEnemies();
		spawnHelpOptionsEnemies();
	}
	else {
		spawnStartEnemy();
		spawnHelpOptionsEnemies();
	}
}

function spawnHelpOptionsEnemies() {

	spawnMenuEnemy(ENEMY_B, 230, Math.PIOVER2 + 1.2, 'help', 'Help');
	spawnMenuEnemy(ENEMY_B, 230, Math.PIOVER2 - 1.2, 'options', 'Options');
}

function spawnHelpEnemies() {

	if (player.helpScreenNum > 0) 		
		spawnMenuEnemy(ENEMY_B, 230, Math.PIOVER2 + 1.2, 'help_previous', 'Previous');	

	if (player.helpScreenNum < helpScreenImages.length-1) 	
		spawnMenuEnemy(ENEMY_B, 230, Math.PIOVER2 - 1.2, 'help_next', 'Next');

	spawnMenuEnemy(ENEMY_A, 230, Math.PIOVER2, 'help_back', 'Back');
}

function spawnOptionsEnemies() {
	
	if (isSoundOn) spawnMenuEnemy(ENEMY_B, 230, -Math.PIOVER4 - 0.25, 'options_sound_off', 'Sound is ON');
	else           spawnMenuEnemy(ENEMY_B, 230, -Math.PIOVER4 - 0.25, 'options_sound_on', 'Sound is OFF');
		
	if (isMusicOn) spawnMenuEnemy(ENEMY_B, 230, -Math.PIOVER4 + 0.25, 'options_music_off', 'Music is ON');
	else           spawnMenuEnemy(ENEMY_B, 230, -Math.PIOVER4 + 0.25, 'options_music_on', 'Music is OFF');		
		
	if (highRenderQuality) spawnMenuEnemy(ENEMY_B, 230, 0, 'options_quality_low', 'Render Quality is HIGH');
	else                   spawnMenuEnemy(ENEMY_B, 230, 0, 'options_quality_high', 'Render Quality is LOW');		
		
	spawnMenuEnemy(ENEMY_D, 200, Math.PI * 1.25, 'options_restart_game', 'Restart Game');
		
	spawnMenuEnemy(ENEMY_A, 230, Math.PIOVER2, 'options_back', 'Back');	
}

function spawnUpgradeEnemies() {

	spawnMenuEnemy(ENEMY_A, 230, Math.PIOVER2 + 0.3, 'upgrade_angle', 'Upgrade Laser Size');
	spawnMenuEnemy(ENEMY_A, 230, Math.PIOVER2 - 0.3, 'upgrade_power', 'Upgrade Laser Power');
}

function spawnStartEnemy() {

	spawnMenuEnemy(ENEMY_A, 230, Math.PIOVER2, 'start', 'Start');
}

function spawnMenuEnemy(type, radius, angle, menuItemName, menuText) {
	
	var e = new Enemy();
	e.spawn(type);
	e.prePosition.set(radius, angle);
	e.menuItem = menuItemName;
	e.menuText = menuText;
	
	enemies[enemies.length] = e;
}

function drawGameBoundary(setAsClipping) {

	ctx.strokeStyle = 'rgb(128,128,128)';
	ctx.lineWidth   = 1;
	ctx.beginPath();
	ctx.arc(GAME_SIZE_DIV2, TOP_MARGIN + GAME_SIZE_DIV2, GAME_SIZE_DIV2 - 1, 0, Math.PI2);
	ctx.stroke();

	if (setAsClipping)
		ctx.clip();
}

function drawBackground() {

	//camera = convertRadiansToVector2(player.laserDir);

	starRotation += delta * 0.1;
	
	for (var i = 0; i < stars.length; i++) 
		stars[i].draw();	
}

function drawEnemies() {

	// first draw and group the glows
	/*if (highRenderQuality) {
		ctx.save();
		for (var i = 0; i < NUM_ENEMY_TYPES; i++) {

			ctx.fillStyle = enemyGlowGrads[i];

			for (var j = 0; j < enemies.length; j++) {
				if (enemies[j].type == i) {

					ctx.setTransform(scaleFactor, 0, 0, scaleFactor, enemies[j].position.x * scaleFactor, enemies[j].position.y * scaleFactor);				
					ctx.beginPath();	
					ctx.arc(0, 0, ENEMY_RADIUS[i] + GLOW_SIZE, 0, Math.PI2);				
					ctx.fill();	
				}
			}
		}
		ctx.restore();
	}*/
	
	// draw enemies with the largest radii's first
	ctx.lineWidth   = 1;
	for (var i = 0; i < sortedEnemyRadius.length; i++) {
		for (var j = 0; j < enemies.length; j++) {
			if (ENEMY_RADIUS[enemies[j].type] == sortedEnemyRadius[i])
				enemies[j].draw(ctx);
		}
	}	
	
}

var PULSE_METER_X = 200,
	PULSE_METER_Y = 5,
	PULSE_METER_W = 300,
	PULSE_METER_H = 17;

function drawStatusDisplays() {

	// draw pulse charge meter
	ctx.fillStyle = WHITE;
	ctx.fillTextAlign('Pulse Charge', PULSE_METER_X - 5, 10, 'right');

	if (!player.pulseOn) {
		ctx.fillStyle = 'rgb(255, 0, 0)';
		ctx.fillRect(PULSE_METER_X, PULSE_METER_Y, PULSE_METER_W * player.pulseCharge, PULSE_METER_H);
	}
	
	ctx.lineWidth = 1;
	ctx.strokeStyle = WHITE;
	ctx.strokeRect(PULSE_METER_X, PULSE_METER_Y, PULSE_METER_W, PULSE_METER_H);	
	
	// draw level info
	// score, kills/killsneeded, laser angle/power, spawn rate
	ctx.fillStyle = 'rgb(50, 255, 50)';
	ctx.fillText('Laser', 10, 70);
	ctx.fillText('Angle : ' + (player.laserAngle*180/Math.PI).toFixed(2), 40, 70);
	ctx.fillText('Power : ' + (player.laserPower).toFixed(2), 40, 80);
	
	ctx.fillStyle = 'rgb(255, 80, 80)';
	if (!player.isBonusLevel)
		ctx.fillTextAlign('Kills : ' + player.kills + '/' + player.killsNeeded, CANVAS_WIDTH - 5, 60, 'right');
	else
		ctx.fillTextAlign('Kills : ' + player.kills, CANVAS_WIDTH - 5, 60, 'right');
	
	ctx.fillStyle = 'rgb(180, 180, 255)';
	ctx.fillTextAlign('Spawn Rate : ' + player.getSpawnRate().toFixed(2) + ' per second', CANVAS_WIDTH - 5, 35, 'right');
	
	ctx.fillStyle = WHITE;
	ctx.fillTextAlign('Level : ' + (player.isBonusLevel ? player.level : (player.level+1)), CANVAS_WIDTH - 5, 10, 'right');
	
	drawScore();
}

function drawTextDisplays() {

	if (player.levelStarted && !player.isGamePaused && !player.isGameOver)
		return;
		
	var oldFont = ctx.font;		
	ctx.font = '48px Arial';	
	ctx.fillStyle = WHITE;
	
	if (player.isGamePaused) {
	
		ctx.fillTextAlign('Paused', GAME_SIZE_DIV2, TOP_MARGIN + 100);	
		ctx.font = '26px Arial';		
		ctx.fillTextAlign('Click anywhere to resume...', GAME_SIZE_DIV2, 500);
	}
	else {
	
		if (player.isGameOver) {
			ctx.fillTextAlign('Game Over', GAME_SIZE_DIV2, TOP_MARGIN + 100);	
		}
		else if (!player.inHelpScreen && !player.inOptionsScreen) {
		
			if (!player.isBonusLevel) 
				ctx.fillTextAlign('Level ' + (player.level + 1), GAME_SIZE_DIV2, TOP_MARGIN + 100);
			else
				ctx.fillTextAlign('Bonus Level', GAME_SIZE_DIV2, TOP_MARGIN + 100);
		}
	}
	ctx.font = oldFont;
}




function getScorePlace(score, place) {

	var s = score.toString();
	return (place > s.length - 1 ? 0 :s[s.length - 1 - place]);
}

function ScoreDigit(scoreBoard, place) {

	this.scoreBoard = scoreBoard;

	this.place = place;
	this.isScrolling = false;
	this.scroll = 0.0;
	this.digit = 0;
	this.oldDigit = 0;
}

ScoreDigit.prototype.update = function(score) {

	var currDigit = getScorePlace(score, this.place);

	if (currDigit != this.digit && !this.isScrolling) {
		this.isScrolling = true;
		this.oldDigit    = this.digit;
		this.digit       = currDigit;
		this.scroll      = 0.0;
	}

	if (this.isScrolling) {
	
		this.scroll += delta * 1.5;
		if (this.scroll >= 1.0)
			this.isScrolling = false;
	}
};

ScoreDigit.prototype.draw = function() {

	var x = this.scoreBoard.x + (this.scoreBoard.digits.length - this.place - 1) * this.scoreBoard.xSpacing;
	
	if (this.isScrolling) {
		ctx.fillText(this.digit.toString(),    x, this.scoreBoard.y - this.scoreBoard.ySpacing*(1.0-this.scroll));
		ctx.fillText(this.oldDigit.toString(), x, this.scoreBoard.y + this.scoreBoard.ySpacing*(this.scroll));
	}
	else 
		ctx.fillText(this.digit, x, this.scoreBoard.y);
};

function ScoreBoard(numDigits, x, y, xSpacing, ySpacing, font, textColor) {
	
	this.digits = [];
	for (var i = 0; i < numDigits; i++) 
		this.digits[i] = new ScoreDigit(this, i);
		
	this.x         = x;
	this.y         = y;
	this.xSpacing  = xSpacing;
	this.ySpacing  = ySpacing;
	this.font      = font;
	this.textColor = textColor;
}

ScoreBoard.prototype.draw = function(score) {

	ctx.save();
	ctx.beginPath();
	ctx.rect(this.x, this.y, this.xSpacing * this.digits.length, this.ySpacing);
	ctx.clip();
	
	ctx.fillStyle = this.textColor;
	ctx.font = this.font;

	for (var i = 0; i < this.digits.length; i++) {
		this.digits[i].update(score);
		this.digits[i].draw();
	}
	ctx.restore();
};

var mainScoreBoard = new ScoreBoard(8, 40, 30, 11, 18, '18px Arial', 'rgb(100, 100, 255)');

function drawScore() {

	ctx.fillText('Score : ', 5, 35);
	mainScoreBoard.draw(player.score);
}


var fps = 0, numFrames = 0, lastSecondTime = 0;
function drawFPS() {
	
	if ((new Date()).getTime() - lastSecondTime >= 1000) {
		lastSecondTime = (new Date()).getTime();
		fps = numFrames;
		numFrames = 0;
	}
	numFrames++;
	ctx.fillStyle = WHITE;
	ctx.fillText(fps, CANVAS_WIDTH - 30, CANVAS_HEIGHT - 20);
}

var recursiveMainLoop = function() {

	delta = (new Date()).getTime() - lastFrameMillis;
	lastFrameMillis += delta;
	
	delta /= 1000.0;

	updateFrame();

	lastAnimRequest = animFrame( recursiveMainLoop );
};


oneTimeInitialization();