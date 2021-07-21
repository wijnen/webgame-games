// Options for ui objects:
// boolean: value determines visibility.
// int: stack of objects with offset.
// array: stack of objects with offset.
// anything else, also contents of the array: single object.

jolly.viewport = [-5, -5, 7, 5];

jolly.y_ship = 0;
jolly.chest = [null, null];
jolly.wild;

jolly.playercolor = function(n) {
	return ['white', 'black'][n];
}

jolly.init2d = function() {
	jolly.wild = 'black';
}

jolly.init3d = function() {
	jolly.wild = '#444';
	color_texture(null, 'color-' + jolly.wild, jolly.wild);
	for (var i = 0; i < 2; ++i) {
		var tmp = please.access('owner.jta').instance();
		color_texture(tmp, 'owner' + i, jolly.playercolor(i));
		tmp.destroy();
	}
}

jolly.update_card = function(card, ship) {
	var fg, bg;
	if (ship !== null && card[0] != ship) {
		bg = jolly.wild;
		fg = 'white';
	}
	else {
		bg = ['green', 'yellow', 'blue', 'red'][card[0]];
		fg = ['black', 'black', 'white', 'white'][card[0]];
	}
	if (webgame.use_3d) {
		color_texture(this, 'color-' + bg, bg);
	}
	else {
		this.div.style.color = fg;
		this.div.style.background = bg;
	}
}

