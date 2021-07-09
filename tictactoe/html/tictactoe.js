tictactoe.viewport = [-2, -2, 2, 2];

tictactoe.ui = {
	'board.*.*': {
		size: [1, 1, 50, 50],
		image: function(src, y, x) {
			if (src === null)
				return 'empty.svg';
			else
				return 'player' + src + '.svg';
		},
		location: [-1, -1, 0],
		offset: [[0, 1, 0], [1, 0, 0]],
		click: function(src, y, x) { game('play', y, x); }
	}
};

tictactoe.update = function() {
	if (Public.ended)
		set_state(_('The game has ended'));
	else if (Public.turn == my_num)
		set_state(_('It is your turn to play'));
	else
		set_state(_('Please wait for your turn'));
}

tictactoe.end = function(winner) {
	if (my_num == winner)
		show_chat(null, _('You won!'));
	else if (winner === null)
		show_chat(null, _("It's a draw."));
	else
		show_chat(null, _('You lost'));
}
