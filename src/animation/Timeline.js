
define( function ( require, exports, module ) {
	"use strict";
	   
var EventDispatcher = require('core/EventDispatcher'),
	Ease = require('animation/Ease');

var Timeline = EventDispatcher.extend({
	
	_paused: true,
	_loop: false,
	
	_targets: null,
	_currentTarget: null,

	_deltaTime: -1,
	_duration: -1,
	
	init: function(props) {
		this._paused = false;
		this._loop = props ? !!props.loop : false;
		
		this._targets = []; // 执行对象集合
		this._deltaTime = 0; // 动画当前时间 
		this._duration = 0; // 动画持续时间		
	},
	
	play: function(timepoint) {
		// 开启播放
		if (typeof(timepoint) === 'number') {
			this.gotoAndPlay(timepoint);
		} else {
			this._paused = false;
		}
	},
	
	stop: function() {
		// 停止播放
		this._paused = true;
	},
	
	gotoAndPlay: function(timepoint) {
		this._paused = false;
		// 从指定时间播放
		this._deltaTime = timepoint;
	},
	
	has: function(target) {
		var targets = this._targets;
		// 判断是否存在执行对象
        for (var i=targets.length-1; i>=0; i--) {
        	if(targets[i] === target) {
            	return true;
            }
        }
        return false;
   	},
	
	get: function(target) {
		if (!this.has(target)) {
			// 初始化对象的动画参数
			this.removeKeyframes(target);
			target.data('tl_queue', []);
			target.data('tl_start', {});
			// 添加对象到集合
			this._targets.push(target);
		}
		// 设置当前对象		
		this._currentTarget = target;
		
		return this;
	},

	getTime: function() {
		// 获取当前时间
		return this._deltaTime;
	},
		
	addKeyframe: function(props, timepoint, easing, callback) {
		var target = this._currentTarget,
			queue = target.data('tl_queue'),
			start = target.data('tl_start');
		// 获取初始状态
		for (var i in props) {
			start[i] = this._clone(target.style(i));
		}
		// 添加参数到队列
		queue.push([props, timepoint, easing || 'linear', callback]);
		queue.sort(function(a, b) {
			return a[1] - b[1];
		});
		
		var steps = [],
			step,
			from = 0;
		// 创建动画过程
		for (var i=0, l=queue.length; i<l; i++) {
			step = queue[i];
			// 添加新的动画过程
			steps.push({
				from: from, to: step[1], // 开始时间和结束时间
				start: start, end: step[0], // 开始状态和结束状态
				easing: step[2], callback: step[3] // 过渡函数和回调函数
			})
			// 更新开始时间和状态
			from = step[1];
			start = this._merge(start, step[0]);
		}
		// 设置动画持续时间		
		if (this._duration < from) {
			this._duration = from;
		}
		target.data('tl_steps', steps);

		return this;
	},
	
	removeKeyframes: function(target) {
		// 移除所有关键帧
		target.data('tl_queue', null);
		target.data('tl_start', null);
		target.data('tl_steps', null);
		target.data('tl_cur_step', null);
	},
	
	update: function(delta) {
		if (this._paused) return;
		
		var targets = this._targets,
			target,
			step;
		// 获取动画参数	
		var now = this._deltaTime,
			duration = this._duration;
		// 遍历执行对象
		for (var i=0, l=targets.length; i<l; i++) {
			target = targets[i];
			// 获取当前过渡动画
			step = this._getStep(target, now);
			// 更新当前过渡动画
			if (step) {
				this._updateStep(target, step, now);
				// 动画结束时执行最后帧的回调
				if (now === duration && step.to === duration && step.callback) {
					step.callback(now);
				}
			}
		}
		// 判断动画是否结束
		if (now === duration) {
			if (this._loop) { // 循环播放
				this._deltaTime = 0;
			} else { // 停止播放
				this.stop();
			}
			// 触发动画结束事件
			this.trigger({ type: 'animationend' });
		} else {
			// 更新执行时间
			var nextTime = now + delta;
			this._deltaTime = nextTime > duration ? duration : nextTime;
		}
	},
	
	_getStep: function(target, now) {
		var curStep = target.data('tl_cur_step');
		// 判断时间是否超出动画区间
		if (curStep) {
			if (now >= curStep.from && now <= curStep.to) {
				return curStep; // 没有超出返回当前动画
			} else {
				if (now > curStep.to && curStep.callback) {
					curStep.callback(now); // 执行回调
				}
				target.data('tl_cur_step', null);
			}
		}
	
		var steps = target.data('tl_steps'),
			duration = steps[steps.length - 1].to,
			step;
		// 获取当前过渡动画	
		if (now <= duration) {
			for (var i=0, l=steps.length; i<l; i++) {
				step = steps[i];
				if (now >= step.from && now <= step.to) {
					target.style(step.start); // 初始化样式
					target.data('tl_cur_step', step);
					return step;
				}
			}
		}
		
		return null;
	},
	
	_updateStep: function(target, step, now) {
		if (step.to === step.from) {
			// 当动画为单帧时，直接更新样式
			target.style(step.end);
			return;
		}
		var duration = step.to - step.from,
			easing = Ease.get(step.easing),
			percent = (now - step.from) / duration,
			pos = easing(percent, percent, 0, 1, 1),
			start = step.start,
			end = step.end;			
		// 设置过渡样式
		for (var i in end) {
			target._stepStyle(i, {
				pos: pos, start: start[i], end: end[i]
			});
		}
	},
	
	_clone: function(origin) {
		var temp;
		if (typeof(origin) === 'object') {
			temp = {};
			for (var i in origin) {
				temp[i] = this._clone(origin[i]);
			}
 		} else {
			temp = origin;
		}		
		return temp;
	},
	
	_merge: function(origin, extension) {
		var temp = this._clone(origin);
		
		if (typeof(extension) === 'object') {
			for (var i in extension) {
				if (typeof(temp[i]) === 'object' && typeof(extension[i]) === 'object') {
					for (var j in extension[i]) {
						temp[i][j] = extension[i][j];
					}
				} else {
					temp[i] = extension[i];
				}
			}
 		} else {
			temp = extension;
		}
		return temp;
	}

});

return Timeline;
});