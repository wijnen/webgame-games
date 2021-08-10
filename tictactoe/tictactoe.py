# Tic tac toe: an example game using the webgame system.

class Game:
	def run(self):
		self.Public.board = [[None, None, None], [None, None, None], [None, None, None]]
		self.Public.turn = 0
		i = 0
		while i < 9:
			cmd = (yield {('play', 'ii'): self.Public.turn})
			y, x = cmd['args']
			if not 0 <= x < 3 or not 0 <= y < 3:
				self.reply(_('selected position is not on the board'))
				continue
			if self.Public.board[y][x] is not None:
				self.reply(_('selected position is already taken'))
				continue
			i += 1
			self.Public.board[y][x] = self.Public.turn
			if self.victory(self.Public.turn):
				return self.Public.turn
			self.Public.turn = 1 - self.Public.turn
		return None

	def victory(self, p):
		for i in range(3):
			if all(self.Public.board[i][j] == p for j in range(3)):
				return True
			if all(self.Public.board[j][i] == p for j in range(3)):
				return True
		if all(self.Public.board[j][j] == p for j in range(3)):
			return True
		if all(self.Public.board[2 - j][j] == p for j in range(3)):
			return True
		return False

# vim: set filetype=python foldmethod=marker :
