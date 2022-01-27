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
// }}}

game.ui = {
	'pile.*': {
		// current pile on the table.
		init: function(obj, n) {
			this.dx = (Math.random() - .5) * 4;
			this.dy = (Math.random() - .5) * 4;
		},
		size: [2, 2 * 87 / 56, 90, 90 * 87 / 56],
		image: function(obj, n) {
			return game.cardobj[obj]();
		},
		location: function(obj, n) {
			return [game.x_pile + this.dx, game.y_pile + this.dy];
		},
	},
	'current': {
	},
	'help': {
	},
	'players.*.score': {
	},
	'players.*.score_cards.*': {
	},
	'players.*.cards.*': {
	},
	'players.*.done': {
	},
	'Private.hand.*': {
	},
	'Private.pile.*': {
	}
};

game.Card = function(card, type) { // {{{
	var ret = new_div(2, 2 * 87 / 56, 90, 90 * 87 / 56);
	ret.div.type = type;
	ret.div.node = ret;
	ret.card = card;
	ret.set = function(card) {
		ret.card = card;
		var img = game.image[card === undefined ? 'blank' : card === null ? 'empty' : Public.cardnames[card]]();
		img.style.width = '90px';
		img.style.height = (90 * 87 / 56) + 'px';
		//ret.div.style.backgroundColor = 'red';
		ret.div.Add(img);
	};
	ret.move = function(dst, new_card) {
		// Move card to destination. When it gets there, change card to new_card.
		move_node(ret, dst, .3, arguments.length <= 1 ? undefined : function() {
			ret.set(new_card);
		});
	};
	ret.set(card);
	ret.selectable = true;
	ret.on_click = game.card_clicked;
	return ret;
} // }}}

game.reply = function(ret) { // {{{
	if (ret === null)
		return;
	var args = [];
	for (var i = 1; i < arguments.length; ++i)
		args.push(arguments[i]);
	var fmt = _(ret, true);
	alert(fmt.apply(fmt, args));
} // }}}

game.select = function(c) { // {{{
	var selected = (game.selection[0] == c && game.selection[1] > 0 ? game.selection[1] : c == game.MOSQUITO && game.selection[2] ? 1 : c == game.JOKER && game.selection[3] ? 1 : 0);
	var card = game.hand[c][game.hand[c].length - 1 - selected];

	if (game.trade2 !== null) {
		switch (game.selection[1]) {
			case 0:
				game.selection[0] = c;
				game.selection[1] = 1;
				card.move([game.x_trade, game.y_trade1, 0]);
				card.div.type = 'selected';
				break;
			case 1:
				game.trade2 = c;
				game.selection[1] = 2;
				card.move([game.x_trade, game.y_trade2, 0]);
				card.div.type = 'selected';
				break;
			default:
				game.wrong(_('Can only trade two cards'));
				break;
		}
	}
	else if (c == game.MOSQUITO && !game.selection[2] && (game.selection[0] == game.ELEPHANT || game.selection[1] == 0)) {
		// Set mosquito.
		game.selection[2] = true;
		game.selection[0] = game.ELEPHANT;
		card.div.type = 'selected';
		card.move([game.x_selection, game.y_mosquito, -1]);
	}
	else if (c == game.MOSQUITO && game.selection[2] && game.selection[1] == 0) {
		// Move mosquito into normal selection.
		game.selection[0] = game.MOSQUITO;
		game.selection[1] = 2;
		game.selection[2] = false;
		card.div.type = 'selected';
		game.hand[c][game.hand[c].length - 1].move([game.x_selection, game.y_table, 0]);
		card.move([game.x_selection, game.y_table + 1, 1]);
	}
	else if (c == game.JOKER && !game.selection[3]) {
		// Set joker.
		game.selection[3] = true;
		card.div.type = 'selected';
		card.move([game.x_selection + game.x_joker, game.y_joker, -2]);
	}
	else if (c == game.selection[0] || (game.selection[1] == 0 && (c == game.ELEPHANT || !game.selection[2]))) {
		// Normal card.
		game.selection[0] = c;
		card.div.type = 'selected';
		card.move([game.x_selection, game.y_table + game.selection[1], game.selection[1]]);
		game.selection[1] += 1;
	}
	else {
		// Not allowed.
		game.wrong(_('You cannot play this card'));
	}
} // }}}

