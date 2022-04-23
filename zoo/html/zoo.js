// use strict;
// vim: set foldmethod=marker :

// Public and Private attribute documentation {{{

// Public:

// cardnames: [str] const names of all cards
// cards: {int:{under:[int], number:int}} const properties of all cards
// pile: [int] current pile on the table (first card is on bottom)
// current_cards: int number of cards in pile
// round: int number of this round, starting at 0
// turn: int player number of current player
// current: [card:int,num:int,mosquito:bool,joker:bool,player:int] current pile
// help: [card:int,num:int,mosquito:bool,joker:bool,target:int] request for help
// remove: bool if True, remove missing cards. Otherwise schedule them as removed so they can be moved when they appear elsewhere.

// players[].score: int current score; updated at the end of each round
// players[].score_cards: int number of cards in this round's score pile
// players[].partner: [int?,bool?] player,is_highest_in_team or null,null
// players[].cards: int number of cards in hand
// players[].done: int? finishing position (first is 0) or null if still playing
// players[].blocked: bool True if player had to pass on starting a turn because they only have a joker left.


// Private:

// hand: [int] cards in hand
// pile: [int] scored cards
// }}}

// Globals {{{
game.viewport = [-15, -10, 15, 10];
//game.current;	// [type:int, [Card, ...], MosquitoCard, JokerCard] current pile on table (for active and help).
//game.current_help;	// same for current help pile on table
//game.hand;	// [[Card, ...], ...]
game.selection = [0, 0, false, false];	// [type:int, num:int, mosquito:bool, joker:bool]
//game.trade2;	// Second trade card.
//game.others;	// [[Card, ...], ...] cards of players.
//game.nodes;	// [Node, ...] per player, one node.
game.playernames = [];
//game.active_empty;
//game.backgroundnode, background;
//game.MOSQUITO, JOKER, ELEPHANT;
game.did_ping = false;	// Avoid multiple pings for one event.
//game.remove;	// Cards that are scheduled to be removed, but may be moved to somewhere else.
//game.pile;	// [Card, ...]
//game.scores;	// [[Card, ...], ...]; one per player.
game.cardsize = [2, 2 * 87 / 56, 90, 90 * 87 / 56];

// Card positions.
game.x_selection = -13;
game.x_help = -6;
game.x_active = 2;
game.x_pile = 11;
game.x_joker = 1.5;
game.x_trade = -11;

game.y_table = 0;
game.y_own = -8;
game.y_other = 8;
game.y_pile = 2;
game.y_score_offset = 4;
game.y_mosquito = -1;
game.y_joker = -.5;
game.y_trade2 = -1;
game.y_trade2 = 3;

game.ELEPHANT = 10;
game.MOSQUITO = 11;
game.JOKER = 12;
// }}}

