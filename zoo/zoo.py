# Zoo: Computer version of "Frank's Zoo", a cool card game.
# Rules are not included here. They may be available online.
# If you buy the card game, you also get the rules, of course.

import random

name = "Frank's Zoo"
num_players = tuple(range(3, 8))
#num_demo_players = (3, 7)

cardnames = [ 'sardines', 'perch', 'seal', 'crocodile', 'polar bear', 'whale', 'mouse', 'hedgehog', 'fox', 'lion', 'elephant', 'mosquito', 'joker' ]
cards = [ # {{{
	{'under': ['perch', 'seal', 'crocodile', 'whale']},
	{'under': ['polar bear', 'seal', 'crocodile', 'whale']},
	{'under': ['polar bear', 'whale']},
	{'under': ['elephant']},
	{'under': ['elephant', 'whale']},
	{'under': []},
	{'under': ['fox', 'seal', 'polar bear', 'crocodile', 'hedgehog', 'lion']},
	{'under': ['fox']},
	{'under': ['polar bear', 'elephant', 'lion', 'crocodile']},
	{'under': ['elephant']},
	{'under': ['mouse']},
	{'under': ['mouse', 'sardines', 'hedgehog']},
	{'under': []}
	]
HEDGEHOG = cardnames.index('hedgehog')
LION = cardnames.index('lion')
ELEPHANT = cardnames.index('elephant')
MOSQUITO = cardnames.index('mosquito')
JOKER = cardnames.index('joker')

for c, card in enumerate(cardnames):
	# Add number of cards.
	cards[c]['number'] = 1 if c == JOKER else 4 if c == MOSQUITO else 5
	# Convert names into numbers.
	for u, under in enumerate(cards[c]['under']):
		cards[c]['under'][u] = cardnames.index(under)
# }}}