game.deselect = function(c) { // {{{
	var selected = (game.selection[0] == c && game.selection[1] > 0 ? game.selection[1] : c == game.MOSQUITO && game.selection[2] ? 1 : c == game.JOKER && game.selection[3] ? 1 : 0);
	var card = game.hand[c][game.hand[c].length - selected];
	if (game.trade2 !== null) {
		selected = (game.selection[1] == 2 && game.selection[0] == game.trade2 ? 2 : 1);
		if (game.selection[1] == 2) {
			// If card 1 is clicked, swap cards.
			if (game.selection[0] != game.trade2 && c == game.selection[0]) {
				game.selection[0] = game.trade2;
				game.trade2 = c;
				game.hand[game.selection[0]][game.hand[game.selection[0]].length - 1].move([game.x_trade, game.y_trade1, 0]);
			}
			c = game.trade2;
		}
		card = game.hand[c][game.hand[c].length - (selected == 2 && game.selection[0] == game.trade2 ? 2 : 1)];
		game.selection[1] -= 1;
		if (game.selection[1] == 0 && !Private.actions.trade)
			game.trade2 = null;
	}
	else if (c == game.MOSQUITO && game.selection[2])
		game.selection[2] = false;
	else if (c == game.JOKER)
		game.selection[3] = false;
	else if (c == game.MOSQUITO && game.selection[1] == 2) {
		// There is only one left, move it into its own slot.
		game.selection[2] = true;
		game.selection[1] = 0;
		game.hand[c][game.hand[c].length - 1].move([game.x_selection, game.y_mosquito, -1]);
	}
	else
		game.selection[1] -= 1;
	card.div.type = 'hand';
	card.move([(c - Public.cardnames.length / 2) * 2.2 + 1, game.y_own + game.hand[c].length - (selected - 1), game.hand[c].length - (selected - 1)]);
} // }}}

game.card_clicked = function(event) { // {{{
	if (Public.ended) {
		game('admin', 'leave');
		return;
	}
	if (my_num === null)
		return;
	var c = event.target.node.card;
	if (event.target.type == 'hand') {
		// Move hand card to selection, if allowed.
		// Allowed if:
		// trading and there is at most one card there.
		// target = mosquito, mosquito not set, type = elephant or num = 0 -> set mosquito.
		// target = mosquito, mosquito is set, num = 0 -> unset mosquito, add both.
		// target = joker, joker not set -> set joker.
		// target = type or (num = 0 and (type = elephant or mosquito not set)) -> set normal

		// Use card at top of stack, regardless of which was clicked.
		game.select(c);
	}
	else if (event.target.type == 'selected') {
		// Move card back into hand.
		// Always use the card at the top of the stack, regardless of which was clicked.
		if (game.trade2 !== null && !Private.actions.trade) {
			// Deselect all cards regardless of what was clicked.
			game.deselect(game.trade2);
			game.deselect(game.selection[0]);
		}
		else
			game.deselect(c);
	}
	else if (event.target.type == 'active') {
		// Play cards, if allowed.
		var num = game.selection[1] + (game.selection[2] ? 1 : 0) + (game.selection[3] ? 1 : 0);
		var num_current = Public.current[1] + (Public.current[2] ? 1 : 0) + (Public.current[3] ? 1 : 0);
		if (Private === null || !(Private.actions.play || (Private.actions.trade && Public.players[my_num].partner[0] === null))) {
			game.wrong(_('You cannot play cards on the table at the moment'));
		}
		else if (Private.actions.trade) {
			if (game.selection[1] != 2)
				game.wrong(_('Trade needs exactly two cards'));
			else {
				game('trade', game.selection[0], game.trade2);
				// Clean up trading stuff.
				game.deselect(game.trade2);
				game.deselect(game.selection[0]);
				game.trade2 = null;
			}
		}
		else
			game('play', game.selection[0], game.selection[1], game.selection[2], game.selection[3]);
	}
	else if (event.target.type == 'help') {
		// Help, if allowed.
		game('help', game.selection[0], game.selection[1], game.selection[2], game.selection[3]);
	}
	else if (event.target.type == Public.players[my_num].partner[0]) {
		// Give cards to partner, or ask for help, if allowed.
		if (Private.actions.trade) {
			if (game.selection[1] != 2)
				game.wrong(_('trade needs exactly two cards'));
			else {
				game('trade', game.selection[0], game.trade2);
				// Clean up trading stuff.
				game.deselect(game.trade2);
				game.deselect(game.selection[0]);
				game.trade2 = null;
			}
		}
		else if (Private.actions.ask) {
			// Request help.
			var request = ['ask', game.selection[0], game.selection[1], game.selection[2], game.selection[3]];
			// Deselect all cards, regardless of result.
			if (game.selection[2])
				game.deselect(game.MOSQUITO);
			if (game.selection[3])
				game.deselect(game.JOKER);
			while (game.selection[1] > 0)
				game.deselect(game.selection[0]);
			game.apply(game, request);
		}
	}
} // }}}

