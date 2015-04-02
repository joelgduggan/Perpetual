
// 2-d Vector class
// Created by Joel Duggan (joelgduggan@gmail.com),  May 2013

function Vector2() {
	this.x = 0.0;
	this.y = 0.0;
}

// sets x and y and returns a reference to itself
Vector2.prototype.set = function(x,y) { 
	this.x = x; 
	this.y = y; 
	return this; 
};

Vector2.prototype.setVector2 = function(v) { 
	this.x = v.x; 
	this.y = v.y; 
	return this; 
};

function getVector2(x, y) { return (new Vector2()).set(x,y); }

Vector2.prototype.copy = function() { return getVector2(this.x, this.y); };

// returns the length (distance to origin)
Vector2.prototype.length = function() { return Math.sqrt(this.x*this.x + this.y*this.y); };

// often useful if all you need is to compare the lengths of two vectors, but don't need to know the exact lengths involved
Vector2.prototype.lengthSquared = function() { return (this.x*this.x + this.y*this.y); };

Vector2.prototype.add = function(b) { 
	var a = new Vector2();
	a.x = this.x + b.x;
	a.y = this.y + b.y;
	return a;
};

Vector2.prototype.addEquals = function(b) {
    this.x += b.x;
    this.y += b.y;
    return this;
};

Vector2.prototype.sub = function(b) { 
	var a = new Vector2();
	a.x = this.x - b.x;
	a.y = this.y - b.y;
	return a;
};

Vector2.prototype.subEquals = function(b) {
	this.x -= b.x;
	this.y -= b.y;
	return this;
};

Vector2.prototype.mul = function(b) { 
	var a = new Vector2();
	a.x = this.x * b;
	a.y = this.y * b;
	return a;
};

Vector2.prototype.mulEquals = function(b) {
	this.x *= b;
	this.y *= b;
	return this;
};

// this is division of a scalar value
Vector2.prototype.div = function(b) { 
	var a = new Vector2();
	a.x = this.x / b;
	a.y = this.y / b;
	return a;
};

Vector2.prototype.divEquals = function(b) {
	this.x /= b;
	this.y /= b;
	return this;
};

// returns the dot product of this and another vector
Vector2.prototype.dot = function(b) {
	return (this.x * b.x + this.y * b.y);
};

// returns the distance from this Vector2 to another
Vector2.prototype.distance = function(b) {
	return (b.sub(this)).length();
};

// returns a normalized version of this Vector2
Vector2.prototype.normalize = function() {
	return this.div(this.length());
};

Vector2.prototype.normalizeEquals = function() {
	return this.divEquals(this.length());
};

// returns a vector of the same direction, but new magnitude
Vector2.prototype.resize = function(newMagnitude) {
	return this.mul(newMagnitude / this.length());
};

Vector2.prototype.resizeEquals = function(newMagnitude) {
	return this.mulEquals(newMagnitude / this.length());
};

// returns a vector perpendicular to this one
Vector2.prototype.perpendicular = function() {
	return getVector2(-this.y, this.x);
};

Vector2.prototype.perpendicularEquals = function() {
	return this.set(-this.y, this.x);
};

Vector2.prototype.negate = function() {
	return getVector2(-this.x, -this.y);
};

Vector2.prototype.negateEquals = function() {
	return this.set(-this.x, -this.y);
};

Vector2.prototype.getAngle = function() {
	return Math.atan2(this.y, this.x);
};

// treats this vector as polar coordinates (radius, radians) and returns a vector in cartesian coordinates
Vector2.prototype.convertToCartesian = function() {
	return getVector2(this.x * Math.cos(this.y), this.x * Math.sin(this.y));
};

Vector2.prototype.convertToCartesianEquals = function() {
	return this.set(this.x * Math.cos(this.y), this.x * Math.sin(this.y));
};

// format : '(x,y)'
Vector2.prototype.toString = function() {
	return ('(' + this.x + ',' + this.y + ')');
};

var ORIGIN = getVector2(0, 0);

// takes an angle in radians, returns a normalized vector to the same angle
function convertRadiansToVector2(rads) {
	return getVector2(Math.cos(rads), Math.sin(rads));
}

function convertPolarToCartesian(radius, angle) {
	return getVector2(radius, angle).convertToCartesian();
}

// algorithm taken and modified from : http://stackoverflow.com/questions/1073336/circle-line-collision-detection
// 
// returns -1 if no intersection, otherwise returns the distance to intersection
function checkRayCircleIntersect(rStart, rDir, cPos, cRadius) {

	rDir = rDir.normalize();

	var f = rStart.sub(cPos);		// vector from center of sphere to ray start
	
	var a    = rDir.dot(rDir);
	var b    = 2 * f.dot(rDir);
	var c    = f.dot(f) - cRadius * cRadius;
	var disc = b * b - 4 * a * c;
	
	if (disc <= 0.0)		// no intersection
		return -1;
		
	disc = Math.sqrt(disc);

	var t1 = (-b - disc) / (2*a);		// all we care about is the closest intersection point
	//var t2 = (-b + disc) / (2*a);

	if (t1 > 0.0)
		return t1;
	else
		return -1;	
}