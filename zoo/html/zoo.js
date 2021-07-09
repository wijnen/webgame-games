// use strict;
// vim: set foldmethod=marker :

// Public and Private attribute documentation {{{

// Public:

// cardnames: [str] const names of all cards
// cards: {int:{under:[int], number:int}} const properties of all cards
// pile: {int:int} current pile on the table (for scoring)
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
viewport = [-15, -10, 15, 10];
var current, current_help;	// [type:int, [Card, ...], MosquitoCard, JokerCard] current pile on table (for active and help).
var hand;	// [[Card, ...], ...]
var selection = [0, 0, false, false];	// [type:int, num:int, mosquito:bool, joker:bool]
var trade2;	// Second trade card.
var others;	// [[Card, ...], ...] cards of players.
var nodes;	// [Node, ...] per player, one node.
var playernames = [];
var active_empty;
var backgroundnode, background;
var MOSQUITO, JOKER, ELEPHANT;
var did_ping = false;	// Avoid multiple pings for one event.
var remove;	// Cards that are scheduled to be removed, but may be moved to somewhere else.
var pile;	// [Card, ...]
var scores;	// [[Card, ...], ...]; one per player.
var cardsize = [2, 2 * 87 / 56, 90, 90 * 87 / 56];

// Card positions.
var x_selection = -13;
var x_help = -6;
var x_active = 2;
var x_pile = 11;
var x_joker = 1.5;
var x_trade = -11;

var y_table = 0;
var y_own = -8;
var y_other = 8;
var y_pile = 2;
var y_score_offset = 4;
var y_mosquito = -1;
var y_joker = -.5;
var y_trade1 = -1;
var y_trade2 = 3;
// }}}

function Card(card, type) { // {{{
	var ret = new_div(2, 2 * 87 / 56, 90, 90 * 87 / 56);
	ret.div.type = type;
	ret.div.node = ret;
	ret.card = card;
	ret.set = function(card) {
		ret.card = card;
		ret.div.style.background = 'url(webgame/img/' + (card === undefined ? 'blank' : card === null ? 'empty' : encodeURIComponent(Public.cardnames[card])) + '.svg)';
		ret.div.style.backgroundSize = '90px ' + (90 * 87 / 56) + 'px';
		//ret.div.style.backgroundColor = 'red';
	};
	ret.move = function(dst, new_card) {
		// Move card to destination. When it gets there, change card to new_card.
		move_node(ret, dst, .3, arguments.length <= 1 ? undefined : function() {
			ret.set(new_card);
		});
	};
	ret.set(card);
	ret.selectable = true;
	ret.on_click = card_clicked;
	return ret;
} // }}}

function reply(ret) { // {{{
	if (ret === null)
		return;
	var args = [];
	for (var i = 1; i < arguments.length; ++i)
		args.push(arguments[i]);
	var fmt = _(ret, true);
	alert(fmt.apply(fmt, args));
} // }}}

function select(c) { // {{{
	var selected = (selection[0] == c && selection[1] > 0 ? selection[1] : c == MOSQUITO && selection[2] ? 1 : c == JOKER && selection[3] ? 1 : 0);
	var card = hand[c][hand[c].length - 1 - selected];

	if (trade2 !== null) {
		switch (selection[1]) {
			case 0:
				selection[0] = c;
				selection[1] = 1;
				card.move([x_trade, y_trade1, 0]);
				card.div.type = 'selected';
				break;
			case 1:
				trade2 = c;
				selection[1] = 2;
				card.move([x_trade, y_trade2, 0]);
				card.div.type = 'selected';
				break;
			default:
				wrong(_('Can only trade two cards'));
				break;
		}
	}
	else if (c == MOSQUITO && !selection[2] && (selection[0] == ELEPHANT || selection[1] == 0)) {
		// Set mosquito.
		selection[2] = true;
		selection[0] = ELEPHANT;
		card.div.type = 'selected';
		card.move([x_selection, y_mosquito, -1]);
	}
	else if (c == MOSQUITO && selection[2] && selection[1] == 0) {
		// Move mosquito into normal selection.
		selection[0] = MOSQUITO;
		selection[1] = 2;
		selection[2] = false;
		card.div.type = 'selected';
		hand[c][hand[c].length - 1].move([x_selection, y_table, 0]);
		card.move([x_selection, y_table + 1, 1]);
	}
	else if (c == JOKER && !selection[3]) {
		// Set joker.
		selection[3] = true;
		card.div.type = 'selected';
		card.move([x_selection + x_joker, y_joker, -2]);
	}
	else if (c == selection[0] || (selection[1] == 0 && (c == ELEPHANT || !selection[2]))) {
		// Normal card.
		selection[0] = c;
		card.div.type = 'selected';
		card.move([x_selection, y_table + selection[1], selection[1]]);
		selection[1] += 1;
	}
	else {
		// Not allowed.
		wrong(_('You cannot play this card'));
	}
} // }}}

