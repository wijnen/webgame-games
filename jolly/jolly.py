# Jolly and Roger
# vim: set filetype=python fileencoding=utf-8 :

name = 'Jolly en Roger'

# Public:
# round: which round is this
# turn: which player divides the cards this turn
# cards: [[group 1], [group 2]]; after choosing, group 1 is for player 1 to use.
# ship: [{value: int, crew: [[player 0], [player 1]], owner:<0|1|None>} for each ship]
# players[p].pile: int
# active: [''|'cash'|int, ...]

# crew cards are [color:int, value:int, wildcard:bool]

import random

num_players = 2

all_cards = [
	[0, 4, 3, 2, 2, 2], # Green (13)
	[0, 4, 3, 2, 2, 1], # Yellow (12)
	[0, 4, 2, 2, 1, 1], # Blue (10)
	[0, 3, 2, 1, 1, 1]  # Red (8)
]

class Game:
	def run(self):
		self.Public.round = 0
		self.Public.turn = 0
		self.Public.selected = -1
		self.Public.cards = [[], [], [], []]
		self.Public.ship = [{'value': x, 'crew': [[], []], 'owner': None} for x in (3, 5, 7, 9)]
		for p in self.Public.players:
			p.pile = 0
		self.deck = []
		self.score = [0, 0]
		with transaction:
			for color, nums in enumerate(all_cards):
				for i, n in enumerate(nums):
					self.deck.extend([[color, i] for k in range(n)])
			random.shuffle(self.deck)
			self.deck[-(len(self.deck) % 5):] = []
			self.Public.deck = len(self.deck)
		while len(self.deck) >= 5:
			yield from self.turn()
			self.Public.turn = 1 - self.Public.turn
		# Game has ended. Score ships.
		for ship in self.Public.ship:
			if ship['owner'] is not None:
				self.score[ship['owner']] += ship['value']
		return self.score

	def turn(self):
		p = self.Public.turn
		o = 1 - p
		# Deal cards. {{{
		with transaction.deal:
			self.Public.cards = [self.deck[:5], [], [], []]
			self.deck[:5] = []
			self.Public.deck = len(self.deck)
		# }}}
		# Divide in groups. {{{
		self.Public.state = 'divide'
		while True:
			cmd = (yield {('move', 'ii'): p, ('done', ''): p})
			if cmd['command'] == 'done':
				break
			side, idx = cmd['args']
			if not 0 <= side < 2:
				self.reply('invalid side')
				continue
			if not 0 <= idx < len(self.Public.cards[side]):
				self.reply('invalid card index')
				continue
			# Move card to the end of the group, to make animation look good.
			card = self.Public.cards[side][idx]
			while idx != len(self.Public.cards[side]) - 1:
				with transaction.swap:
					self.Public.cards[side][idx] = self.Public.cards[side][idx + 1]
					self.Public.cards[side][idx + 1] = card
				idx += 1
			with transaction.move:
				self.Public.cards[side].pop()
				self.Public.cards[1 - side].append(card)
		# }}}
		# Choose a group. {{{
		self.Public.state = 'choose'
		while True:
			choice = (yield {('choose', 'i'): o})['args'][0]
			if not 0 <= choice < 2:
				self.reply(_('invalid side chosen: $1'), choice)
				continue
			if choice == 1:
				# Move in steps, to make animation look good.
				self.move_cards(0, 2)
				self.move_cards(1, 0)
				self.move_cards(2, 3)
				self.move_cards(3, 1)
			break
		# }}}
		# Place cards. {{{
		self.Public.state = o
		yield from self.play(o)
		self.move_cards(1, 0)
		self.Public.state = p
		yield from self.play(p)
		# }}}

	def move_cards(self, src, dst):
		'''Move cards from src to dst.'''
		while len(self.Public.cards[src]) > 0:
			with transaction:
				self.Public.cards[dst].append(self.Public.cards[src].pop())

	def play(self, player):
		self.Public.active = ['' for x in range(len(self.Public.cards[0]))]
		while True:
			cmds = {('select', 'i'): player, ('cash', ''): player, ('crew', 'i'): player, ('reset', ''): player}
			if not any(x == '' for x in self.Public.active):
				cmds[('done', '')] = player
			cmd = (yield cmds)
			if cmd['command'] == 'done':
				break
			if cmd['command'] == 'reset':
				self.Public.active = ['' for x in range(len(self.Public.cards[0]))]
				for target in range(len(self.Public.ship)):
					self.compute_ship(target, player)
				continue
			if cmd['command'] == 'select':
				card = cmd['args'][0]
				if not 0 <= card < len(self.Public.active):
					self.reply(_('attempt to select invalid card $1'), card)
					continue
				if self.Public.active[card] != '':
					continue
				else:
					self.Public.selected = card
				continue
			if not 0 <= self.Public.selected < len(self.Public.active):
				self.reply(_('A selection is needed for this action'))
				continue
			if cmd['command'] == 'cash':
				if self.Public.ship[self.Public.cards[0][self.Public.selected][0]].owner != player:
					self.reply(_('You can only cash cards for ships that you own'))
					continue
				with transaction.cash(self.Public.selected):
					self.Public.active[self.Public.selected] = 'cash'
					self.Public.selected = -1
			elif cmd['command'] == 'crew':
				target = cmd['args'][0]
				if not 0 <= target < len(self.Public.ship):
					self.reply(_('attempt to crew invalid ship $1'), target)
					continue
				with transaction.crew(self.Public.selected):
					self.Public.active[self.Public.selected] = target
					self.compute_ship(target, player)
					self.Public.selected = -1
			else:
				raise AssertionError('Unreachable code')
		# Finalize played cards.
		cards = self.Public.cards[0]
		while len(self.Public.cards[0]) > 0:
			with transaction.finalize:
				action = self.Public.active.pop()
				card = self.Public.cards[0].pop()
				if action == 'cash':
					self.score[player] += card[1]
					self.Public.players[player].pile += 1
				else:
					ship = self.Public.ship[action]
					ship.crew[player].append((card[0], card[1]))

	def compute_ship(self, ship, player):
		crew = [sum(1 if card[0] != ship else card[1] for card in group) for group in self.Public.ship[ship].crew]
		for n, a in enumerate(self.Public.active):
			if isinstance(a, str) or a != ship:
				continue
			card = self.Public.cards[0][n]
			crew[player] += card[1] if card[0] == ship else 1
		self.Public.ship[ship].owner = None if crew[0] == crew[1] else 0 if crew[0] > crew[1] else 1
