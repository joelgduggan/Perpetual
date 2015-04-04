//
// GLOBAL VARIABLES
//

var isSoundOn = true;
var isMusicOn = false;

// current changes in low quality = no enemy glow, spark particles spawn less, wave particles have no alpha and shorter lifetime
// no glow under player, no shimmer on the laser
var highRenderQuality = true;

var scene;
var camera;
var renderer;

var delta;



//
// CONSTANTS
//

var TOP_MARGIN = 30;
var GAME_SIZE  = 600;
var GAME_SIZE_DIV2 = GAME_SIZE / 2;
var DIAG_SIZE  = Math.sqrt(GAME_SIZE * GAME_SIZE * 0.5);	// length from center of game to a corner
var CANVAS_WIDTH  = GAME_SIZE;
var CANVAS_HEIGHT = GAME_SIZE + TOP_MARGIN;
var ASPECT_RATIO = CANVAS_WIDTH / CANVAS_HEIGHT;
var CANVAS_MARGIN = 20;										// how much smaller the canvas is than the webpage height

var MASTER_VOLUME    	 = 0.8;
var EXPLOSION_VOLUME 	 = 0.8;		// volumes are relative to master volume (1.0 = master volume)
var SPARK_VOLUME     	 = 1.0;
var PULSE_VOLUME     	 = 0.8;
var PLAYER_DAMAGE_VOLUME = 0.9;

var PLAYER_X             = GAME_SIZE / 2;
var PLAYER_Y             = GAME_SIZE / 2 + TOP_MARGIN;
var PLAYER_POSITION      = getVector2(PLAYER_X, PLAYER_Y);
var PLAYER_RADIUS        = 8;	
var SHIELDS_START        = 4;		// number of shield rings player starts with
var SHIELDS_RADIUS_DELTA = 7;
var PULSE_WIDTH          = 20;
var PULSE_RECHARGE       = 0.015;
var PULSE_SPEED          = 100.0;
var PULSE_DAMAGE         = 4.0;		// multiplier for the amount of damage caused by pulse
var LASER_START_ANGLE    = 0.1;		// radians
var LASER_DAMAGE_FACTOR  = 0.8;		// used to alter the overall damage to enemies by laser

var ANGLE_UPGRADE        = 0.08;
var POWER_UPGRADE        = 0.16;

var GLOW_SIZE            = 10;		// in pixels, glow around enemies
var GLOW_BRIGHTNESS      = 0.4;

var SPAWN_RATE_START     = 0.3;
var SPAWN_RATE_INC       = 0.2;
var SPAWN_RATE_SWITCH    = 6;		// once this level is passed, the spawn rate increases by percentage not fixed amount
var SPAWN_RATE_MIN_PERC  = 0.155;	// percentage spawn rate increases
var SECONDS_PER_LEVEL    = 90;

var SCORE_NORMAL     = 100;			// score for an enemy of 1.0 health
var SCORE_MIN        = 20;		
var SCORE_MAX 		 = 1000;


var DEFAULT_FONT     = '24px Arial';

var BLACK            = 'rgb(0,0,0)';
var WHITE            = 'rgb(255,255,255)';
var CLEAR            = 'rgba(0,0,0,0)';

Math.PI2      = Math.PI * 2.0;
Math.PIOVER2  = Math.PI / 2.0;
Math.PIOVER4  = Math.PI / 4.0;
Math.PI3OVER2 = Math.PI * 1.5;

function randInt(exclusiveMax) { return Math.floor(Math.random() * exclusiveMax); }
function randBool()            { return randInt(2) == 0; }

function clamp(num, low, high) {
	if      (num < low)  return low;
	else if (num > high) return high;
	else                 return num;
}

function pointInRect(px, py, rx, ry, rw, rh) {

	return (px >= rx && px <= rx + rw && py >= ry && py <= ry + rh);
}

// modified from http://www.w3schools.com/js/js_cookies.asp
//
function setCookie(cookieName, cookieValue, daysBeforeExpire) {
	
	var expDate     = new Date();
	expDate.setDate(expDate.getDate() + daysBeforeExpire);
	cookieValue     = escape(cookieValue) + ((daysBeforeExpire == null) ? "" : "; expires=" + expDate.toUTCString());
	document.cookie = cookieName + "=" + cookieValue;
	//console.log("cookie written : " + cookieName + "=" + cookieValue);
}