function deselect(c) { // {{{
	var selected = (selection[0] == c && selection[1] > 0 ? selection[1] : c == MOSQUITO && selection[2] ? 1 : c == JOKER && selection[3] ? 1 : 0);
	var card = hand[c][hand[c].length - selected];
	if (trade2 !== null) {
		selected = (selection[1] == 2 && selection[0] == trade2 ? 2 : 1);
		if (selection[1] == 2) {
			// If card 1 is clicked, swap cards.
			if (selection[0] != trade2 && c == selection[0]) {
				selection[0] = trade2;
				trade2 = c;
				hand[selection[0]][hand[selection[0]].length - 1].move([x_trade, y_trade1, 0]);
			}
			c = trade2;
		}
		card = hand[c][hand[c].length - (selected == 2 && selection[0] == trade2 ? 2 : 1)];
		selection[1] -= 1;
		if (selection[1] == 0 && !Private.actions.trade)
			trade2 = null;
	}
	else if (c == MOSQUITO && selection[2])
		selection[2] = false;
	else if (c == JOKER)
		selection[3] = false;
	else if (c == MOSQUITO && selection[1] == 2) {
		// There is only one left, move it into its own slot.
		selection[2] = true;
		selection[1] = 0;
		hand[c][hand[c].length - 1].move([x_selection, y_mosquito, -1]);
	}
	else
		selection[1] -= 1;
	card.div.type = 'hand';
	card.move([(c - Public.cardnames.length / 2) * 2.2 + 1, y_own + hand[c].length - (selected - 1), hand[c].length - (selected - 1)]);
} // }}}

function card_clicked(event) { // {{{
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
		select(c);
	}
	else if (event.target.type == 'selected') {
		// Move card back into hand.
		// Always use the card at the top of the stack, regardless of which was clicked.
		if (trade2 !== null && !Private.actions.trade) {
			// Deselect all cards regardless of what was clicked.
			deselect(trade2);
			deselect(selection[0]);
		}
		else
			deselect(c);
	}
	else if (event.target.type == 'active') {
		// Play cards, if allowed.
		var num = selection[1] + (selection[2] ? 1 : 0) + (selection[3] ? 1 : 0);
		var num_current = Public.current[1] + (Public.current[2] ? 1 : 0) + (Public.current[3] ? 1 : 0);
		if (Private === null || !(Private.actions.play || (Private.actions.trade && Public.players[my_num].partner[0] === null))) {
			wrong(_('You cannot play cards on the table at the moment'));
		}
		else if (Private.actions.trade) {
			if (selection[1] != 2)
				wrong(_('Trade needs exactly two cards'));
			else {
				game('trade', selection[0], trade2);
				// Clean up trading stuff.
				deselect(trade2);
				deselect(selection[0]);
				trade2 = null;
			}
		}
		else
			game('play', selection[0], selection[1], selection[2], selection[3]);
	}
	else if (event.target.type == 'help') {
		// Help, if allowed.
		game('help', selection[0], selection[1], selection[2], selection[3]);
	}
	else if (event.target.type == Public.players[my_num].partner[0]) {
		// Give cards to partner, or ask for help, if allowed.
		if (Private.actions.trade) {
			if (selection[1] != 2)
				wrong(_('trade needs exactly two cards'));
			else {
				game('trade', selection[0], trade2);
				// Clean up trading stuff.
				deselect(trade2);
				deselect(selection[0]);
				trade2 = null;
			}
		}
		else if (Private.actions.ask) {
			// Request help.
			var request = ['ask', selection[0], selection[1], selection[2], selection[3]];
			// Deselect all cards, regardless of result.
			if (selection[2])
				deselect(MOSQUITO);
			if (selection[3])
				deselect(JOKER);
			while (selection[1] > 0)
				deselect(selection[0]);
			game.apply(game, request);
		}
	}
} // }}}

