"use strict";

game.viewport = [-7, -5, 6, 8];

game.symbols = ['H', 'He', 'Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne', 'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar', 'K', 'Ca'];

game.make_isotope = function(encoded) {
	var dec = encoded.match(/(\d+),(\d+)-(.*)$/);
	var M = dec[1];
	var Z = dec[2];
	var X = dec[3];
	return '<span style="position: relative; top: -1ex; margin-left: 3ex"><span style="position: absolute; top: 2ex; right: 0px">' + Z + '</span>' + '<span style="position: absolute; top: 0px; right: 0px">' + M + '</span></span>' + X;
};

game.init = function() {
	game.popup_base = document.body.AddElement('div', 'popup_base');
	game.popup_content = game.popup_base.AddElement('div', 'popup_content');
	game.popup_base.AddEvent('click', function() {
		game.hide_popup();
	});
	game.popup_base.AddEvent('wheel', function(event) {
		event.stopPropagation();
	});
	game.popup_content.AddEvent('click', function(event) { event.stopPropagation(); });
	game.enter_room();
};
game.end_game = function() { game.hide_popup(); };

game.end = function(story) {
	game.popup(story + "<div><button onclick='" + 'server("webgame", "leave")' + "' type='button'>Thanks!</button></div>");
};

game.popup = function(html) {
	game.popup_content.innerHTML = html;
	game.popup_base.style.display = 'block';
};

game.hide_popup = function() {
	game.popup_base.style.display = '';
};

game.activate = function(n) {
	server('action', n, game.inputs, game.outputs);
	game.hide_popup();
};

game.inputselect = function(select, n) {
	game.inputs[n] = select.selectedIndex;
};

game.make_input = function(n) {
	if (Public.inventory.length == 1) {
		game.inputs[n] = 0;
		return game.make_isotope(Public.inventory[0]);
	}
	var ret = '<select onchange="game.inputselect(this, ' + n + ')">';
	for (var i = 0; i < Public.inventory.length; ++i) {
		var isotope = Public.inventory[i];
		if (isotope === null)
			continue;
		ret += '<option>' + game.make_isotope(isotope) + '</option>';
	}
	ret += '</select>';
	return ret;
};

game.update_output = function(n) {
	game.outputs[n] = game.raw_outputs[n][0] + ',' + game.raw_outputs[n][1] + '-' + game.raw_outputs[n][2];
};

game.change_m = function(obj, n) {
	game.raw_outputs[n][0] = Number(obj.value);
	game.update_output(n);
};

game.change_z = function(obj, n) {
	game.raw_outputs[n][1] = Number(obj.value);
	game.update_output(n);
};

game.outputx = function(obj, n) {
	game.raw_outputs[n][2] = obj.value;
	game.update_output(n);
};

game.make_output = function(n) {
	var M = '<input class="output mass" type="number" min="-1" max="250" value="-1" onchange="game.change_m(this, ' + n + ')"/>';
	var Z = '<input class="output" type="number" min="-1" max="250" value="-1" onchange="game.change_z(this, ' + n + ')"/>';
	var X = '<input class="output" type="text" onchange="game.outputx(this, ' + n + ')"/>';
	return '<span style="position: relative; top: -2ex; margin-left: 5em"><span style="position: absolute; top: 0px; right: 0px">' + M + '<span style="position: absolute; top: 4ex; right: 0px">' + Z + '</span></span></span>' + X;
};

game.inputs = [];
game.outputs = [];
game.raw_outputs = [];

game.enter_room = function() {
	game.popup(Public.intro + "<div><button onclick='game.hide_popup()' type='button'>" + _("I'm ready!") + "</button></div>");
};

game.submit = function(n) {
	game.activate(n);
	return false;
};

game.ui = {
	'actions.*': {
		location: function() { return [-3 * (Public.actions.length - 1) / 2, 5, 0]; },
		offset: [3, 0, 0],
		size: [2, 5, 200, 500],
		image: function(src) { return game.image[src.name](); },
		click: function(src, n) {
			var text = src.text;
			game.inputs.length = src.input.length;
			game.outputs.length = src.output.length;
			game.raw_outputs.length = src.output.length;
			for (var i = 0; i < src.output.length; ++i) {
				game.raw_outputs[i] = [-1, -1, 0];
				game.update_output(i);
			}
			var count_inputs = 0;
			for (var i = 0; i < src.input.length; ++i) {
				if (src.input[i] === null)
					count_inputs += 1;
			}
			var count_inventory = 0;
			for (var i = 0; i < Public.inventory.length; ++i) {
				if (Public.inventory[i] !== null)
					count_inventory += 1;
			}
			if (count_inventory >= count_inputs) {
				if (src.input.length > 0) {
					text += '<div><b>' + _('Input') + ':</b><ul>';
					for (var i = 0; i < src.input.length; ++i) {
						text += '<li>';
						if (src.input[i] === null)
							text += game.make_input(i);
						else
							text += game.make_isotope(src.input[i]);
						text += '</li>';
					}
					text += '</div>';
				}
				if (src.output.length > 0) {
					text += '<div><b>' + _('Output') + ':</b><form onsubmit="game.submit(' + n + ')"><ul>';
					for (var i = 0; i < src.output.length; ++i) {
						if (src.output[i] === null) {
							text += '<li style="margin-bottom: 3em;">';
							text += game.make_output(i);
						}
						else {
							text += '<li>';
							text += game.make_isotope(src.output[i]);
						}
						text += '</li>';
					}
					text += '</form></div>';
				}
				text += '<div class="activate"><button type="button" onclick="game.activate(' + n + ')">' + _("Let's do it") + '</button></div>';
			}
			else {
				text += '<div>You do not carry enough isotopes to make this deal. Please get the isotopes I need and then come back to me.</div><div><button type="button" onclick="game.hide_popup()">Understood</button></div>'
			}
			game.popup(text);
			var mass = document.getElementsByClassName('mass')[0];
			if (mass !== undefined)
				mass.focus();
		}
	},
	gateimg: {
		location: [-5, 0, 0],
		size: [3, 4, 150, 200],
		image: game.image.gate
	},
	gate: {
		location: [-5, -3, 0],
		html: function(src) {
			var ret = _('To open this gate, you need:') + '<br/><ul>'
			for (var i = 0; i < src.length; ++i) {
				ret += '<li>' + src[i][1] + (src[i][1] == 1 ? _(' isotope of ') : _(' isotopes of ')) + game.make_isotope(src[i][0]) + '</li>';
			}
			return ret;
		}
	},
	'intro': {
		location: [5, 0, 0],
		size: [2, 2.5, 200, 250],
		image: game.image.teacher,
		click: function() { game.popup(Public.theory + "<div><button onclick='game.hide_popup()' type='button'>" + _('Thanks') + "</button></div>"); }
	},
	//'players.*.theory': {
	//},
	'inventory.*': {
		location: function(src, slot) { return [-1.5 * (Public.inventory.length - 1) / 2, -2, 0]; },
		offset: [1.5, 0, 0],
		html: function(src, slot) { return src ? game.make_isotope(src) : _('Empty'); },
		style: {border: 'solid black 2px', borderRadius: '1ex', padding: '1em'},
		click: function(src, slot) {
			if (src !== null)
				server('gate', slot);
		}
	}
};