class Game: # {{{
	def init(self): # {{{
		# Initialize shared data.
		self.Public.cards = cards
		self.Public.cardnames = cardnames
		self.Public.pile = []
		self.Public.current_cards = 0
		self.Public.current = {'card': None, 'num': 0, 'mosquito': False, 'joker': False, 'player': None}
		# self.Public.help = undefined.
		self.Public.remove = True	# Remove cards when they disappear. This is a flag for making animated cards possible.
		for p, player in enumerate(self.players):
			self.Private[p].hand = [0] * len(cardnames)
			self.Private[p].pile = []
			self.Public.players[p].score = 0
			self.Public.players[p].score_cards = 0
			self.Public.players[p].partner = (None, None)
			self.Public.players[p].cards = 0
			self.Public.players[p].done = None
			self.Public.players[p].blocked = False
		self.Public.round = 0
		self.Public.turn = random.randrange(len(self.players))
	# }}}

	def run(self): # {{{
		'''Run an entire game.'''
		self.init()
		# Run until the game ends.
		while True:
			if not (yield from self.round()):
				break
			yield 1
			self.Public.round += 1
		return '\n'.join('%s: %d' % (player.name, player.score) for player in self.Public.players)
	# }}}

	def check_valid(self, args, p, player): # {{{
		'''Check if arguments are a valid play.
		Only basic validity is checked, not if it is valid for the current game state.
		returns card, num, mosquito, joker, extra, public_extra or None, None, None, None, None, None.'''
		err = (None,) * 6
		if len(args) != 4:
			self.reply(_('invalid argument(s): $1'), repr(args))
			return err
		card, num, mosquito, joker = args

		# Check argument type validity.
		if not all(isinstance(c, t) for c, t in zip(args, (int, int, bool, bool))) or not 0 <= card < len(cardnames) - 1:
			self.reply(_('invalid cards'))
			return err

		if mosquito and self.Private[p].hand[MOSQUITO] < 1:
			self.reply(_('You can only play a mosquito if you have one'))
			return err

		if joker and self.Private[p].hand[JOKER] < 1:
			self.reply(_('You can only play a joker if you have one'))
			return err

		if num < 0:
			self.reply(_('You cannot play a negative number of cards'))
			return err

		if self.Private[p].hand[card] < num:
			self.reply(_('You cannot play more cards than you have'))
			return err

		# Turn lone extra mosquito into regular mosquito.
		if num == 0 and mosquito:
			card = MOSQUITO
			num = 1
			mosquito = False

		# Turn lone mosquito back into extra if elephants are needed.
		if num == 1 and card == MOSQUITO and self.Public.current.num > 0 and self.Public.current.card != MOSQUITO and MOSQUITO not in cards[self.Public.current.card]['under']:
			card = ELEPHANT
			num = 0
			mosquito = True

		if mosquito and card != ELEPHANT:
			self.reply(_('You can only add a mosquito to elephants'))
			return err

		# Refuse cards that cannot be useful.
		if (num > 0 or mosquito) and self.Public.current.num > 0 and card != self.Public.current.card and card not in cards[self.Public.current.card]['under']:
			self.reply(_('This card cannot be played on the current cards on the table'))
			return err

		# Everything is fine.
		extra = (1 if mosquito else 0) + (1 if joker else 0)
		public_extra = (1 if self.Public.current.mosquito else 0) + (1 if self.Public.current.joker else 0)
		return card, num, mosquito, joker, extra, public_extra
	# }}}

	def mkpilepos(self):
		return [(random.random() - .5) * 2 for _ in range(2)]

	def round(self): # {{{
		'''Run one round of the game.'''
		# Deal the cards. {{{
		deck = []
		for c, card in enumerate(cardnames):
			deck.extend([c] * cards[c]['number'])
		self.Public.pile = []
		random.shuffle(deck)
		for p, player in enumerate(self.players):
			self.Public.players[p].done = None
			self.Public.players[p].cards = 0
			for c, card in enumerate(cardnames):
				self.Private[p].hand[c] = 0
			self.Private[p].pile = []
			self.Public.players[p].blocked = False
			self.Public.players[p].score_cards = 0
		p = 0
		while len(deck) > 0:
			card = deck.pop()
			self.Private[p].hand[card] += 1
			self.Public.players[p].cards += 1
			p = (p + 1) % len(self.players)
		# }}}

		# Set up game settings.
		self.Public.current = {'card': None, 'num': 0, 'mosquito': False, 'joker': False, 'player': None}
		self.Public.current_cards = 0
		active = len(self.players)

		# Possibly trade cards with team mates.
		yield from self.trade()

		# Play cards until the round ends. {{{
		while True:
			p = self.Public.turn
			player = self.players[p]
			options = {'play': p}
			partner = self.Public.players[p].partner
			if partner[1] is False and self.Public.current.num > 0 and self.Public.players[partner[0]].cards > 0:
				options['ask'] = p
			cmd = (yield options)
			card, num, mosquito, joker, extra, public_extra = self.check_valid(cmd['args'], p, player)
			if card is None:
				continue
			# Check that this is a valid play.
			if cmd['command'] == 'ask':
				if self.Public.current.num == 0:
					self.reply(_('You cannot request help on the first turn'))
					continue
				if num + extra == 0:
					self.reply(_('You cannot request help without offering a card'))
					continue
				if num > 0 or mosquito:
					if card == self.Public.current.card:
						if num + extra >= self.Public.current.num + public_extra + 1:
							self.reply(_('You can only ask help if you need cards'))
							continue
					else:
						if num + extra >= self.Public.current.num + public_extra:
							self.reply(_('You can only ask help if you need cards'))
							continue
				new_cards = (yield from self.get_help(p, card, num, mosquito, joker))
				if new_cards is None:
					self.next_turn()
					continue
				card, num, mosquito, joker = new_cards
				extra = (1 if mosquito else 0) + (1 if joker else 0)
				# Fall through.
			if self.Public.current.num == 0:
				if num == 0 and not mosquito:
					self.reply(_('must play a (non-joker) card'))
					continue
			else:
				if num == 0 and not mosquito:
					if joker:
						self.reply(_('cannot play lone joker'))
						continue
					# Pass.
					self.next_turn()
					continue

				if card == self.Public.current.card:
					# Same card as current.
					if num + extra != self.Public.current.num + public_extra + 1:
						self.reply(_('You must play one more card of the same type than are on the table'))
						continue
				else:
					# Other card.
					if num + extra != self.Public.current.num + public_extra:
						self.reply(_('You must play the same number of cards as are on the table'))
						continue

			self.Public.remove = False
			# Empty the current pile first, so that can be animated.
			self.Public.current = {'card': card, 'num': 0, 'mosquito': False, 'joker': False, 'player': p}

			# Remove cards from players hand.
			if mosquito:
				self.Private[p].hand[MOSQUITO] -= 1
				self.Public.players[p].cards -= 1
				self.Public.pile.append([MOSQUITO, self.mkpilepos()])
				self.Public.current_cards += 1
			if joker:
				self.Private[p].hand[JOKER] -= 1
				self.Public.players[p].cards -= 1
				self.Public.pile.append([JOKER, self.mkpilepos()])
				self.Public.current_cards += 1
			self.Private[p].hand[card] -= num
			for n in range(num):
				self.Public.pile.append([card, self.mkpilepos()])
			self.Public.players[p].cards -= num
			self.Public.current_cards += num

			# Set player to inactive if hand is empty.
			if all(self.Private[p].hand[c] == 0 for c, card in enumerate(cardnames)):
				self.Public.players[p].done = len(self.players) - active
				active -= 1

			# Update current state.
			self.Public.current = {'card': card, 'num': num, 'mosquito': mosquito, 'joker': joker, 'player': p}
			self.Public.remove = True

			# End round if 1 active player left.
			if active <= 1:
				break
			
			# Otherwise, move on to next player.
			self.next_turn()
		# }}}

		# Compute scores. {{{
		scores = []
		delta = [[0, 0, 0, 0] for p in self.players]
		for p, player in enumerate(self.players):
			score = (len(self.players) - self.Public.players[p].done) if self.Public.players[p].done is not None else 0
			delta[p][0] += score
			self.Public.players[p].score += score
			if self.Public.round > 0 and len(self.players) > 3:
				# Handle partner scores.
				partner = self.Public.players[p].partner[0]
				if self.Public.players[p].partner[0] is not None:
					delta[partner][1] += score
					self.Public.players[partner].score += score
				else:
					delta[p][1] += 4
					self.Public.players[p].score += 4
			if self.Public.round > 0 or len(self.players) == 3:
				# Handle bonus scores.
				lions = sum(x == LION for x in self.Private[p].pile)
				if lions > 1:
					delta[p][2] += lions
					self.Public.players[p].score += lions
				if self.Private[p].hand[LION] > 0:
					delta[p][2] -= self.Private[p].hand[LION]
					self.Public.players[p].score -= self.Private[p].hand[LION]
				if HEDGEHOG not in self.Private[p].pile:
					delta[p][3] -= 1
					self.Public.players[p].score -= 1
		for p, player in enumerate(self.players):
			scores.append((self.Public.players[p].score, p))
		scores.sort(key = lambda x: x[0])
		self.broadcast.score_round(delta)
		# }}}

		# Prepare next round. {{{
		self.Public.turn = scores[0][1]
		if len(self.players) == 3:
			return scores[-1][0] < 19

		# Compute new partners.
		for s, score in enumerate(scores[:len(scores) // 2]):
			player = scores[s][1]
			partner = scores[len(scores) - 1 - s][1]
			self.Public.players[player].partner = (partner, False)
			self.Public.players[partner].partner = (player, True)
		if len(scores) % 2 == 1:
			self.Public.players[scores[len(scores) // 2][1]].partner = (None, None)
		# }}}
		return scores[-2][0] < 19
	# }}}

	def next_turn(self): # {{{
		'''Compute whose turn is next.'''
		t = self.Public.turn
		while True:
			t = (t + 1) % len(self.players)
			if t == self.Public.current.player:
				# Score these cards for this player.
				self.Public.remove = False
				self.Public.current = {'card': None, 'num': 0, 'mosquito': False, 'joker': False, 'player': None}
				self.Private[t].pile += self.Public.pile
				self.Public.pile = []
				num_cards = self.Public.current_cards
				self.Public.current_cards = 0
				self.Public.players[t].score_cards += num_cards
				self.Public.remove = True
			if self.Public.players[t].done is not None:
				continue
			if self.Public.current.num == 0 and self.Public.players[t].cards == 1 and self.Private[t].hand[JOKER] > 0:
				self.Public.players[t].blocked = True
			elif not self.Public.players[t].blocked:
				break
		self.Public.turn = t
	# }}}

	def get_help(self, player_num, card, num, mosquito, joker): # {{{
		'''Try to play cards with the help of the partner
		Return None for failure, or [card, num, mosquito, joker].
		In the latter case, the new cards are transferred to the player.
		The returned values are what the player is now playing.'''
		# Turn lone mosquito into extra card.
		if mosquito and (card == MOSQUITO or num == 0):
			num += 1
			mosquito = False
			card = MOSQUITO
		if num == 1 and card == MOSQUITO and self.Public.current.card != MOSQUITO:
			assert mosquito is False
			num = 0
			card = ELEPHANT
			mosquito = True
		extra = (1 if mosquito else 0) + (1 if joker else 0)
		public_extra = (1 if self.Public.current.mosquito else 0) + (1 if self.Public.current.joker else 0)
		player = self.players[player_num]
		target = self.Public.players[player_num].partner[0]
		while True:
			self.Public.remove = False
			self.Private[p].hand[card] -= num
			if joker:
				self.Private[p].hand[JOKER] -= 1
			if mosquito:
				self.Private[p].hand[MOSQUITO] -= 1
			self.Public.players[player_num].cards -= num + extra
			self.Public.help = [card, num, mosquito, joker, target]
			self.Public.remove = True
			args = (yield {'help': target})['args']
			self.Public.remove = False
			del self.Public.help
			self.Public.players[player_num].cards += num + extra
			if mosquito:
				self.Private[p].hand[MOSQUITO] += 1
			if joker:
				self.Private[p].hand[JOKER] += 1
			self.Private[p].hand[card] += num
			self.Public.remove = True
			new_card, new_num, new_mosquito, new_joker, new_extra, public_extra = self.check_valid(args, target, self.players[target])
			if new_card is None:
				continue
			if new_num == 0 and not new_mosquito and not new_joker:
				# Rejected.
				return None
			if num == 0 and new_num != 0:
				card = new_card
			if num != 0 and new_num == 0:
				new_card = card
			if num == 0 and new_num == 0:
				self.reply(_('You need to play at least one card that is not a joker'))
				continue
			if card != new_card:
				self.reply(_('You can only play the same card type as what was requested'))
				continue
			if new_mosquito and new_card != ELEPHANT:
				self.reply(_('A mosquito is only allowed with elephants'))
				continue
			if mosquito and new_mosquito or joker and new_joker:
				self.reply(_('Only one extra mosquito is allowed'))
				continue
			if new_card == self.Public.current.card:
				if num + new_num + extra + new_extra != self.Public.current.num + public_extra + 1:
					self.reply(_('Together you must play one more card of the same type than are on the table'))
					continue
			else:
				if num + new_num + extra + new_extra != self.Public.current.num + public_extra:
					self.reply(_('Together you must play the same number of cards as are on the table'))
					continue
			# Accepted.
			break
		# Give cards to partner.
		self.Public.remove = False
		if new_mosquito:
			self.Private[target].hand[MOSQUITO] -= 1
			self.Private[player_num].hand[MOSQUITO] += 1
		if new_joker:
			self.Private[target].hand[JOKER] -= 1
			self.Private[player_num].hand[JOKER] += 1
		count = new_num + (1 if new_mosquito else 0) + (1 if new_joker else 0)
		self.Private[target].hand[new_card] -= new_num
		self.Public.players[target].cards -= count
		self.Private[player_num].hand[new_card] += new_num
		self.Public.players[player_num].cards += count
		self.Public.remove = True
		return new_card, num + new_num, mosquito or new_mosquito, joker or new_joker
	# }}}

	def trade(self): # {{{
		'''Trade and discard cards'''
		if self.Public.round < 1 or len(self.players) < 4:
			return
		who = []
		for p, player in enumerate(self.players):
			if self.Public.players[p].partner[1] is not True:
				who.append(p)
		while len(who) > 0:
			self.Public.trade = who
			cmd = (yield {'trade': who})
			p = cmd['player']
			player = self.players[p]
			args = cmd['args']
			if len(args) != 2:
				self.reply(_('invalid call to trade'))
				continue
			if not 0 <= args[0] < len(cardnames) or not 0 <= args[1] < len(cardnames):
				self.reply(_('invalid cards in trade'))
				continue
			if (args[0] == args[1] and self.Private[p].hand[args[0]] < 2) or self.Private[p].hand[args[0]] < 1 or self.Private[p].hand[args[1]] < 1:
				self.reply(_('Player does not have cards'))
				continue
			self.Public.remove = False
			self.Private[p].hand[args[0]] -= 1
			self.Private[p].hand[args[1]] -= 1
			self.Public.players[p].cards -= 2
			who.remove(p)
			if self.Public.players[p].partner[0] is None:
				self.Private[p].pile.append(args[0])
				self.Private[p].pile.append(args[1])
				self.Public.players[p].score_cards += 2
			else:
				partner = self.Public.players[p].partner
				self.Private[partner[0]].hand[args[0]] += 1
				self.Private[partner[0]].hand[args[1]] += 1
				self.Public.players[partner[0]].cards += 2
				self.players[partner[0]].send('received', args[0], args[1])
			if self.Public.players[p].partner[1] is False:
				who.append(self.Public.players[p].partner[0])
			self.Public.remove = True
		del self.Public.trade
	# }}}

	# {{{
	# egel,
	# vos,
	# leeuw,
	# 2 leeuwen,
	# 2 olifanten,
	# 2 muizen,
	# 2 krokodillen,
	# 3 krokodillen,
	# 1 olifant+1 mug+1 joker,
	# 3 muizen,
	# 3 egels,
	# 3 vossen,
	# 3 ijsberen,
	# 2 olifanten+1 mug,
	# pas
	def demo(self):
		self.init()
		for c, card in enumerate(cards):
			self.Private[0].hand[c] = card['number']
		yield 'There are 60 cards in the game. 5 of each animal, except 4 mosquitos and 1 parrot. Every card except the parrot has a collection of other animals above it. Those are the animals that it fears.'
		num_cards = 60 / len(self.players)
		self.Private[0].hand = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 4, 1]
		for p in range(len(self.players)):
			self.Public.players[p].cards = 60 / len(self.players)

		yield 'The game is played in rounds. At the start of each round, all the cards are dealt up to the players.'
	# }}}
# }}}

# vim: set filetype=python foldmethod=marker :
