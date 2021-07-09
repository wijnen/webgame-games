# Flielands knikkerspel; module for webgame system.
name = 'Flielands knikkerspel'
'''
Shared object structure:

Public
	players[]
		team = int
		active = bool (False if cards were thrown away)
		cards = int
		# Convenience constants for drawing the board
		startpos = 4
		homepos = 4
	team[]
		marble[] = position:int
		num_start = int
		num_out = int
		num_home = int
	stack[] = [type:int, suit:int]

	# Convenience constant for drawing the board
	outpos = 64 or 96

	# State description
	turn = int (player)

Private
	hand[] = [type:int, suit:int]
	card = int | None
	marble = int | None (position)
	pending = [[team,n], pos]

position is:
10 * p + 0-3: start
10 * p + 5-8: home
100-163 (or 195): out

position 100 is the starting position for player 0.
Player 0 can enter their home at 162
There are 12 steps from player 2's enter position to the first white position.
4 more steps to player 1's starting position.
This makes 4 * 16 = 64 or 6 * 16 = 96 steps for the whole board.
'''

'''
Card:
0: move marble from start to out
1: move 1, or move marble from start to out
4: move 4 places backwards.
7: make two forward moves for a total of 7 steps.
11: move 11 steps or swap two marbles.
2,3,5,6,8,9,10,12: move the amount forwards with one marble.
'''

import random

num_players = (4, 6)

class GameEnd(Exception):
	def __init__(self, winner):
		super().__init__()
		self.winner = winner