function init() { // {{{
	ELEPHANT = 10;
	MOSQUITO = 11;
	JOKER = 12;
	/*
	var w = ['current', 'current_cards', 'remove', 'players'];
	for (var i = 0; i < w.length; ++i) {
		(function(attr) {
			watch(['Public', attr], function(value, old) { console.info('update', attr, value, old); });
		})(w[i]);
	}*/
} // }}}

function new_game() { // {{{
	remove = {};
	hand = [];
	pile = [];
	scores = [];
	for (var c = 0; c < Public.cardnames.length; ++c) {
		hand.push([]);
		scores.push([]);
	}
	current = [null, [], null, null];
	current_help = [null, [], null, null];
	nodes = null;
	selection = [0, 0, false, false];
	trade2 = null;

	active_empty = Card(null, 'active');
	active_empty.location = [2, 0, 0];
	active_empty.visible = true;

	background = new_div(30, 20, 600, 400);
	background.location = [0, 0, -100];
	background.div.style.background = 'url("webgame/img/background.svg")';

	// Create player nodes. {{{
	var num_others = Public.players.length - (my_num === null ? 0 : 1);
	nodes = [];
	others = [];
	for (var p = 0; p < Public.players.length; ++p)
		others.push([]);
	for (var p = 0; p < Public.players.length; ++p) {
		var node = new please.GraphNode();
		graph.add(node);
		nodes.push(node);
		var reduced = (my_num === null ? p : (p - my_num + Public.players.length) % Public.players.length);
		var dist = 30 / num_others;
		node.location = [reduced * dist - 15 - dist * .75, y_other, 0];
		var div = please.overlay.new_element();
		div.AddClass('playername');
		var divnode = new please.GraphNode();
		div.bind_to_node(divnode);
		divnode.div = div;
		//div.style.overflow = '';
		playernames.push(divnode);
		divnode.location = (p == my_num ? [15, -10, 100] : [4, 1.5, 100]);
		node.add(divnode);
	} // }}}
} // }}}

function end_game() { // {{{
	del_div(active_empty);

	// Remove overlays.
	while (playernames.length > 0) {
		var p = playernames.pop();
		please.overlay.remove_element(p.div);
		graph.remove(p);
	}

	// Remove cards in hand (including selected).
	for (var c = 0; c < hand.length; ++c) {
		while (hand[c].length > 0)
			del_div(hand[c].pop());
	}

	// Remove other players' cards.
	for (var p = 0; p < others.length; ++p) {
		// Cards in hand.
		while (others[p].length > 0)
			del_div(others[p].pop());
		// Score pile.
		while (scores[p].length > 0)
			del_div(scores[p].pop());
	}

	// Remove cards on table.
	while (current[1].length > 0)
		del_div(current[1].pop());

	// Remove help request.
	while (current_help[1].length > 0)
		del_div(current_help[1].pop());

	// Remove pile.
	while (pile.length > 0)
		del_div(pile.pop());
} // }}}

function ping() { // {{{
	if (did_ping)
		return;
	audio.ping();
	did_ping = true;
} // }}}

function get_card(c, type) { // {{{
	var card;
	if (c === null) {
		// Special case: use whatever card is available.
		c = undefined; // fallback.
		for (var k in remove) {
			if (k == '')
				continue;
			if (remove[k].length > 0) {
				c = k;
				break;
			}
		}
	}
	if (c !== undefined && remove[c] !== undefined && remove[c].length > 0) {
		card = remove[c].pop();
	}
	else if (remove[''] !== undefined && remove[''].length > 0) {
		card = remove[''].pop();
		card.set(c);
	}
	else {
		card = Card(c, type);
		//console.info('creating card of type', c, 'for', type);
	}
	card.div.type = type;
	return card;
} // }}}

