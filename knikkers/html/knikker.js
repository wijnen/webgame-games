knikkers.lastcolor = 'black';

if (webgame.args.paths == 'round') {
	// Round paths.
	knikkers.curve = function(n) {
		var r = 24 / Math.PI;
		var angle = Math.PI / 2 * n / 12;
		return [-2 - r + r * Math.cos(angle), -2 - r + r * Math.sin(angle)];
	};
	knikkers.mid = function(n) {
		var angle = Math.PI * (n / 12);
		var r = 12 / Math.PI;
		return [Math.cos(angle) * r, Math.sin(angle) * r];
	};
}
else {
	// Segmented paths.
	knikkers.r = 4 + 4 / Math.sqrt(2);
	knikkers.curve = function(n) {
		if (n < 4)
			return [-2, -knikkers.r + n - 2];
		if (n >= 8)
			return [-knikkers.r - 2 + 4 - (n - 8), -2];
		return [-2 - (n - 4) / Math.sqrt(2), -knikkers.r + 4 + (n - 4) / Math.sqrt(2) - 2];
	}
	knikkers.mid = function(n) {
		if (n < 4)
			return [-2 + knikkers.r - n / Math.sqrt(2), -knikkers.r - 2 + n / Math.sqrt(2)];
		if (n >= 8)
			return [-2 - (n - 8) / Math.sqrt(2), -6 - (n - 8) / Math.sqrt(2)];
		return [2 - (n - 4), -6];
	}
}

knikkers.new_game = function() {
	knikkers.position = [];
	knikkers.curve_delta = [];
	knikkers.mid_delta = [];
	if (Public.outpos == 64) {
		webgame.viewport = [-18, -13, 19, 13];
		knikkers.card_base = [[-16, -5], [-16, 8], [12, 8], [12, -5]];
		knikkers.s2a = [0, 1, 2, 3];
		knikkers.s2o = [0, 0, 0, 0];
	}
	else {
		webgame.viewport = [-15, -22, 15, 22];
		knikkers.card_base = [[-14, -13], [-14, 16], [-2, 16], [12, 16], [12, -13], [-2, -13]];
		knikkers.s2a = [0, 1, 2, 2, 3, 0];
		knikkers.s2o = [-1, -1, 0, 1, 1, 0];
	}
	for (var i = 0; i < 2; ++i) {
		knikkers.curve_delta.push(knikkers.curve(12)[i] - knikkers.curve(0)[i]);
		knikkers.mid_delta.push(knikkers.mid(12)[i] - knikkers.mid(0)[i]);
	}
	console.assert(knikkers.mid_delta[1] < 1e-10);
	for (var pos = 0; pos < 100 + Public.outpos; ++pos) {
		var side;
		var target;
		if (pos < 100) {
			side = Math.floor(pos / 10);
			if (side * 16 >= Public.outpos) {
				knikkers.position.push(null);
				continue;
			}
			var n = pos % 10;
			if (n < 5) {
				if (Public.outpos == 64 || (side != 2 && side != 5))
					target = [-5 - n, -2 - knikkers.curve_delta[1]];
				else
					target = [-1 + n, -2 - knikkers.curve_delta[1]];
			}
			else {
				if (Public.outpos == 64 || (side != 2 && side != 5))
					target = [0, -2 - knikkers.curve_delta[1] + (n - 5) + 1];
				else
					target = [-knikkers.mid_delta[0] / 2 + 2, -2 - knikkers.curve_delta[1] + 1 + (n - 5)];
			}
		}
		else {
			side = Math.floor((pos - 100) / 16);
			var n = (pos - 100) % 16;
			if (n < 12) {
				if (Public.outpos == 64 || (side != 2 && side != 5)) {
					var c0 = knikkers.curve(0);
					var c = knikkers.curve(n);
					target = [-2 + c[0] - c0[0], -2 - knikkers.curve_delta[1] + c[1] - c0[1]];
				}
				else {
					var m0 = knikkers.mid(0);
					var m = knikkers.mid(n);
					target = [-knikkers.mid_delta[0] / 2 + m[0] - m0[0], -2 - knikkers.curve_delta[1] + m[1] - m0[1]];
				}
			}
			else {
				if (Public.outpos == 64 || (side != 2 && side != 5))
					target = [-2 + knikkers.curve_delta[0], -2 + (n - 12)];
				else
					target = [knikkers.mid_delta[0] / 2 - (n - 12), -2 - knikkers.curve_delta[1]];
			}
		}
		var angle = knikkers.s2a[side] * -Math.PI / 2;
		//console.info('pos', pos, 'target', target, 'side', side, 'angle', angle, 'offset', knikkers.s2o[side]);
		knikkers.position.push([knikkers.s2o[side] * (-knikkers.mid_delta[0] / 2 + 2) + target[0] * Math.cos(angle) - target[1] * Math.sin(angle), target[0] * Math.sin(angle) + target[1] * Math.cos(angle)]);
	}
	// Extra position that is used for swapping marbles.
	knikkers.position.push([0, 0]);
};