jolly.ui = {
	'Private.actions.done': {
		size: [1.5, .5, 150, 50],
		location: [-4, 3, .11],
		'class2d': 'button',
		'class3d': 'value',
		text: _('Done'),
		init3d: function() { color_texture(this, 'button', 'grey'); },
		click: function() { game('done'); },
		visible: function(src) { return src !== undefined; }
	},
	'Private.actions.reset': {
		size: [1.5, .5, 150, 50],
		location: [-4, 2, .1],
		'class2d': 'button',
		'class3d': 'value',
		text: _('Reset'),
		init3d: function() { color_texture(this, 'button', 'grey'); },
		click: function() { game('reset'); },
		visible: function(src) { return src !== undefined; }
	},
	'ship.*': {
		// 2d
		size2d: [1, 1, 512, 512],
		image2d: function(src, num) { return 'ship' + num + '.svg'; },
		class2d: 'ship',
		init2d: function(src, num) { this.div.AddText(String(src.value)); },
		// 3d
		model3d: function(src, num) { return 'ship' + '.jta'; },
		overlay3d: [-.22, 0, .4],
		text3d: function(src, num) { return src.value; },
		class3d: 'value',
		init3d: function(src, num) {
			var c = ['green', 'yellow', 'blue', 'red'];
			color_texture(this, 'ship' + num, c[num]);
		},
		// both
		location: [-2, jolly.y_ship, 0],
		offset: [2, 0, 0],
		click: jolly.select_ship
	},
	'ship.*.owner': {
		size2d: [.5, .5, 50, 50],
		image2d: function(src, num) {
			return src === null ? null : ('owner' + src + '.svg');
		},
		visible: function(src, num) { return src !== null; },
		location2d: [-1.8, jolly.y_ship, .4],
		location3d: [-1.6, jolly.y_ship, .13],
		offset: [2, 0, 0],
		class2d: 'owner',
		//text3d: function(src) { return src === null ? '' : src; },
		click: jolly.select_ship,
		model3d: 'owner.jta',
		init3d: function() { this.rotation_z = 90; },
		update3d: function(src, ship) {
			if (src !== null)
				color_texture(this, 'owner' + src, jolly.playercolor(src));
		}
	},
	'ship.*.crew.*.*': {
		class2d: 'card',
		class3d: 'value',
		location: function(src, ship, side, num) {
			var s = (side == my_num ? -1 : 1);
			return [-2, jolly.y_ship + s * (1.5 + num * .4), .1 - s * num * .01];
		},
		offset: [[2, 0, 0], null, null],
		size2d: [1, 1, 100, 100],
		size3d: [1, 1, 50, 50],
		text: function(src, ship) { return src[0] == ship ? src[1] : 1; },
		update: function(src, ship) { jolly.update_card.call(this, src, ship); },
		click: jolly.select_ship,
		tag: function(src, ship) { return src[0] == ship ? 'wild' : 'card-' + src[0] + '-' + src[1]; }
	},
	'deck.*': {
		size: [1, 1, 100, 100],
		image: 'hidden.svg',
		location: [-4, jolly.y_ship, 0],
		offset2d: [0, .04, .1],
		offset3d: [0, 0, .02],
	},
	'cards.*.*': {
		'class': 'card',
		size2d: [1, 1, 100, 100],
		size3d: [1, 1, 50, 50],
		tag: function(src) { return 'card-' + src[0] + '-' + src[1]; },
		location: function(src, group, num) {
			// Select group: both groups on side of chooser.
			// Other player: group 0 on side of other player, group 1 on side of player.
			// Player: group 0 on side of player, group 1 is empty.
			var result;
			var s = (my_num == 0 ? -1 : 1);
			var a = (Public.active === undefined || num < 0 || num >= Public.active.length ? undefined : Public.active[num]);
			var my_turn = Public.turn == my_num;
			if (Public.state == 'divide') {
				// Both groups on one side.
				if (group == 1)
					result = [5 - 1.5 * num, jolly.y_ship + (my_turn ? -1 : 1) * 4.5, 0];
				else
					result = [-2 + 1.5 * num, jolly.y_ship + (my_turn ? -1 : 1) * 4.5, 0];
			}
			else if (Public.state == 'choose') {
				// Both groups on one side.
				var y = jolly.y_ship + (my_turn ? 4.5 : -4.5);
				if (group == 1)
					result = [5 - 1.5 * num, y, 0];
				else
					result = [-2 + 1.5 * num, y, 0];
			}
			else {
				// Play, group 0 on one side, group 1 on other side.
				var s0 = ((Public.state == my_num) ? -1 : 1);
				if (group == 1)
					result = [1.5 * (Public.cards[1].length / 2 - num), jolly.y_ship - s0 * 4.5, 0];
				else {
					if (a === undefined || a === '')
						result = [1.5 * num, jolly.y_ship + s0 * 4.5, 0];
					else if (a === 'cash')
						result = [6, jolly.y_ship - .5 + .5 * num, .1 - num * .01];
					else
						result = [-2 + a * 2, jolly.y_ship + s0 * (2.5 + .5 * num), .1 - s0 * num * .01];
				}
			}
			return result;
		},
		class3d: 'value',
		text: function(src, group, num) {
			var a = (Public.active === undefined || num < 0 || num >= Public.active.length ? undefined : Public.active[num]);
			var selected = (group == 0 && Public.selected == num);
			var value = (group == 0 && a !== undefined && typeof a != 'string' && a != Public.cards[group][num][0] ? 1 : src[1]);
			if (selected)
				return '[' + value + ']';
			else
				return value;
		},
		update3d: function(src, group, num) {
			var a = (Public.active === undefined || num < 0 || num >= Public.active.length ? undefined : Public.active[num]);
			jolly.update_card.call(this, src, (group == 0 && a != undefined && typeof a != 'string') ? a : null);
		},
		update2d: function(src, group, num) {
			jolly.update_card.call(this, src, null);
			var a = (Public.active === undefined || num < 0 || num >= Public.active.length ? undefined : Public.active[num]);
			if (group == 0 && num == Public.selected) {
				this.div.AddClass('selected');
			}
			else {
				this.div.RemoveClass('selected');
			}
		},
		click: function(src, group, num) {
			if (Private.actions.move)
				game('move', group, num);
			else if (Private.actions.choose)
				game('choose', group);
			else if (group == 0) {
				var a = (Public.active === undefined || num < 0 || num >= Public.active.length ? undefined : Public.active[num]);
				if (a === undefined || a == '')
					game('select', num);
				else if (a == 'cash')
					game('cash');
				else
					jolly.select_ship(src, a);
			}
		}
	},
	'players.*': {
		class2d: 'card',
		location: function(src, player) { return [6, jolly.y_ship + (player == my_num ? -1 : 1) * 4, webgame.use_3d ? 0 : .1]; },
		style2d: function(src, player) { return {background: 'grey', color: jolly.playercolor(player) }; },
		size2d: [1, 1, 100, 100],
		size3d: [1, 1, 50, 50],
		text2d: _('$$'),
		model3d: 'chest.jta',
		init3d: function(src, player) {
			color_texture(this.node_lookup['base'], 'chest' + player, jolly.playercolor(player));
			color_texture(this.node_lookup['lid'], 'chest' + player, jolly.playercolor(player));
			jolly.chest[player] = this;
		},
		click: function() { game('cash'); }
	},
	'players.*.pile.*': {
		size: [1, 1, 100, 100],
		image: 'hidden.svg',
		location: function(src, player) { return [6, jolly.y_ship + (player == my_num ? -1 : 1) * 4, .09]; },
		init3d: function(src, player) { if (jolly.chest[player] !== null) jolly.chest[player].play('open'); }
	},
	'cash.*.*': {
		location: function(src, player) { return [4, 4 * player - 2, 0]; },
		size: [1, 1, 100, 100],
	},
	'-background': {
		location: [1, 0, -.1],
		size: [12, 10, 100, 100],
		style: { background: '#ff8' },
		init3d: function() { color_texture(this, 'bg', '#ff8'); }
	}
};

jolly.select_ship = function(src, ship) {
	game('crew', ship);
}

jolly.update = function() {
	if (Private.actions.move)
		set_state(_('Choose how to divide the cards and click done when ready'));
	else if (Private.actions.choose)
		set_state(_('Select your cards'))
	else if (Private.actions.cash) {
		if (Private.actions.done)
			set_state(_('Play your cards and click done to finish'));
		else
			set_state(_('Play your cards'));
	}
	else if (my_num !== null)
		set_state(_('Wait for your turn'));
	else
		set_state(_('You are watching the game'));
}