function remove_card(card) { // {{{
	var c = (card.card === undefined ? '' : card.card);
	if (remove[c] === undefined)
		remove[c] = [];
	remove[c].push(card);
} // }}}

function update() { // {{{
	// Update state. {{{
	if (Public.ended) {
		set_state(_('The game has ended'));
		did_ping = false;
	}
	else if (Private.actions.trade) {
		if (trade2 === null)
			trade2 = 0;	// Value is irrelevant; non-null means two distinct cards can be selected.
		if (Public.players[my_num].partner[0] !== null)
			set_state(_('Please give two cards to $1')(Public.players[Public.players[my_num].partner[0]].name));
		else
			set_state(_('Please play two cards into your score pile'));
		ping();
	}
	else if (Private.actions.help) {
		set_state(_('$1 asks if you can complete their cards')(Public.players[Public.players[my_num].partner[0]].name));
		ping();
	}
	else if (Private.actions.ask) {
		set_state(_('It is your turn to play (you may ask $1 for help)')(Public.players[Public.players[my_num].partner[0]].name));
		ping();
	}
	else if (Private.actions.play) {
		set_state(_('It is your turn to play'));
		ping();
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
		did_ping = false;
	}
	else {
		var name = Public.players[Public.turn].name;
		if (name === null)
			set_state(_('Waiting for player to connect'));
		else
			set_state(_("It's $1's turn")(Public.players[Public.turn].name));
		did_ping = false;
	}
	// }}}
	// Update player names. {{{
	for (var p = 0; p < Public.players.length; ++p) {
		var partner = Public.players[p].partner;
		var name = (Public.players[p].name === null ? _('(Waiting for this player to connect)') : Public.players[p].name);
		var partnertext = (partner[0] === null ? '' : (partner[0] == my_num ? _(' (my partner) ') : _(' (partner of $1) ')(Public.players[partner[0]].name)));
		playernames[p].div.ClearAll().AddText(name + partnertext + ': ' + Public.players[p].score);
		if (Public.turn == p)
			playernames[p].div.AddClass('turn');
		else
			playernames[p].div.RemoveClass('turn');
		if (Public.current[4] == p)
			playernames[p].div.AddClass('owner');
		else
			playernames[p].div.RemoveClass('owner');
	}
	// }}}
	// Update cards in hand. (Remove) {{{
	if (Private !== null) {
		for (var c = 0; c < Public.cardnames.length; ++c) {
			while (hand[c].length > Private.hand[c]) {
				// Remove card.
				var lost = hand[c].pop();
				if ((selection[1] > 1 && trade2 == c) || (selection[0] == c && selection[1] > 0))
					selection[1] -= 1;
				if (c == MOSQUITO && selection[2])
					selection[2] = false;
				if (c == JOKER && selection[3])
					selection[3] = false;
				remove_card(lost);
			}
		}
	} // }}}
	// Update other players' cards (Remove) {{{
	if (nodes !== null) {
		for (var p = 0; p < Public.players.length; ++p) {
			if (p == my_num)
				continue;
			while (others[p].length > Public.players[p].cards) {
				var card = others[p].pop();
				var location = card.world_location;
				nodes[p].remove(card);
				graph.add(card);
				card.location = location;
				remove_card(card);
			}
		}
	}
	// }}}
	// Remove cards from pile. {{{
	while (Public.current_cards - Public.current[1] - Public.current[2] - Public.current[3] < pile.length) {
		// Remove card from Pile.
		remove_card(pile.pop());
	} // }}}
	// Remove cards from player scores. {{{
	for (var p = 0; p < Public.players.length; ++p) {
		while (Public.players[p].score_cards < scores[p].length)
			remove_card(scores[p].pop());
	} // }}}
	update_cards_remove(current, Public.current, remove);
	update_cards_remove(current_help, Public.help, remove);
	// Update cards in hand. (Add) {{{
	if (Private !== null) {
		for (var c = 0; c < Public.cardnames.length; ++c) {
			while (hand[c].length < Private.hand[c]) {
				var card = get_card(c, 'hand');
				var selected = (selection[0] == c ? selection[1] : c == MOSQUITO && selection[2] ? 1 : c == JOKER && selection[3] ? 1 : 0);
				hand[c].splice(hand[c].length - selected, 0, card);
				card.move([(c - Public.cardnames.length / 2) * 2.2 + 1, y_own + hand[c].length - selected, hand[c].length - selected]);
			}
		}
	}
	// }}}
	// Update other players' cards (Add) {{{
	if (nodes !== null) {
		for (var p = 0; p < Public.players.length; ++p) {
			if (p == my_num)
				continue;
			while (others[p].length < Public.players[p].cards) {
				var card = get_card(null, p);
				var location = card.world_location;
				nodes[p].add(card);
				others[p].push(card);
				var origin = nodes[p].world_location;
				for (var i = 0; i < 3; ++i)
					location[i] -= origin[i];
				card.location = location;
				card.move([others[p].length * .4, 0, others[p].length], undefined);
			}
		}
	}
	// }}}
	// Add cards to pile. {{{
	while (Public.current_cards - Public.current[1] - Public.current[2] - Public.current[3] > pile.length) {
		var card = get_card(null, 'pile');
		pile.push(card);
		var randx = (Math.random() - .5) * 4;
		var randy = (Math.random() - .5) * 4;
		card.move([x_pile + randx, y_pile + randy, pile.length]);
	} // }}}
	// Add cards to player scores. {{{
	for (var p = 0; p < Public.players.length; ++p) {
		while (Public.players[p].score_cards > scores[p].length) {
			var card = get_card(null, 'score');
			scores[p].push(card);
			var pos;
			if (p == my_num)
				pos = [0, y_own - y_score_offset, 0];
			else {
				var base = nodes[p].world_location;
				pos = [base[0], base[1] + y_score_offset, 0];
			}
			card.move(pos, undefined);
		}
	} // }}}
	update_cards_add(current, Public.current, active_empty, x_active, 'active', remove);
	update_cards_add(current_help, Public.help, null, x_help, 'help', remove);
	if (Public.remove) {
		for (var c in remove) {
			while (remove[c].length > 0) {
				//console.info('destroying card of type', c, ':', remove[c][remove[c].length - 1]);
				del_div(remove[c].pop());
			}
		}
	}
} // }}}