knikkers.viewport = [-18, -20, 19, 20];
knikkers.card_base = [[-16, -5], [-16, 8], [12, 8], [12, -5], [0, -5], [0, 5]];

knikkers.playercolor = function(num) {
	if (Public.players.length == 4)
		return ['red', 'blue', 'green', 'yellow'][num];
	else
		return ['red', 'blue', 'green'][num % 3];
};

knikkers.click = function(pos, marble) {
	if (marble && Private !== null && Private.actions.marble !== undefined)
		game('marble', pos);
	else if (Private !== null && Private.actions.target !== undefined)
		game('target', pos);
};

knikkers.card_text = function(card) {
	return ['♠', '♥', '♣', '♦'][card.suit % 4] + ' ' + [_('Koning'), _('Aas'), _('2'), _('3'), _('4'), _('5'), _('6'), _('7'), _('8'), _('9'), _('10'), _('Boer'), _('Vrouw')][card.type];
};

knikkers.keydown = function(event) {
	if (event.keyCode == 27) {
		var num = 0;
		for (var p = 0; p < Public.players.length; ++p) {
			if (Public.players[p].name !== null)
				num += 1;
		}
		if (num == 1)
			game('webgame', 'swap');
		else
			game('webgame', 'swap', (my_num + Public.players.length / 2) % Public.players.length);
	}
};

knikkers.end = function(winner) {
	var p1 = Public.players[winner[0]].name;
	var p2 = Public.players[winner[1]].name;
	var msg;
	if (p1 === null && p2 === null)
		msg = _('Spelers $1 en $2 hebben gewonnen!')(winner[0], winner[1]);
	else if (p1 === null)
		msg = _('Speler $1 en $2 hebben gewonnen!')(winner[0], p2);
	else if (p2 === null)
		msg = _('$1 en speler $2 hebben gewonnen!')(p1, winner[1]);
	else
		msg = _('$1 en $2 hebben gewonnen!')(p1, p2);
	show_chat(null, msg);
	set_state(msg);
};

knikkers.update = function() {
	if (Public.ended)
		return;
	if (Public.turn != my_num) {
		var p = Public.players[Public.turn].name;
		if (p === null)
			set_state(_('Wacht op speler $1')(Public.turn));
		else
			set_state(_('Wacht op $1')(p));
	}
	else if (Private.card === null)
		set_state(_('Kies een kaart om te spelen'));
	else if (Private.pending === null) {
		if (Private.marble === null)
			set_state(_('Kies een knikker'));
		else if (Private.marble !== null) {
			if (Private.actions.marble !== undefined)
				set_state(_('Kies een knikker om te ruilen'));
			else
				set_state(_('Kies waar je heen wilt'));
		}
	}
	else if (Private.marble === null)
		set_state(_('Kies de tweede knikker om te bewegen'));
	else
		set_state(_('Kies waar de tweede knikker heen moet'));
};