game.init = function() { // {{{
	game.ELEPHANT = 10;
	game.MOSQUITO = 11;
	game.JOKER = 12;
	/*
	var w = ['current', 'current_cards', 'remove', 'players'];
	for (var i = 0; i < w.length; ++i) {
		(function(attr) {
			watch(['Public', attr], function(value, old) { console.info('update', attr, value, old); });
		})(w[i]);
	}*/
} // }}}

game.new_game = function() { // {{{
	game.remove = {};
	game.hand = [];
	game.pile = [];
	game.scores = [];
	for (var c = 0; c < Public.cardnames.length; ++c) {
		game.hand.push([]);
		game.scores.push([]);
	}
	game.current = [null, [], null, null];
	game.current_help = [null, [], null, null];
	game.selection = [0, 0, false, false];
	game.trade2 = null;

	game.active_empty = game.Card(null, 'active');
	game.active_empty.location = [2, 0, 0];
	game.active_empty.visible = true;

	game.background = new_div(30, 20, 600, 400);
	game.background.location = [0, 0, -100];
	game.background.div.Add(game.image.background());

	// Create player nodes. {{{
	var num_others = Public.players.length - (my_num === null ? 0 : 1);
	game.nodes = [];
	game.others = [];
	for (var p = 0; p < Public.players.length; ++p)
		game.others.push([]);
	for (var p = 0; p < Public.players.length; ++p) {
		var node = new please.GraphNode();
		graph.add(node);
		game.nodes.push(node);
		var reduced = (my_num === null ? p : (p - my_num + Public.players.length) % Public.players.length);
		var dist = 30 / num_others;
		node.location = [reduced * dist - 15 - dist * .75, game.y_other, 0];
		var div = please.overlay.new_element();
		div.AddClass('playername');
		var divnode = new please.GraphNode();
		div.bind_to_node(divnode);
		divnode.div = div;
		//div.style.overflow = '';
		game.playernames.push(divnode);
		divnode.location = (p == my_num ? [15, -10, 100] : [4, 1.5, 100]);
		node.add(divnode);
	} // }}}
} // }}}

game.end_game = function() { // {{{
	del_div(game.active_empty);

	// Remove overlays.
	while (game.playernames.length > 0) {
		var p = game.playernames.pop();
		please.overlay.remove_element(p.div);
		graph.remove(p);
	}

	// Remove cards in hand (including selected).
	for (var c = 0; c < game.hand.length; ++c) {
		while (game.hand[c].length > 0)
			del_div(game.hand[c].pop());
	}

	// Remove other players' cards.
	for (var p = 0; p < game.others.length; ++p) {
		// Cards in hand.
		while (game.others[p].length > 0)
			del_div(game.others[p].pop());
		// Score pile.
		while (game.scores[p].length > 0)
			del_div(game.scores[p].pop());
	}

	// Remove cards on table.
	while (game.current[1].length > 0)
		del_div(game.current[1].pop());

	// Remove help request.
	while (game.current_help[1].length > 0)
		del_div(game.current_help[1].pop());

	// Remove pile.
	while (game.pile.length > 0)
		del_div(game.pile.pop());
} // }}}

game.ping = function() { // {{{
	if (game.did_ping)
		return;
	game.audio.ping();
	game.did_ping = true;
} // }}}

game.get_card = function(c, type) { // {{{
	var card;
	if (c === null) {
		// Special case: use whatever card is available.
		c = undefined; // fallback.
		for (var k in game.remove) {
			if (k == '')
				continue;
			if (game.remove[k].length > 0) {
				c = k;
				break;
			}
		}
	}
	if (c !== undefined && game.remove[c] !== undefined && game.remove[c].length > 0) {
		card = game.remove[c].pop();
	}
	else if (game.remove[''] !== undefined && game.remove[''].length > 0) {
		card = game.remove[''].pop();
		card.set(c);
	}
	else {
		card = game.Card(c, type);
		//console.info('creating card of type', c, 'for', type);
	}
	card.div.type = type;
	return card;
} // }}}

game.remove_card = function(card) { // {{{
	var c = (card.card === undefined ? '' : card.card);
	if (game.remove[c] === undefined)
		game.remove[c] = [];
	game.remove[c].push(card);
} // }}}

