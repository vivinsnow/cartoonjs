
define( function ( require, exports, module ) {
	"use strict";

var DisplayObject = require('display/DisplayObject'),
	Box2D = require('physics/Box2D');

var b2Vec2 = Box2D.Common.Math.b2Vec2,
	b2BodyDef = Box2D.Dynamics.b2BodyDef,
	b2Body = Box2D.Dynamics.b2Body,
	b2FixtureDef = Box2D.Dynamics.b2FixtureDef,
    b2Fixture = Box2D.Dynamics.b2Fixture,
	b2World = Box2D.Dynamics.b2World,
	b2MassData = Box2D.Collision.Shapes.b2MassData,
    b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape,
    b2CircleShape = Box2D.Collision.Shapes.b2CircleShape,
    b2DebugDraw = Box2D.Dynamics.b2DebugDraw;

var PhysicsWorld = DisplayObject.extend({
	
	type: 'PhysicsWorld',
		
	_world: null,
	_scale: -1,
	_worldSize: null,
	
	init: function(props) {
		this._super(props);
		this._initWorld({ width: props.worldWidth, height: props.worldHeight }, props.scale || 50);
		this._initGround();
	},
		
	update: function(delta) {
		var world = this._world;

		world.Step(delta / 1000, 10, 10);
		world.ClearForces();
		
		this._updateObjects();
	},
	

	
	add: function(child, data) {
		if (!data) data = {};
		
		this._super(child);
		
		if (!data.type) return;

        var world = this._world,
        	scale = this._scale;
        
        var bodyDef = new b2BodyDef();
        bodyDef.type = data.type === 'static' ? b2Body.b2_staticBody : b2Body.b2_dynamicBody;
        bodyDef.position.x = child.x / scale;
        bodyDef.position.y = child.y / scale;
       
        var fixDef = new b2FixtureDef();
        fixDef.density = data.density || 1.0;
        fixDef.friction = data.friction || 0.5;
        fixDef.restitution = data.restitution || 0.2;
        
        if (child.radius) {
       		fixDef.shape = new b2CircleShape(child.radius/scale);
       	}
       	else if (data.shape === 'circle') {
        	fixDef.shape = new b2CircleShape(child.width/scale/2);
        } 
        else {
        	fixDef.shape = new b2PolygonShape();
        	fixDef.shape.SetAsBox(child.width/scale/2, child.height/scale/2);
        }
        child.style('transform', { translateX: -child.width/2, translateY: -child.height/2 });
         
        var body = world.CreateBody(bodyDef).CreateFixture(fixDef);
        body.m_userData = { displayObj: child };
	},
	
	drawDebug: function() {
		this._world.DrawDebugData();
	},
	
	getWorld: function() {
		return this._world;
	},
	
	_initWorld: function(size, scale) {
		this._world = new b2World(new b2Vec2(0, 10), true);
		this._scale = scale;
		this._worldSize = { width: size.width / scale, height: size.height / scale };
		
		return;
		var debugDraw = new b2DebugDraw();
		debugDraw.SetSprite(canvas._context2d);
		debugDraw.SetDrawScale(scale);
		debugDraw.SetFillAlpha(0.3);
		debugDraw.SetLineThickness(1.0);
		debugDraw.SetFlags(b2DebugDraw.e_shapeBit | b2DebugDraw.e_jointBit);
		debugDraw.m_sprite.graphics.clear = function(){};
	
		this._world.SetDebugDraw(debugDraw);
	},
	
	_initGround: function() {
		var world = this._world;
		
		var bodyDef = new b2BodyDef();
        bodyDef.type = b2Body.b2_staticBody;
        bodyDef.position.x = this._worldSize.width/2;
        bodyDef.position.y = this._worldSize.height;
        
		var fixDef = new b2FixtureDef();
        fixDef.density = 1.0;
        fixDef.friction = 0.5;
        fixDef.restitution = 0.2;
        
        fixDef.shape = new b2PolygonShape();
        fixDef.shape.SetAsBox(this._worldSize.width/2, 0);
        
        world.CreateBody(bodyDef).CreateFixture(fixDef);
	},
	
	_updateObjects: function() {
		var world = this._world,
			scale = this._scale,
			PI2 = Math.PI * 2,
			R2D = 180 / Math.PI;
			
		var i = 0,
			f, xf, data,
	   		b = world.m_bodyList,
	   		x, y, r, obj;
	   		
	    while (b) {
	    	f = b.m_fixtureList;
	      	while (f) {
	        	if (f.m_userData) {
	        		xf = f.m_body.m_xf;
	        		data = f.m_userData;
	          		obj = data.displayObj;
	          		
	          		x = xf.position.x * scale;
	          		y = xf.position.y * scale;
	          		r = Math.round(((f.m_body.m_sweep.a + PI2) % PI2) * R2D * 100) / 100;
	          		obj.style({ pos: { x: x, y: y }, transform: { rotate: r } });
	        	}
	        	f = f.m_next;
	      	}
	      	b = b.m_next;
	    }
	}
	
});

return PhysicsWorld;
});