knikkers.ui = {
	'rules': {
		location: [knikkers.viewport[2] + 10, knikkers.viewport[3] - 15, 0],
		size: [20, 30, 400, 600],
		init: function() {
			var rules = [_('4: 4 achteruit'), _('7: 7 vakjes vooruit in 1 of 2 stappen'), _('boer: 11 vooruit (selecteer eigen knikker eerst) of ruilen (selecteer andere knikker eerst)'), _('vrouw: 12 vakjes vooruit'), _('koning: opzetten'), _('Aas: opzetten of 1 vooruit'), _('Over witte en gekleurde vakjes mag niet gesprongen worden (dus ook in huis)'), _('Op de eigen startplek mag een knikker niet geslagen of geruild worden'), _('Het spel kan eindigen door het eerste deel van een 7; in alle andere gevallen moet het tweede deel wel gedaan worden')];
			var l = this.div.AddElement('ul');
			for (var r = 0; r < rules.length; ++r)
				l.AddElement('li').AddText(rules[r]);
		}
	},
	'foo': {
		location: [(knikkers.viewport[0] + knikkers.viewport[2]) / 2, (knikkers.viewport[1] + knikkers.viewport[3]) / 2, -1],
		size: [knikkers.viewport[2] - knikkers.viewport[0], knikkers.viewport[3] - knikkers.viewport[1], 1, 1],
		style: {'background': '#fd9'}
	},
	'players.*.startpos.*': {
		location: function(src, player, n) { var p = player * 10 + n; return [knikkers.position[p][0], knikkers.position[p][1], .01]; },
		size: [1, 1, 32, 32],
		image: function(src, player, n) {
			if (Public.outpos > 64)
				player %= 3;
			return 'empty' + player + '.png';
		},
		style: function(src, player, n) {
			if (Public.last[player * 10 + n])
				return {'backgroundColor': knikkers.lastcolor, 'border-radius': '1ex'};
			return {'backgroundColor': ''};
		}
	},
	'players.*.homepos.*': {
		location: function(src, player, n) { var p = player * 10 + 5 + n; return [knikkers.position[p][0], knikkers.position[p][1], .01]; },
		size: [1, 1, 32, 32],
		image: function(src, player, n) {
			if (Public.outpos > 64)
				player %= 3;
			return 'empty' + player + '.png';
		},
		click: function(src, player, n) { knikkers.click(player * 10 + 5 + n, false); },
		style: function(src, player, n) {
			if (Public.last[player * 10 + 5 + n])
				return {'backgroundColor': knikkers.lastcolor, 'border-radius': '1ex'};
			return {'backgroundColor': ''};
		}
	},
	'outpos.*' : {
		location: function(src, n) { var p = 100 + n; return [knikkers.position[p][0], knikkers.position[p][1], .01]; },
		size: [1, 1, 32, 32],
		image: function(src, n) {
			var phase = n % 16;
			var team = Math.floor(n / 16);
			if (Public.outpos > 64)
				team %= 3;
			return 'empty' + (phase < 12 ? phase == 0 ? team : '' : '-white') + '.png';
		},
		click: function(src, n) { knikkers.click(100 + n, false); },
		style: function(src, n) {
			if (Public.last[100 + n])
				return {'backgroundColor': knikkers.lastcolor, 'border-radius': '1ex'};
			return {'backgroundColor': ''};
		}
	},
	'players.*.team': {
		location: function(src, player) {
			return [knikkers.card_base[player][0] + 2, knikkers.card_base[player][1] + 2, 0]
		},
		size: [5, .75, 150, 20],
		style: function(src, player) {
			return {
				'background': knikkers.playercolor(src),
				'text-align': 'center',
				'border': Public.ended || Public.turn != player ? '' : 'solid black 3px',
				'border-radius': '2ex'
			};
		},
		text: function(src, player) { return Public.players[player].name !== null ? Public.players[player].name : ''; }
	},
	'players.*.cards.*': {
		location: function(src, player, n) {
			return [knikkers.card_base[player][0] + n, knikkers.card_base[player][1], n * .01];
		},
		size: [2, 3, 64, 96],
		'class': 'card back',
		visible: function(src, player, n) { return player != my_num; },
		tag: function(src, player, n) { return player != my_num ? 'card' : 'hidden'; }
	},
	'team.*.marble.*': {
		location: function(src, team, n) {
			var pos = (Private !== null && Private.pending !== null && team == Private.pending[0][0] && n == Private.pending[0][1] ? Private.pending[1] : src);
			var p = [knikkers.position[pos][0], knikkers.position[pos][1], Private === null || Private.pending === null ? .02 : .03];
			return p;
		},
		size: [1, 1, 32, 32],
		image: function(src, team) { return 'marble' + team + '.png'; },
		click: function(src, team, n) {
			var pos = (Private !== null && Private.pending !== null && team == Private.pending[0][0] && n == Private.pending[0][1] ? Private.pending[1] : src);
			knikkers.click(pos, true);
		},
		style: function(src, team, n) {
			var pos = (Private !== null && Private.pending !== null && team == Private.pending[0][0] && n == Private.pending[0][1] ? Private.pending[1] : src);
			if (Private !== null && pos == Private.marble)
				return {'backgroundColor': 'black', 'border-radius': '1ex'};
			return {'backgroundColor': ''};
		}
	},
	'stack.*': {
		location: [0, 0, .01],
		offset: [0, 0, .01],
		'class': 'card front',
		size: [2, 3, 64, 96],
		text: knikkers.card_text,
		style: function(src, n) { return {color: (src.suit & 1) ? 'red' : 'black'}; }
	},
	'Private.hand.*': {
		location: function(src, n) {
			if (n < 2)
				return [knikkers.card_base[my_num][0] + 2.5 * n, knikkers.card_base[my_num][1], 0.1];
			return [knikkers.card_base[my_num][0] + 2.5 * (n - 2), knikkers.card_base[my_num][1] - 3.5, 0.1];
		},
		'class': 'card front',
		'style': function(src, n) {
			var ret = {}
			if (src.suit & 1)
				ret.color = 'red';
			else
				ret.color = 'black';
			if (Private !== null && Private.card == n)
				ret.background = '#ffb';
			else
				ret.background = '';
			return ret;
		},
		size: [2, 3, 64, 96],
		text: knikkers.card_text,
		click: function(src, n) { if (Private !== null && Private.actions.card !== undefined) game('card', n); }
	}
};