function update_cards_remove(local, remote, remove) { // {{{
	// remote = [card, num, mosquito, joker, player] (or without player for help)
	// local = [card, [Card, ...], MosquitoCard or null, JokerCard or null]
	if (remote === undefined)
		remote = [null, 0, false, false];
	while (local[1].length > remote[1]) {
		remove_card(local[1].pop())
	}
	if (local[1].length == 0)
		local[0] = null;
	for (var c = 2; c <= 3; ++c) {
		if (!remote[c] && local[c] !== null) {
			remove_card(local[c]);
			local[c] = null;
		}
	}
} // }}}

function update_cards_add(local, remote, empty, x, type, remove) { // {{{
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
			var card = get_card(local[0], type);
			local[1].push(card);
			card.move([x, y_table + local[1].length - 1, local[1].length]);
		}
	}
	for (var c = 2; c <= 3; ++c) {
		if (remote[c] && local[c] === null) {
			// Add mosquito or joker.
			var info = [[MOSQUITO, 0, y_mosquito, -1], [JOKER, x_joker, y_joker, -2]][c - 2];
			local[c] = get_card(info[0], type);
			local[c].move([x + info[1], info[2], info[3]]);
		}
	}
} // }}}

function received(card1, card2) { // {{{
	if (selection[2])
		deselect(MOSQUITO);
	if (selection[3])
		deselect(JOKER);
	while (selection[1] > 0)
		deselect(selection[0]);
	trade2 = 0;
	select(card1);
	select(card2);
} // }}}

function end(score) { // {{{
	show_chat(null, _('Game ended:\n') + score);
} // }}}

function wrong(message) { // {{{
	console.info(message);
	alert(message);
} // }}}

function score_round(scores) { // {{{
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