class Game:
	def run(self):
		if len(self.players) not in (4, 6):
			return _('Can only play with 4 or 6 players')
		try:
			self.setup()
			self.first = 0
			while True:
				self.shuffle_cards()
				for c in (5, 4, 4):
					self.deal(c)
					for turn in range(c):
						yield from self.turn()
				self.first = (self.first + 1) % len(self.players)
		except GameEnd as winner:
			return winner.winner
	def p_start(self, player):
		return 10 * player
	def p_home(self, player):
		return 10 * player + 5
	def p_out(self, player):
		return 100 + 16 * player
	def p_in(self, player):
		return 100 + (16 * player - 2) % self.Public.outpos
	def p_team(self, player):
		return self.Public.players[player].team
	def can_jump_over(self, pos):
		if pos not in self.out:
			return True
		if pos < 100:
			return False
		phase = (pos - 100) % 16
		return 0 < phase < 12
	def can_jump_to(self, pos):
		if pos not in self.out:
			return True
		if pos < 100:
			return False
		phase = (pos - 100) % 16
		if phase != 0:
			return True
		owner = (pos - 100) // 16
		if len(self.players) != 4:
			owner %= 3
		return self.out[pos][0] != owner
	def m_is_start(self, team, marble):
		pos = self.Public.team[team].marble[marble]
		if pos >= 100:
			return False
		if len(self.players) == 4:
			assert 10 * team <= pos < 10 * (team + 1)
			return 10 * team <= pos < 10 * team + 4
		else:
			return any(10 * t <= pos < 10 * t + 4 for t in (team, (team + 3) % 6))
	def m_is_home(self, team, marble):
		pos = self.Public.team[team].marble[marble]
		if pos >= 100:
			return False
		if len(self.players) == 4:
			assert 10 * team <= pos < 10 * (team + 1)
			return 10 * team + 5 <= pos < 10 * team + 9
		else:
			return any(10 * t + 5 <= pos < 10 * t + 9 for t in (team, (team + 3) % 6))
	def m_is_out(self, team, marble):
		pos = self.Public.team[team].marble[marble]
		return pos >= 100
	def move_marble(self, src, dst):
		assert src in self.out
		assert dst not in self.out
		team, marble = self.out[src]
		with transaction:
			if self.m_is_start(team, marble):
				self.Public.team[team].num_start -= 1
			if self.m_is_out(team, marble):
				self.Public.team[team].num_out -= 1
			if self.m_is_home(team, marble):
				self.Public.team[team].num_home -= 1
			del self.out[src]
			self.Public.team[team].marble[marble] = dst
			self.out[dst] = (team, marble)
			self.Public.last[dst] = True;
			if self.m_is_start(team, marble):
				self.Public.team[team].num_start += 1
			if self.m_is_out(team, marble):
				self.Public.team[team].num_out += 1
			if self.m_is_home(team, marble):
				self.Public.team[team].num_home += 1
			if self.Public.team[team].num_home == len(self.Public.team[team].marble):
				if len(self.players) == 4:
					other = (team + 2) % 4
					if self.Public.team[other].num_home == 4:
						# This team has won the game.
						raise GameEnd((team, other))
					self.Public.players[team].team = other
				else:
					# This team has won the game.
					raise GameEnd((team, (team + 3) % 6))
	def capture(self, pos):
		if pos not in self.out:
			return
		assert pos >= 100
		team = self.out[pos][0]
		for p in range(4):
			if (self.p_start(team) + p) not in self.out:
				self.move_marble(pos, self.p_start(team) + p)
				break
			if len(self.players) == 6:
				t2 = (team + 3) % 6
				if (self.p_start(t2) + p) not in self.out:
					self.move_marble(pos, self.p_start(t2) + p)
					break
	def setup(self):
		self.out = {}	# dict with position as key, (team, marble) as value.
		self.Public.outpos = 16 * len(self.players)
		self.Public.team = [{'marble': [], 'num_start': 0, 'num_out': 0, 'num_home': 0} for n in range(4 if len(self.players) == 4 else 3)]
		self.Public.turn = 0
		self.Public.last = {}
		for player in range(len(self.players)):
			self.Public.players[player].startpos = 4
			self.Public.players[player].homepos = 4
			team = player if len(self.players) == 4 else player % 3
			offset = 0 if player == team else 4
			self.Public.players[player].team = team
			self.Public.team[team]['marble'].extend([None] * 4)
			self.Public.team[team]['num_start'] += 3
			self.Public.team[team]['num_out'] += 1
			self.Public.team[team]['num_home'] = 0
			for marble in range(3):
				self.Public.team[team].marble[marble + offset] = self.p_start(player) + marble
				self.out[self.p_start(player) + marble] = (team, marble + offset)
			self.Public.team[team].marble[3 + offset] = self.p_out(player)
			self.out[self.p_out(player)] = (team, 3 + offset)
	def shuffle_cards(self):
		self.deck = []
		for suit in range(len(self.players)):
			self.deck.extend({'suit': suit, 'type': n} for n in range(13))
		random.shuffle(self.deck)
		self.Public.stack = []
	def deal(self, num):
		for player in range(len(self.players)):
			self.players[player].Private.hand = []
			self.players[player].Private.card = None
			self.players[player].Private.marble = None
			self.players[player].Private.pending = None
			self.Public.players[player].active = True
			with transaction:
				for c in range(num):
					self.players[player].Private.hand.append(self.deck.pop())
				self.Public.players[player].cards = num
	def turn(self):
		for p in range(len(self.players)):
			current = (self.first + p) % len(self.players)
			self.Public.turn = current
			team = self.Public.players[current].team
			if not self.Public.players[current].active:
				continue
			if not any(self.can_play(current, card['type']) for card in self.players[current].Private.hand):
				# Cannot play any cards; throw them all away.
				self.Public.players[current].active = False
				while self.Public.players[current].cards > 0:
					with transaction:
						self.Public.stack.append(self.players[current].Private.hand.pop())
						self.Public.players[current].cards -= 1
					yield .2
				assert len(self.players[current].Private.hand) == 0
				continue
			c = (yield from self.play(current))
			card = self.players[current].Private.hand[c]
			# Move card that is played to the end of the list.
			while c < len(self.players[current].Private.hand) - 1:
				with transaction:
					self.players[current].Private.hand[c] = self.players[current].Private.hand[c + 1]
					self.players[current].Private.hand[c + 1] = card
					c += 1
			# Remove last card (which was just played) from the list.
			with transaction:
				self.Public.players[current].cards -= 1
				self.Public.stack.append(self.players[current].Private.hand.pop())
	def create_path(self, src, dst, backwards):
		'''Options:
		out -> out
		out -> home
		home -> home
		'''
		if src == dst:
			return []
		step = -1 if backwards else 1
		if dst >= 100:
			# out -> out
			if src < 100:
				return []
			if (src < dst) ^ backwards:
				return list(range(src + step, dst + step, step))
			if backwards:
				return list(range(src - 1, 99, -1)) + list(range(100 + self.Public.outpos - 1, dst - 1, -1))
			else:
				return list(range(src + 1, 100 + self.Public.outpos)) + list(range(100, dst + 1))
		if backwards or not 5 <= dst % 10 < 9:
			return []
		if src >= 100:
			# out -> home
			team = dst // 10
			target = self.p_in(team)
			if src > target:
				return []
			return list(range(src + 1, target + 1)) + list(range(self.p_home(team), dst + 1))
		# home -> home
		if not 5 <= src % 10 < 9 or src >= dst:
			return []
		return list(range(src + 1, dst + 1))
	def max_dist(self, pos, inpos):
		ret = 0
		if pos < 100:
			if 0 <= pos % 10 < 4:
				return 0
			for p in range(1, 4):
				if pos + p in self.out or (pos + p) % 10 == 9:
					break
				ret += 1
			return ret
		dist2 = None
		for p in range(1, 15):
			target = (pos + p - 100) % self.Public.outpos + 100
			if not self.can_jump_over(target):
				if self.can_jump_to(target):
					ret += 1
				break
			for ip in inpos:
				if target == self.p_in(ip[0]):
					dist2 = p + ip[1]
			ret += 1
		if dist2 is not None and dist2 > ret:
			return dist2
		return ret
	def can_play(self, player, card):
		team = self.p_team(player)
		if card in (0, 1):
			if len(self.players) == 4:
				opts = (self.p_out(player),)
			else:
				opts = (self.p_out(player), self.p_out((player + 3) % 6))
			if any(opt not in self.out or self.out[opt][0] != team for opt in opts):
				if any(self.m_is_start(team, m) for m, marble in enumerate(self.Public.team[team].marble)):
					return True
		if card == 0:
			return False
		if card == 11:
			if any(self.out[m][0] == team and m >= 100 for m in self.out) and any(self.out[m][0] != team and m >= 100 and self.p_out(self.out[m][0]) != self.out[m][1] for m in self.out):
				return True
		if card == 4:
			for m, pos in enumerate(self.Public.team[team].marble):
				if pos < 100:
					continue
				for p in range(1, 4):
					if not self.can_jump_over((pos - p - 100) % self.Public.outpos + 100):
						break
				else:
					if self.can_jump_to((pos - 4 - 100) % self.Public.outpos + 100):
						return True
			return False
		dists = []
		if len(self.players) == 4:
			inpos = ([player, 0],)
		else:
			inpos = ([player, 0], [(player + 3) % 6, 0])
		for ip in inpos:
			for p in range(4):
				if (self.p_home(ip[0]) + p) in self.out:
					break
				ip[1] += 1
		for m, pos in enumerate(self.Public.team[team].marble):
			dists.append(self.max_dist(pos, inpos))
		#print('dists:', dists)
		if any(d >= card for d in dists):
			return True
		if card != 7:
			return False
		dists.sort()
		if dists[-1] + dists[-2] >= 7:
			return True
		# The card is a 7 and it's not possible to move with two marbles. Check if one marble can capture and move on.
		for m, pos in enumerate(self.Public.team[team].marble):
			if pos < 100:
				continue
			captured = False
			for p in range(1, 8):
				target = (pos + p - 100) % self.Public.outpos + 100
				if any(target == self.p_in(ip[0]) and p + ip[1] >= 7 for ip in inpos):
					return True
				if self.can_jump_over(target):
					continue
				if not self.can_jump_to(target):
					break
				if captured and p != 7:
					break
				captured = True
			else:
				return True
		# The card is a 7 and it's not possible to play with just this team. Check if the team can finish.
		if len(self.players) != 4 or self.Public.team[team].num_home < 3 or self.p_home(team) in self.out:
			return False
		maxdist = None
		for m, pos in enumerate(self.Public.team[team].marble):
			if pos < 100:
				continue
			dist = self.p_home(team) - pos
			if not 0 <= dist < 7:
				continue
			if maxdist is not None and dist <= maxdist:
				continue
			if any(not self.can_jump_over(pos + p + 1) for p in range(dist)):
				continue
			maxdist = dist
		if maxdist is None:
			return False
		other_team = (team + 2) % 4
		if self.Public.team[other_team].num_home == 4:
			return True
		home_dist = 0
		for p in range(4):
			if (self.p_home(other_team) + p) in self.out:
				break
			home_dist += 1
		for m, pos in enumerate(self.Public.team[other_team].marble):
			dist = self.max_dist(pos, [other_team, home_dist])
			if dist + maxdist >= 7:
				return True
		return False
	def play(self, player):
		team = self.Public.players[player].team
		while True:
			with transaction:
				self.players[player].Private.card = None
				self.players[player].Private.marble = None
				self.players[player].Private.pending = None
			c = (yield {('card', 'i'): player})['args'][0]
			if not 0 <= c < len(self.players[player].Private.hand):
				self.reply(_('You do not have that card'))
				continue
			card = self.players[player].Private.hand[c]['type']
			if not self.can_play(player, card):
				self.reply(_('You cannot play that card'))
				continue
			self.players[player].Private.card = c
			pos = (yield {('marble', 'i'): player})['args'][0]
			if pos not in self.out:
				self.reply(_('You must select a marble'))
				continue
			if self.out[pos][0] != team:
				if card != 11:
					self.reply(_('You must select your own marble'))
					continue
				elif pos < 100:
					self.reply(_('You cannot swap that marble'))
					continue
			if card == 11 and self.out[pos][0] != team:
				# This is a swap.
				self.Public.last = {}	# Clear last move markers.
				if not self.can_jump_to(pos):
					self.reply(_('You cannot swap this marble'))
					continue
				self.players[player].Private.marble = pos
				pos2 = (yield {('marble', 'i'): player})['args'][0]
				if pos2 not in self.out:
					self.reply(_('Select a marble to swap with'))
					continue
				if self.out[pos2][0] != team:
					self.reply(_('You can only swap with your own marble'))
					continue
				self.move_marble(pos, 100 + self.Public.outpos)
				self.move_marble(pos2, pos)
				self.move_marble(100 + self.Public.outpos, pos2)
				break
			if card == 0 or (card == 1 and pos < 100 and 0 <= pos % 10 < 4):
				# Move a marble from the home to out.
				if pos >= 100 or not 0 <= pos % 10 < 4:
					self.reply(_('You cannot put marble {} on the board'), pos)
					continue
				if len(self.players) == 4:
					opts = (self.p_out(team),)
				else:
					opts = (self.p_out(player), self.p_out((player + 3) % 6))
				if not any(self.can_jump_to(pos2) for pos2 in opts):
					self.reply(_('The marble(s) at {} cannot be captured'), opts)
					continue
				# We can put a new marble on the board.
				self.Public.last = {}	# Clear last move markers.
				self.players[player].Private.marble = pos
				pos2 = (yield {('target', 'i'): player})['args'][0]
				if pos2 not in opts:
					self.reply(_('You cannot put a marble on the board there'))
					continue
				self.capture(pos2)
				self.move_marble(pos, pos2)
				break
			self.players[player].Private.marble = pos
			pos2 = (yield {('target', 'i'): player})['args'][0]
			path = self.create_path(pos, pos2, card == 4)
			if pos != pos2 and len(path) == 0:
				self.reply(_('You cannot move there with this card'))
				continue
			path2 = []
			fix = lambda: None
			new_team = team
			if card == 7:
				if len(path) > 7:
					self.reply(_('You cannot move there with this card'))
					continue
				if any(not self.can_jump_over(pos) for pos in path[:-1]):
					self.reply(_('you cannot jump over that marble'))
					continue
				if len(path) > 0 and not self.can_jump_to(path[-1]):
					self.reply(_('you cannot capture that marble'))
					continue
				if len(path) < 7:
					if pos != pos2:
						keep = self.out[pos2] if pos2 in self.out else None
						self.out[pos2] = self.out[pos]
						del self.out[pos]
						self.players[player].Private.pending = [self.out[pos2], pos2]
						def fix():
							# Use pos3 and pos4, because they are swapped before calling this.
							self.out[pos3] = self.out[pos4]
							if keep is None:
								del self.out[pos4]
							else:
								self.out[pos4] = keep
							self.players[player].Private.pending = None
					# Initialize pos3 and pos4 so fix() can use them.
					pos3 = pos
					pos4 = pos2
					# Check for victory and team switch.
					if self.Public.team[team].num_home == len(self.Public.team[team].marble) - 1 and pos >= 100 and pos2 < 100:
						# Player's team is finished, join other team or win game.
						if len(self.players) != 4:
							fix()
							self.Public.last = {}	# Clear last move markers.
							self.move_marble(pos, pos2)
							with transaction:
								self.Public.players[player].cards -= 1
								self.Public.stack.append(self.players[player].Private.hand.pop())
							raise GameEnd((team, (team + 3) % 6))
						new_team = (team + 2) % 4
						if self.Public.team[new_team].num_home == len(self.Public.team[new_team].marble):
							fix()
							self.Public.last = {}	# Clear last move markers.
							self.move_marble(pos, pos2)
							with transaction:
								self.Public.players[player].cards -= 1
								self.Public.stack.append(self.players[player].Private.hand.pop())
							raise GameEnd((team, new_team))
					# Swap numbers so the second path is checked below.
					path2 = path
					pos3 = pos
					pos4 = pos2
					self.players[player].Private.marble = None
					pos = (yield {('marble', 'i'): player})['args'][0]
					if pos not in self.out or self.out[pos][0] != new_team or (pos < 100 and 0 <= pos % 10 < 5):
						self.reply(_('You must select one of your active marbles (not {})'), pos)
						fix()
						continue
					self.players[player].Private.marble = pos
					pos2 = (yield {('target', 'i'): player})['args'][0]
					path = self.create_path(pos, pos2, False)
					if pos != pos2 and len(path) == 0 or len(path2) + len(path) != card:
						self.reply(_('You cannot move there with this card'))
						fix()
						continue
			else:
				if len(path) != card:
					self.reply(_('You cannot move there with this card.'))
					fix()
					continue
			if any(not self.can_jump_over(pos) for pos in path[:-1]):
				self.reply(_('you cannot jump over that marble'))
				fix()
				continue
			if len(path) > 0 and not self.can_jump_to(path[-1]):
				self.reply(_('you cannot capture that marble'))
				fix()
				continue
			else:
				fix()
				self.Public.last = {}	# Clear last move markers.
				if len(path2) > 0:
					self.capture(pos4)
					self.move_marble(pos3, pos4)
				if len(path) > 0:
					if len(path2) > 0:
						yield .5
					self.capture(pos2)
					self.move_marble(pos, pos2)
				if team != new_team:
					self.players[player].team = new_team
				break
		with transaction:
			self.players[player].Private.card = None
			self.players[player].Private.marble = None
		return c

# vim: set filetype=python foldmethod=marker :