game.update = function() { // {{{
	// Update state. {{{
	if (Public.ended) {
		set_state(_('The game has ended'));
		game.did_ping = false;
	}
	else if (Private.actions.trade) {
		if (game.trade2 === null)
			game.trade2 = 0;	// Value is irrelevant; non-null means two distinct cards can be selected.
		if (Public.players[my_num].partner[0] !== null)
			set_state(_('Please give two cards to $1')(Public.players[Public.players[my_num].partner[0]].name));
		else
			set_state(_('Please play two cards into your score pile'));
		game.ping();
	}
	else if (Private.actions.help) {
		set_state(_('$1 asks if you can complete their cards')(Public.players[Public.players[my_num].partner[0]].name));
		game.ping();
	}
	else if (Private.actions.ask) {
		set_state(_('It is your turn to play (you may ask $1 for help)')(Public.players[Public.players[my_num].partner[0]].name));
		game.ping();
	}
	else if (Private.actions.play) {
		set_state(_('It is your turn to play'));
		game.ping();
	}
	else if (Public.trade) {
		var player = Public.players[Public.trade[0]];
		var who = player.name;
		var discard = false;
		if (player.partner[0] === null)
			discard = true;
		for (var i = 1; i < Public.trade.length; ++i) {
			var player = Public.players[Public.trade[i]];
			who += ', ' + player.name;
			if (player.partner[0] === null)
				discard = true;
		}
		if (discard)
			set_state(_('Waiting for trade or discard from: $1')(who));
		else
			set_state(_('Waiting for trade from: $1')(who));
		game.did_ping = false;
	}
	else {
		var name = Public.players[Public.turn].name;
		if (name === null)
			set_state(_('Waiting for player to connect'));
		else
			set_state(_("It's $1's turn")(Public.players[Public.turn].name));
		game.did_ping = false;
	}
	// }}}
	// Update player names. {{{
	for (var p = 0; p < Public.players.length; ++p) {
		var partner = Public.players[p].partner;
		var name = (Public.players[p].name === null ? _('(Waiting for this player to connect)') : Public.players[p].name);
		var partnertext = (partner[0] === null ? '' : (partner[0] == my_num ? _(' (my partner) ') : _(' (partner of $1) ')(Public.players[partner[0]].name)));
		game.playernames[p].div.ClearAll().AddText(name + partnertext + ': ' + Public.players[p].score);
		if (Public.turn == p)
			game.playernames[p].div.AddClass('turn');
		else
			game.playernames[p].div.RemoveClass('turn');
		if (Public.current[4] == p)
			game.playernames[p].div.AddClass('owner');
		else
			game.playernames[p].div.RemoveClass('owner');
	}
	// }}}
	// Update cards in hand. (Remove) {{{
	if (Private !== null) {
		for (var c = 0; c < Public.cardnames.length; ++c) {
			while (game.hand[c].length > Private.hand[c]) {
				// Remove card.
				var lost = game.hand[c].pop();
				if ((game.selection[1] > 1 && game.trade2 == c) || (game.selection[0] == c && game.selection[1] > 0))
					game.selection[1] -= 1;
				if (c == game.MOSQUITO && game.selection[2])
					game.selection[2] = false;
				if (c == game.JOKER && game.selection[3])
					game.selection[3] = false;
				game.remove_card(lost);
			}
		}
	} // }}}
	// Update other players' cards (Remove) {{{
	if (game.nodes !== null) {
		for (var p = 0; p < Public.players.length; ++p) {
			if (p == my_num)
				continue;
			while (game.others[p].length > Public.players[p].cards) {
				var card = game.others[p].pop();
				var location = card.world_location;
				game.nodes[p].remove(card);
				graph.add(card);
				card.location = location;
				game.remove_card(card);
			}
		}
	}
	// }}}
	// Remove cards from pile. {{{
	while (Public.current_cards - Public.current[1] - Public.current[2] - Public.current[3] < game.pile.length) {
		// Remove card from Pile.
		game.remove_card(game.pile.pop());
	} // }}}
	// Remove cards from player scores. {{{
	for (var p = 0; p < Public.players.length; ++p) {
		while (Public.players[p].score_cards < game.scores[p].length)
			game.remove_card(game.scores[p].pop());
	} // }}}
	game.update_cards_remove(game.current, Public.current, game.remove);
	game.update_cards_remove(game.current_help, Public.help, game.remove);
	// Update cards in hand. (Add) {{{
	if (Private !== null) {
		for (var c = 0; c < Public.cardnames.length; ++c) {
			while (game.hand[c].length < Private.hand[c]) {
				var card = game.get_card(c, 'hand');
				var selected = (game.selection[0] == c ? game.selection[1] : c == game.MOSQUITO && game.selection[2] ? 1 : c == game.JOKER && game.selection[3] ? 1 : 0);
				game.hand[c].splice(game.hand[c].length - selected, 0, card);
				card.move([(c - Public.cardnames.length / 2) * 2.2 + 1, game.y_own + game.hand[c].length - selected, game.hand[c].length - selected]);
			}
		}
	}
	// }}}
	// Update other players' cards (Add) {{{
	if (game.nodes !== null) {
		for (var p = 0; p < Public.players.length; ++p) {
			if (p == my_num)
				continue;
			while (game.others[p].length < Public.players[p].cards) {
				var card = game.get_card(null, p);
				var location = card.world_location;
				game.nodes[p].add(card);
				game.others[p].push(card);
				var origin = game.nodes[p].world_location;
				for (var i = 0; i < 3; ++i)
					location[i] -= origin[i];
				card.location = location;
				card.move([game.others[p].length * .4, 0, game.others[p].length], undefined);
			}
		}
	}
	// }}}
	// Add cards to pile. {{{
	while (Public.current_cards - Public.current[1] - Public.current[2] - Public.current[3] > game.pile.length) {
		var card = game.get_card(null, 'pile');
		game.pile.push(card);
		var randx = (Math.random() - .5) * 4;
		var randy = (Math.random() - .5) * 4;
		card.move([game.x_pile + randx, game.y_pile + randy, game.pile.length]);
	} // }}}
	// Add cards to player scores. {{{
	for (var p = 0; p < Public.players.length; ++p) {
		while (Public.players[p].score_cards > game.scores[p].length) {
			var card = game.get_card(null, 'score');
			game.scores[p].push(card);
			var pos;
			if (p == my_num)
				pos = [0, game.y_own - game.y_score_offset, 0];
			else {
				var base = game.nodes[p].world_location;
				pos = [base[0], base[1] + game.y_score_offset, 0];
			}
			card.move(pos, undefined);
		}
	} // }}}
	game.update_cards_add(game.current, Public.current, game.active_empty, game.x_active, 'active', game.remove);
	game.update_cards_add(game.current_help, Public.help, null, game.x_help, 'help', game.remove);
	if (Public.remove) {
		for (var c in game.remove) {
			while (game.remove[c].length > 0) {
				//console.info('destroying card of type', c, ':', game.remove[c][game.remove[c].length - 1]);
				del_div(game.remove[c].pop());
			}
		}
	}
} // }}}