game.ui = {
	'pile.*': {
		// current pile on the table.
		size: [2, 2 * 87 / 56, 90, 90 * 87 / 56],
		image: function(obj, n) { return game.cardobj[obj[0]](); },
		location: function(obj, n) { return [game.x_pile + obj[1][0] * 4, game.y_pile + obj[1][1] * 4]; }
	},
	'Private.selected.num.*': {
		size: [2, 2 * 87 / 56, 90, 90 * 87 / 56],
		image: function(obj, n) { return game.cardobj[Private.selected.type](); },
		location: function(obj, n) { return [game.x_selection, game.y_table]; },
		click: function() { game('unselect', Private.selected.type); }
	},
	'Private.selected.mosquito': {
		size: [2, 2 * 87 / 56, 90, 90 * 87 / 56],
		image: game.image.mosquito,
		visible: function(obj) { return obj; }
		location: function(obj, n) { return [game.x_selection, game.y_mosquito]; },
		click: function() { game('unselect', game.MOSQUITO); }
	},
	'Private.selected.joker': {
		size: [2, 2 * 87 / 56, 90, 90 * 87 / 56],
		image: game.image.joker,
		visible: function(obj) { return obj; }
		location: function(obj, n) { return [game.x_selection, game.y_joker]; },
		click: function() { game('unselect', game.JOKER); }
	},
	'current.num.*': {
		size: [2, 2 * 87 / 56, 90, 90 * 87 / 56],
		image: function(obj, n) { return game.cardobj[Public.current.type](); },
		location: function(obj, n) { return [game.x_active, game.y_table]; },
		click: function() { game('play'); }
	},
	'current.mosquito': {
		size: [2, 2 * 87 / 56, 90, 90 * 87 / 56],
		image: game.image.mosquito,
		visible: function(obj) { return obj; }
		location: function(obj, n) { return [game.x_active, game.y_mosquito]; },
		click: function() { game('play'); }
	},
	'current.joker': {
		size: [2, 2 * 87 / 56, 90, 90 * 87 / 56],
		image: game.image.joker,
		visible: function(obj) { return obj; }
		location: function(obj, n) { return [game.x_active, game.y_joker]; },
		click: function() { game('play'); }
	},
	'help.num.*': {
		size: [2, 2 * 87 / 56, 90, 90 * 87 / 56],
		image: function(obj, n) { return game.cardobj[Public.help.type](); },
		location: function(obj, n) { return [game.x_help, game.y_table]; },
		click: function() { game('help'); }
	},
	'help.mosquito': {
		size: [2, 2 * 87 / 56, 90, 90 * 87 / 56],
		image: game.image.mosquito,
		visible: function(obj) { return obj; }
		location: function(obj, n) { return [game.x_help, game.y_mosquito]; },
		click: function() { game('help'); }
	},
	'help.joker': {
		size: [2, 2 * 87 / 56, 90, 90 * 87 / 56],
		image: game.image.joker,
		visible: function(obj) { return obj; }
		location: function(obj, n) { return [game.x_help, game.y_joker]; },
		click: function() { game('help'); }
	},
	'players.*.score_cards.*': {
		size: [2, 2 * 87 / 56, 90, 90 * 87 / 56],
		image: game.image.blank,
		location: function(obj, p, n) { return [player_x(p), game.y_other + y_score_offset, n * .01]; },
		visible: function(obj, p, n) { return p != my_num; }
	},
	'players.*.cards.*': {
		size: [2, 2 * 87 / 56, 90, 90 * 87 / 56],
		image: game.image.blank,
		location: function(obj, p, n) { return [player_x(p) + n / 2, game.y_other, n * .01]; },
		visible: function(obj, p, n) { return p != my_num; }
	},
	'players.*.score': {
		size: [4, .5, 200, 25],
		text: function(obj, n) {
			var p = Public.players[p];
			var ret = p.name + ': ' + obj;
			if (p.partner !== null)
				ret += ' (partner of ' + Public.players[p.partner].name + ')';
			if (p.done)
				ret += ' (Done)';
			return ret;
		}
	},
	'Private.hand.*.*': {
		size: [2, 2 * 87 / 56, 90, 90 * 87 / 56],
		image: function(obj, c, n) { return game.image[Public.cardnames[c]]; },
		location: function(obj, c, n) { return [n * 2, game.y_own + n / 2, n * .01]; },
		click: function(obj, c, n) { game('select', c); }
	},
	'Private.pile.*': {
		size: [2, 2 * 87 / 56, 90, 90 * 87 / 56],
		image: game.image.blank,
		location: function(obj, n) { return [0, game.y_own - y_score_offset, n * .01]; }
	}
};

game.reply = function(ret) { // {{{
	if (ret === null)
		return;
	var args = [];
	for (var i = 1; i < arguments.length; ++i)
		args.push(arguments[i]);
	var fmt = _(ret, true);
	alert(fmt.apply(fmt, args));
} // }}}

game.ping = function() { // {{{
	if (game.did_ping)
		return;
	game.audio.ping();
	game.did_ping = true;
} // }}}

game.end = function(score) { // {{{
	show_chat(null, _('Game ended:\n') + score);
} // }}}

game.wrong = function(message) { // {{{
	console.info(message);
	alert(message);
} // }}}

game.score_round = function(scores) { // {{{
	var message = _("This round's scores:");
	for (var p = 0; p < scores.length; ++p) {
		if (Public.players.length == 3 || Public.round > 0) {
			var partnertext = (Public.players.length > 3 ? _(', partner: $1')(scores[p][1]) : '');
			message += '\n' + Public.players[p].name + ':' + (scores[p][0] + scores[p][1] + scores[p][2] + scores[p][3]) + _(' (self: $1$2, lions: $3, hedgehog: $4)')(scores[p][0], partnertext, scores[p][2], scores[p][3]);
		}
		else
			message += '\n' + Public.players[p].name + ':' + (scores[p][0] + scores[p][1] + scores[p][2] + scores[p][3]);
	}
	show_chat(null, message);
} // }}}
