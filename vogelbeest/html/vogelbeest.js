viewport = [-1, -1, 24, 12];

function init3d() {
	color_texture(null, 'empty', 'lightblue');
	color_texture(null, 'wall', 'brown');
}

ui = {
	'room.*.*': {
		size: [.95, .95, 32, 32],
		location: [0, 0, 0],
		offset: [[0, 1, 0], [1, 0, 0]],
		update3d: function(src, y, x) {
			color_texture(this, src == 'wall' ? 'wall' : 'empty');
		},
		style2d: function(src) { return {background: src == 'wall' ? 'brown' : 'lightblue'}; },
	},
	'monster.*': {
		size: [.8, .8, 32, 32],
		init3d: function() { color_texture(this, 'black', 'black'); },
		style2d: function(src) { return {background: src.crack === null ? 'black' : src.crack ? 'grey' : 'white', border: 'solid 3px ' + playercolor(src.player)}; },
		location: function(src) {
			return [src.pos[0], src.pos[1], .005];
		},
		visible: function(src) { return !src.dead; },
	},
	'players.*': {
		time: .1,
		size: [.6, .6, 32, 32],
		text: function(src) { return src.score; },
		init3d: function(src, p) { color_texture(this, 'player' + p, playercolor(p)); },
		style2d: function(src, p) { return {background: playercolor(p), border: (src.egg === null ? '' : 'solid 3px black')}; },
		location: function(src) {
			return [src.pos[0], src.pos[1], .01];
		},
		visible: function(src) { return !src.dead; },
	}
};

function keydown(event) {
	if (event.keyCode == 32) {
		game('egg');
		return;
	}
	var dir = handle_cursor(event.keyCode);
	if (dir !== null)
		game('move', dir[0], dir[1]);
}

function reply(msg) {
	if (msg !== null)
		show_chat(null, msg);
}

function death(player, points) {
	show_chat(null, _('$1 died, scoring $2 points')(Public.players[player].name, points));
}

function end(scores) {
	show_chat(null, _('The game has ended. Scores:'))
	for (var i = 0; i < scores.length; ++i) {
		show_chat(null, _('$1: $2')(Public.players[scores[i][0]].name, scores[i][1]));
	}
}