game.update_cards_remove = function(local, remote, remove) { // {{{
	// remote = [card, num, mosquito, joker, player] (or without player for help)
	// local = [card, [Card, ...], MosquitoCard or null, JokerCard or null]
	if (remote === undefined)
		remote = [null, 0, false, false];
	while (local[1].length > remote[1]) {
		game.remove_card(local[1].pop())
	}
	if (local[1].length == 0)
		local[0] = null;
	for (var c = 2; c <= 3; ++c) {
		if (!remote[c] && local[c] !== null) {
			game.remove_card(local[c]);
			local[c] = null;
		}
	}
} // }}}

game.update_cards_add = function(local, remote, empty, x, type, remove) { // {{{
	// remote = [card, num, mosquito, joker, player] (or without player for help)
	// local = [card, [Card, ...], MosquitoCard or null, JokerCard or null]
	var with_empty = true;
	if (remote === undefined) {
		remote = [null, 0, false, false];
		with_empty = false;
	}
	if (remote[1] == 0 && !remote[2] && !remote[3]) {
		if (empty)
			empty.visible = with_empty;
	}
	else {
		if (empty)
			empty.visible = false;
		local[0] = remote[0];
		extra = (remote[2] ? 1 : 0) + (remote[3] ? 1 : 0);
		while (remote[1] > local[1].length) {
			// There are (new) cards on the table.
			var card = game.get_card(local[0], type);
			local[1].push(card);
			card.move([x, game.y_table + local[1].length - 1, local[1].length]);
		}
	}
	for (var c = 2; c <= 3; ++c) {
		if (remote[c] && local[c] === null) {
			// Add mosquito or joker.
			var info = [[game.MOSQUITO, 0, game.y_mosquito, -1], [game.JOKER, game.x_joker, game.y_joker, -2]][c - 2];
			local[c] = game.get_card(info[0], type);
			local[c].move([x + info[1], info[2], info[3]]);
		}
	}
} // }}}

game.received = function(card1, card2) { // {{{
	if (game.selection[2])
		game.deselect(game.MOSQUITO);
	if (game.selection[3])
		game.deselect(game.JOKER);
	while (game.selection[1] > 0)
		game.deselect(game.selection[0]);
	game.trade2 = 0;
	game.select(card1);
	game.select(card2);
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