// modified from http://www.tutorialspoint.com/javascript/javascript_cookies.htm
//
function getCookie(cookieName) {

	var cookies = document.cookie;
	cookies     = cookies.split(';');

	for(var i = 0; i < cookies.length; i++) {
		if (cookies[i].split('=')[0] == cookieName) {
			//console.log('cookie read : ' + cookies[i]);
			return cookies[i].split('=')[1];
		}
   	}
	return null;	
}

// this represents a span(straight arc) defined in polar coordinates using two angles and a radius
// 'a' defines the first angle moving counter-clockwise from 0
function Span() {
	/*
	this.a = 0.0;
	this.b = 0.0;
	this.r = 0.0;
	*/
}

Span.prototype.set = function(a, b, r) {
	
	// keep angles between [0,2PI]
	if (a < 0)             a += Math.PI2;
	else if (a > Math.PI2) a -= Math.PI2;
	if (b < 0)             b += Math.PI2;
	else if (b > Math.PI2) b -= Math.PI2;
	
	this.a = a;
	this.b = b;
	this.r = r;
	
	// find mid-angle
	if (this.a > this.b) {
		var m = (this.a + this.b + Math.PI2) / 2.0;
		if (m > Math.PI2)
			this.midAngle = m - Math.PI2;
		else
			this.midAngle = m;
	}
	else
		this.midAngle =(this.a + this.b) / 2.0;
		
	// find length
	if (this.a > this.b)
		this.length = Math.PI2 - (this.a - this.b);
	else
		this.length = this.b - this.a;	
	this.halfLength = this.length / 2;
};

Span.prototype.copy = function() {
	var s = new Span();
	s.a = this.a;
	s.b = this.b;
	s.r = this.r;
	return s;
};

// returns the midpoint of the span in cartesian coordinates
Span.prototype.midpoint = function() {
	return getVector2(this.r, this.midAngle).convertToCartesian();
};

// format : '(a,b,r)'
Span.prototype.toString = function() {
	return ('(' + this.a + ',' + this.b + ',' + this.r + ')');
};

function getSpan(a, b, r) {
	var s = new Span();
	s.set(a,b,r);
	return s;
}

// returns true if these two spans intersect in any way
// copied algorithm from http://stackoverflow.com/questions/3564120/determine-whether-two-sectors-of-a-given-circle-intersect
var SPAN1_CONTAINS_SPAN2 = 0, SPAN2_CONTAINS_SPAN1 = 1, SPANS_INTERSECT_1 = 2, SPANS_INTERSECT_2 = 3, SPANS_NO_INTERSECT = 4;

function spansIntersect(s1, s2) {

	var d  = Math.abs(s1.midAngle - s2.midAngle);
	d      = Math.min(d, Math.PI2 - d);
	
	if (d < s1.halfLength + s2.halfLength) {
	
		if (d < s1.halfLength - s2.halfLength)
			return SPAN1_CONTAINS_SPAN2;
		else if (d < s2.halfLength - s1.halfLength)
			return SPAN2_CONTAINS_SPAN1;
		else {
			if (s1.containsAngle(s2.a))
				return SPANS_INTERSECT_1;
			else
				return SPANS_INTERSECT_2;
		}
	}
	else
		return SPANS_NO_INTERSECT;
}

Span.prototype.containsAngle = function (s) {

	var d  = Math.abs(this.midAngle - s);

	return ( Math.min(d, Math.PI2 - d) < (this.length/2.0) );
};


// represents a javascript color, r,g,b = 0 - 255, a = 0.0 to 1.0
function Color() { }

Color.prototype.set = function(r,g,b,a) {
	if (typeof(a) === 'undefined') a = 1.0;
	
	this.r = clamp(Math.round(r), 0, 255);
	this.g = clamp(Math.round(g), 0, 255);
	this.b = clamp(Math.round(b), 0, 255);
	this.a = clamp(a, 0.0, 1.0);
};

function getColor(r,g,b,a) {
	if (typeof(a) === 'undefined') a = 1.0;
	var c = new Color();
	c.set(r,g,b,a);
	return c;
}

function getColorStringRGB(r,g,b) {
	var c = new Color();
	c.set(r,g,b,1.0);
	return c.toStringRGB();
}

function getColorStringRGBA(r,g,b,a) {
	var c = new Color();
	c.set(r,g,b,a);
	return c.toStringRGBA();
}

Color.prototype.copy = function() {
	return getColor(this.r, this.g, this.b, this.a);
};

Color.prototype.toStringRGB = function() {
	return ('rgb(' + this.r + ',' + this.g + ',' + this.b + ')');
};

Color.prototype.toStringRGBA = function() {
	return ('rgba(' + this.r + ',' + this.g + ',' + this.b + ',' + this.a + ')');
};
