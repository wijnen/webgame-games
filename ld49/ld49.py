# Entry for Ludum Dare Jam #49.
# Theme: Unstable.
# Author: Bas Wijnen
# Subject: Radioactive decay.

''' Members of Public and Private {{{
Public:

gate: {isotope: num}
actions: [{'type': 'alpha'/'beta-'/'beta+'/'gamma'/'source', 'source': [isotope or None, ...]}, ...]
intro: str
inventory: [{isotope or None: num}, ...]
theory: str

Private:

leitner: {isotope: level}
}}} '''

# Brainstorm/structure (probably outdated). {{{
# The game: an example
# player enters the game
# repeat until finished:
# 	story.
# 	player looks at gate and actions.
# 	repeat until gate is open.
# 		player uses an action.
# 		or player unlocks gate part.

# Room definition:
# - puzzle type for story
# - puzzle types
# - isotopes for gate
# {'story': puzzletype, 'types': [(puzzletype, arg), ...]}

# Puzzle type definition: (Fake puzzle types can be defined to give a room a story without a puzzle reference)
# - number of input isotopes
# - number of output isotopes
# - story for explanation
# - optional reference to theory
# - function for generating a puzzle
# {'input': int, 'output': int, 'story': story, 'theory': theory, 'create': function}

# Puzzle definition:
# - Required input isotopes, or None for hidden types
# - Resulting output isotopes, or None for hidden types
# - Text to show to the player
# - function for evaluating solve attempt
# {'input': [isotope, ...], 'output': [isotope, ...], 'text': str, 'run': function}

# Theory definition: html string

# Story definition: for now: html string; later different?
# }}}

# Imports and globals. {{{
import random
import re
from frozendict import frozendict

# This is defined by the system, but we need it before that happens.
_ = lambda x: x

elements = [_('hydrogen'), _('helium'), _('lithium'), _('beryllium'), _('boron'), _('carbon'), _('nitrogen'), _('oxygen'), _('fluorine'), _('neon'), _('sodium'), _('magnesium'), _('aluminum'), _('silicon'), _('phosphorus'), _('sulpher'), _('chlorine'), _('argon'), _('potassium'), _('calcium')]
symbols = ['H', 'He', 'Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne', 'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar', 'K', 'Ca']
# }}}

# Isotope management {{{
def create_isotope(l = 0, h = len(symbols)): # {{{
	Z = random.randrange(l, h) + 1
	X = symbols[Z - 1]
	element = elements[Z - 1]
	N = random.randrange(Z - 2, Z + 3)
	if N <= 0:
		if Z == 1:
			N = 0
		else:
			N = 1
	return frozendict({'E': element, 'X': X, 'N': N, 'Z': Z, 'M': N + Z})
# }}}

def alter_isotope(src, dZ = 0, dN = 0): # {{{
	N = src['N'] + dN
	Z = src['Z'] + dZ
	X = symbols[Z - 1]
	E = elements[Z - 1]
	return frozendict({'E': E, 'X': X, 'N': N, 'Z': Z, 'M': N + Z})
# }}}

def encode_isotope(isotope): # {{{
	if isotope is None:
		return None
	return '%(M)d,%(Z)d-%(X)s' % isotope
# }}}

def decode_isotope(isotope): # {{{
	if isotope is None:
		return None
	m = re.match('(\d+),(\d+)-([A-Za-z]+)$', isotope)
	if m is None:
		return None
	M = int(m.group(1))
	Z = int(m.group(2))
	X = m.group(3)
	if X not in symbols:
		return None
	E = elements[symbols.index(X)]
	return frozendict({'E': E, 'X': X, 'N': M - Z, 'Z': Z, 'M': M})
# }}}

def cryptic_output(isotope): # {{{
	options = [
		_('an isotope of %(E)s with %(N)d neutrons'),
		_('an isotope of %(E)s of mass %(M)d'),
		_('an isotope with %(Z)s protons and %(N)d neutrons'),
		_('an isotope with %(Z)s protons and mass %(M)d'),
		_('an isotope with mass %(M)s and %(N)d neutrons'),
	]
	return '<b>' + random.choice(options) % isotope + '</b>'
# }}}
# }}}

# Puzzle definitions. {{{
# Source {{{
source_story = _('''\
<p>Welcome to Magicium, stranger. My name is Activius and I am the protector of this town.<br/>
Unfortunately, Magicium is in grave danger. You see, the town was built on many
wooden poles. This used to work very well for us, but with time the structures
have begun to degrade.</p>

<p>Luckily, Radionius, who was our town's protector three centuries ago, had
expected that this would happen. And so he prepared a system to fix everything.
It's brilliant! We just need to pull a handle and the entire town will be
fortified and ready to withstand another thousand years!</p>

<p class="you">Do you want me to help? Just tell me what to do.</p>

<p>Do you see that gate? We need to open it. To do that, you need to insert a
specific isotope. Here is a container in which you can store one isotope. Use
it to carry the isotope to the gate and open it. Click on the container to use
it on the gate. That will only work if it is the correct isotope.</p>

<p>And do you see those three machines over there? You can use them to get
isotopes. Only one of them gives you the isotope you need for this gate, so
choose carefully. Although it's not a problem if you make a mistake; when you
get another one, it will replace whatever was in the container.</p>

<p class="you">Isotope? What is that? Can you explain what I'm doing here?</p>

<p>Of course. But let's take a step back. Whenever you enter a room, I will
tell you some things about our town. But there are also puzzles you need to
solve. If you need help with those puzzles, talk to me for an explanation about
it.</p>
''')

source_theory = _('''\
<p>This is all about nuclear physics. In chemistry they talk abuot atoms. But
there are really several different particles which are all called the same
atom. For example, when they talk about hydrogen, you know it contains exactly
one proton, but you don't know anything about the number of neutrons. An
isotope is just an atom where you know not only the number of protons, but also
the number of neutrons it contains.</p>

<p>An isotope consists of a nucleus, which is made
up of protons and neutrons. There are also electrons somewhere around it, but
we don't care about them. Now to write down an isotope, you will need to write
two numbers, followed by a symbol. The first number is above the second and it
is the total number of particles in the isotope, so the protons plus the
neutrons. The number below that is the electrical charge of the isotope, so
that's the number of protons. After all, protons have a charge of +1 and the
neutrons have no charge. The symbol that comes after it, is the chemical element
that the isotope is. That is defined by the number of protons, so if you know
that, you have not only the bottom number, but also the symbol. Well, if you
know which symbol corresponds to which number, anyway.</p>

<p class="you">Can you give me that table?</p>

<p>Of course. In this game, we only use the first 20 elements, so I'll give you
those. You may want to write them down somewhere, because you will need them
throughout the game. You can also still find it when you click on me, but that
may get tiresome. Also, you can also find them in text books and on the
internet.  Just search for "periodic table".</p>

<p><table><tr><th>Element</th><th>Symbol</th><th>Number of protons</th></tr>
<tr><td>Hydrogen</td><td>H</td><td>1</td></tr>
<tr><td>Helium</td><td>He</td><td>2</td></tr>
<tr><td>Lithium</td><td>Li</td><td>3</td></tr>
<tr><td>Beryllium</td><td>Be</td><td>4</td></tr>
<tr><td>Boron</td><td>B</td><td>5</td></tr>
<tr><td>Carbon</td><td>C</td><td>6</td></tr>
<tr><td>Nitrogen</td><td>N</td><td>7</td></tr>
<tr><td>Oxygen</td><td>O</td><td>8</td></tr>
<tr><td>Fluorine</td><td>F</td><td>9</td></tr>
<tr><td>Neon</td><td>Ne</td><td>10</td></tr>
<tr><td>Sodium</td><td>Na</td><td>11</td></tr>
<tr><td>Magnesium</td><td>Mg</td><td>12</td></tr>
<tr><td>Aluminum</td><td>Al</td><td>13</td></tr>
<tr><td>Silicon</td><td>Si</td><td>14</td></tr>
<tr><td>Phosphorus</td><td>P</td><td>15</td></tr>
<tr><td>Sulpher</td><td>S</td><td>16</td></tr>
<tr><td>Chlorine</td><td>Cl</td><td>17</td></tr>
<tr><td>Argon</td><td>Ar</td><td>18</td></tr>
<tr><td>Potassium</td><td>K</td><td>19</td></tr>
<tr><td>Calcium</td><td>Ca</td><td>20</td></tr>
</table></p>
''')
def create_source(isotope):
	text = _('This machine will give you %s.<br/>\nPlease prepare your container accordingly.') % cryptic_output(isotope)
	def run(inputs, outputs):
		return outputs[0] == isotope
	return {'input': [], 'output': [None], 'text': text, 'run': run}
source = {'name': 'source', 'input': 0, 'output': 1, 'create': create_source}
# }}}

# Alpha {{{
alpha_story = _('''\
<p>Well done! Now we get to the next gate. Which is also harder to open.</p>

<p class="you">So why are these doors here in the first place? Didn't Radionius
want you to pull the handle when you needed to?</p>

<p>Unfortunately, it's not that simple. The system should not be activated
before it was needed. Because of that, Radionius has added these secure gates
to protect it. Only wise people should be able to open them. And he had a weird
sense of humor, so he decided to make locks that were themselves based on
instability: radioactive isotopes.</p>
''')
alpha_theory = _('''\
<p>The machines with an alpha symbol (α) on them are special. They will give you
an isotope, but there are two special things happening. First of all, you need
to give it an isotope as well. So as long as you don't carry any isotopes, you
cannot use those machines. But you can check what they offer.</p>

<p>The second issue is that during the transaction, the isotopes will emit
alpha radiation. When that happens, they change. So you need ot give the
machine something that will become what it requests after the decay.</p>

<p class="you">What happens to an isotope when it emits an alpha particle?</p>

<p>The alpha particle consists of two protons and two neutrons. So it's a
helium nucleus. But because it is so common for these particles to be emitted
from nuclear reactions, they have earned a special name. That's why we call
them alpha particles.</p>

<p>So what happens to the isotope? Simple: it loses two protons and two
neutrons. So its mass decreases by four and its atomic number by two. Because
the number of protons changes, it also becomes a different element. So the
symbol also changes.</p>

<p>Now if I may talk to the player for a moment,</p>

<p class="you">Who?</p>

<p>You can ignore me; the player understands it.</p>

<p>Hello. Thank you for playing this game. Hopefully it teaches you some things
about nuclear physics. While making this game, I have tried to use actual
physical processes as much as possible. So what you learn here is also what
happens in the real world, and it is also what they teach in school. However,
there is one important exception: the isotopes that are presented may not
always exist in reality. And more importantly, the decays that are happening in
the game may not happen in those isotopes even if they do exist. In particular,
none of the isotopes that we are using emit alpha radiation in reality. That is
something that only heavier atoms do. I chose to use them anyway, for two
reasons: first, you will learn their names, symbols and atomic numbers by
playing this game. That is more useful for the "lower" elements. Second, those
elements are much more well known. I didn't want you to need to learn about new
elements; there's enough to learn here already.</p>

<p>Thanks for your attention, you can go back to playing now.</p>

<p class="you">What was that about? There's nobody else here. You are
weird...</p>
''')
def alpha_decay(isotope):
	return alter_isotope(isotope, dZ = -2, dN = -2)
def alpha_undecay(isotope):
	return alter_isotope(isotope, dZ = 2, dN = 2)
def create_alpha(isotopes):
	text = _('If you provide an isotope that after alpha decay will become %s, I shall give you %s in return. But there will also be alpha decay before you receive it, so take care how you prepare your container.<br/>Do we have a deal?') % (cryptic_output(isotopes[0]), cryptic_output(isotopes[1]))
	def run(inputs, outputs):
		return alpha_decay(inputs[0]) == isotopes[0] and alpha_decay(isotopes[1]) == outputs[0]
	return {'input': [None], 'output': [None], 'text': text, 'run': run}
alpha = {'name': 'alpha', 'input': 1, 'output': 1, 'create': create_alpha, 'decay': alpha_decay, 'undecay': alpha_undecay}
# }}}

# Beta minus {{{
betam_story = _('''\
<p class="you">But aren't you wise enough to open these gates? Were the
expectations of Radionius too high?</p>

<p>Oh no, that is not a problem. I know how to do it. But I'm old, and my hands
don't obey me as well as they used to. So I need someone else to open the gates
for me.</p>

<p class="you">But you're only giving me cryptic hints about what to do!
Why don't you just tell me how to configure to bux, and which machines I should
use?</p>

<p>Ah yes, I suppose I could do that. But I'm afraid I have inherited some of
the peculiar habits of Radionius. I enjoy it much more to watch you solve these
puzzles than to tell you the answer.</p>

<p class="you">Now I'm getting second thoughts about helping you...</p>

<p>That just means you are thinking too hard about it. There's another gate
waiting to be opened, get on with it!</p>
''')
betam_theory = _('''\
<p class="you">Now here are machines that have a beta on them, what are they?</p>

<p>You need to pay more attention to details! It's not just a beta, there also
is a minus sign. We pronounce that as "beta minus".</p>

<p class="you">Alright, sorry about that. So it's beta minus. But my question
remains: what are they?</p>

<p>They are similar the the alpha machines, but they use beta minus decay. That
means that a neutron in converted into a proton and an electron. The proton
remains in the nucleus, but the electron is ejected at high speed. That is the
radiation that can be detected. Because the electrons that make up the
radiation are negatively charged, it's called beta minus.</p>

<p class="you">Does beta plus also exist?</p>

<p>Ah, you are curious. Very good! Yes, it does also exist. But I will not
explain to you what it is until you reach the next room.</p>

<p class="you">You are so mean! Then at least tell me what beta minus decay
does to the isotope.</p>

<p>Why don't you think of it yourself? What do you think would happen?</p>

<p class="you">Well, let's see. A neutron becomes a proton. So the mass doesn't
change, but it gains one charge. And that makes sense, because we lose the
electron which has a negative charge. So losing -1 means gaining +1.</p>

<p>Very good! Now let's open that door!</p>
''')
def betam_decay(isotope):
	return alter_isotope(isotope, dZ = 1, dN = -1)
def betam_undecay(isotope):
	return alter_isotope(isotope, dZ = -1, dN = 1)
def create_betam(isotopes):
	text = _('If you provide an isotope that after beta minus decay will become %s, I shall give you %s in return. But there will also be beta minus decay before you receive it, so take care how you prepare your container.<br/>Do we have a deal?') % (cryptic_output(isotopes[0]), cryptic_output(isotopes[1]))
	def run(inputs, outputs):
		return betam_decay(inputs[0]) == isotopes[0] and betam_decay(isotopes[1]) == outputs[0]
	return {'input': [None], 'output': [None], 'text': text, 'run': run}
betam = {'name': 'betam', 'input': 1, 'output': 1, 'create': create_betam, 'decay': betam_decay, 'undecay': betam_undecay}
# }}}

# Beta plus {{{
betap_story = _('''\
<p>You have arrived at the last simple room. After this, it becomes complex.</p>

<p class="you">You called this simple? I thought it was pretty hard!</p>

<p>Yes, but that's because you had to learn all those things. Once you know them, it's simple.</p>

<p class="you">So why is the next room more complex?</p>

<p>Well, it's easier in terms of learning. There aren't any new reactions after
this. But so far, every room has just had you use a single reaction. In the
rooms after this, you will need to combine several reactions to open the
door.</p>

<p class="you">But it's only machines that I have already seen?</p>

<p>Well, after this room you have. Right there are some new machines.</p>

<p class="you">Good point. I'll have a look at them.</p>
''')
betap_theory = _('''\
<p>Beta plus is just like beta minus, except it's not a neutron that turns into
a proton, but a proton that turns into a neutron. In that reaction, there is
also another particle created, called a positron. It's very similar to an
electron, but it has a charge of +1.</p>

<p>Because those positrons are ejected and can be detected, this radiation (and
this decay) is called beta plus.</p>

<p>A lot more can be said about positrons. If you want to know, you should
search the internet. I'm not explaining ie here, because you don't need it to
open the gates.</p>

<p>Summarizing: when there is beta decay, a proton is converted into a neutron
(and a positron, but that is ejected), so the isotope loses 1 charge, but keeps
the same mass.</p>
''')
def betap_decay(isotope):
	return alter_isotope(isotope, dZ = -1, dN = 1)
def betap_undecay(isotope):
	return alter_isotope(isotope, dZ = 1, dN = -1)
def create_betap(isotopes):
	text = _('If you provide an isotope that after beta plus decay will become %s, I shall give you %s in return. But there will also be beta plus decay before you receive it, so take care how you prepare your container.<br/>Do we have a deal?') % (cryptic_output(isotopes[0]), cryptic_output(isotopes[1]))
	def run(inputs, outputs):
		return betap_decay(inputs[0]) == isotopes[0] and betap_decay(isotopes[1]) == outputs[0]
	return {'input': [None], 'output': [None], 'text': text, 'run': run}
betap = {'name': 'betap', 'input': 1, 'output': 1, 'create': create_betap, 'decay': betap_decay, 'undecay': betap_undecay}
# }}}
# }}}

# Stories (except for tutorial rooms). {{{
puzzle_story = [_('''\
<p>So, are you ready for the real work?</p>

<p class="you">I hope so. We'll find out.</p>

<p>Good luck! The people from the town are cheering you on!</p>

<p class="you">Huh, where are they?</p>

<p>Over there is my daughter</p>

<p class="you">You have a broad definition for "the people"... Well, I'll go and solve this thing.</p>
'''), _('''\
<p>Good work! That wasn't easy, now was it? There are two more doors with similar puzzles and then we can finally save the town!</p>

<p class="you">I'm starting to get the idea that you know the theory, but aren't actually able to solve the puzzles yourself. You're not enjoying to see me struggle, you need me to get it done.</p>

<p>No, of course not! I could totally do it myself! Ask anyone who lives in this town!</p>

<p class="you">"Anyone"? While the only person who's here is your daughter?</p>
'''), _('''\
<p>Great! Just one more door to go. Everyone in town will be celebrating you!</p>

<p class="you">How many people live in this town anyway?</p>

<p>Well, there's me. And my family of course.</p>

<p>...</p>

<p class="you">And?</p>

<p>...</p>

<p>No, uhm... That's all really.</p>

<p class="you">It's just your family? And you call that a town? I should have known... Well, I'm almost done now anyway, might as well open this last door. It's quite fun anyway, to be honest.</p>
''')]
# }}}

class Game: # {{{
	def run(self): # {{{
		self.timings = []
		# Map definition. {{{

		# Source room {{{
		source_room = {'name': 'start', 'story': source_story, 'theory': [source_theory], 'gate': {create_isotope(): 1}, 'types': []}
		for isotope in source_room['gate']:
			source_room['types'].append((source, isotope))
		for i in range(3 - len(source_room['types'])):
			source_room['types'].append((source, create_isotope()))
		# }}}

		# Alpha room {{{
		alpha_room = {'name': 'alpha', 'story': alpha_story, 'theory': [alpha_theory, source_theory], 'gate': {create_isotope(5, len(symbols) - 5): 1}, 'types': []}
		for isotope in alpha_room['gate']:
			inp = create_isotope(5, len(symbols) - 5)
			alpha_room['types'].append((alpha, (inp, alpha['undecay'](isotope))))
			alpha_room['types'].append((source, alpha['undecay'](inp)))
		alpha_room['types'].append((alpha, (create_isotope(5, len(symbols) - 5), create_isotope(5, len(symbols) - 5))))
		alpha_room['types'].append((source, create_isotope()))
		# }}}

		# Beta minus room {{{
		betam_room = {'name': 'beta minus', 'story': betam_story, 'theory': [betam_theory, alpha_theory, source_theory], 'gate': {create_isotope(5, len(symbols) - 5): 1}, 'types': []}
		for isotope in betam_room['gate']:
			inp = create_isotope(5, len(symbols) - 5)
			betam_room['types'].append((betam, (inp, betam['undecay'](isotope))))
			betam_room['types'].append((source, betam['undecay'](inp)))
		betam_room['types'].append((betam, (create_isotope(5, len(symbols) - 5), create_isotope(5, len(symbols) - 5))))
		betam_room['types'].append((source, create_isotope()))
		# }}}

		# Beta plus room {{{
		betap_room = {'name': 'beta plus', 'story': betap_story, 'theory': [betap_theory, betam_theory, alpha_theory, source_theory], 'gate': {create_isotope(5, len(symbols) - 5): 1}, 'types': []}
		for isotope in betap_room['gate']:
			inp = create_isotope(5, len(symbols) - 5)
			betap_room['types'].append((betap, (inp, betap['undecay'](isotope))))
			betap_room['types'].append((source, betap['undecay'](inp)))
		betap_room['types'].append((betap, (create_isotope(5, len(symbols) - 5), create_isotope(5, len(symbols) - 5))))
		betap_room['types'].append((source, create_isotope()))
		# }}}

		# Puzzle rooms {{{
		puzzle_rooms = []
		for r in range(3):
			puzzle_room = {'name': 'Puzzle %d' % (r + 1), 'story': puzzle_story[r], 'theory': [source_theory, alpha_theory, betam_theory, betap_theory], 'gate': {create_isotope(5, len(symbols) - 5): 1}, 'types': []}
			for isotope in puzzle_room['gate']:
				# 3 converters; 2 sources. 2 converters and 1 source are used, the rest is fake.
				converters = [alpha, betam, betap]
				random.shuffle(converters)
				isotope0 = create_isotope(5, len(symbols) - 5)
				isotope1 = create_isotope(5, len(symbols) - 5)
				puzzle_room['types'].append((converters[0], (isotope0, converters[0]['undecay'](isotope))))
				puzzle_room['types'].append((converters[1], (isotope1, converters[1]['undecay'](converters[0]['undecay'](isotope0)))))
				puzzle_room['types'].append((source, converters[1]['undecay'](isotope1)))
			puzzle_room['types'].append((converters[2], (create_isotope(5, len(symbols) - 5), create_isotope(5, len(symbols) - 5))))
			puzzle_room['types'].append((source, create_isotope()))
			puzzle_rooms.append(puzzle_room)
		# }}}

		rooms = [source_room, alpha_room, betam_room, betap_room] + puzzle_rooms
		# }}}
		for room in rooms[self.settings['startroom']:]:
			start_time = self.now
			yield from self.run_room(room)
			self.timings.append((room['name'], self.now - start_time))
		total = 0
		for room, t in self.timings:
			total += t
		self.timings.append(('<b>total</b>', total))
		timings = '\n'.join(['<tr><td>%s</td><td>%d:%05.2f</td></tr>' % (room, t // 60, t % 60) for room, t in self.timings])
		return _('''\
<p>Well done! You are amazing! Now let's watch the cutscene where you activate
the system and all the fortifications are put in place!</p>

<p>...</p>

<p>Yeah, I didn't think so. This game was written for Ludum Dare; everything
had to be made from scratch in just 48 hours. That's not enough time to make
cool cutscenes.</p>

<p>But I do have your scores! This is how much time it all took you:</p>
<table><tr><th>Room</th><th>Time</th></tr>
%s
</table>

<p>And you should know that the entire town is very thankful! You saved our world!</p>

<p class="you">Yes, I know. The entire town of one single household is very
thankful. You know what? You're welcome. I enjoyed solving the puzzles, and
even if I only saved one house, that's still a nice bonus.</p>

<p>That's the spirit! I wish you all the best on your further travels. Goodbye!</p>

<p class="you">Bye!</p>
''' % timings)
	# }}}
	def run_room(self, room): # {{{
		self.room = room
		self.Public.theory = room['theory']
		self.Public.inventory = [None]
		self.Public.intro = room['story']
		self.Public.gate = [(encode_isotope(isotope), num) for isotope, num in room['gate'].items()]
		self.puzzles = []
		for t, arg in room['types']:
			self.puzzles.append(t['create'](arg))
			self.puzzles[-1]['name'] = t['name']
		random.shuffle(self.puzzles)
		self.Public.actions = []
		for p in self.puzzles:
			self.Public.actions.append({'name': p['name'], 'text': p['text'], 'input': [encode_isotope(x) for x in p['input']], 'output': [encode_isotope(x) for x in p['output']]})
		self.broadcast.enter_room()
		while True:
			cmd = (yield from self.wait_for_command())
			if cmd['command'] == 'gate':
				for i in self.Public.gate:
					isotope = decode_isotope(i[0])
					if isotope == cmd['isotope']:
						i[1] -= 1
						if all(x[1] == 0 for x in self.Public.gate):
							return
				else:
					raise AssertionError('internal error: gate isotope not found')
			elif cmd['command'] == 'action':
				# Remove inputs from inventory.
				for inp in cmd['inputindex']:
					self.Public.inventory[inp] = None
				if self.puzzles[cmd['index']]['run'](cmd['inputs'], cmd['outputs']):
					# Add outputs to inventory.
					for out in cmd['outputs']:
						try:
							idx = self.Public.inventory.index(None)
						except ValueError:
							log('No empty slot; overwriting slot 0')
							idx = 0
						self.Public.inventory[idx] = encode_isotope(out)
			else:
				raise AssertionError('internal error: invalid command')
	# }}}
	def wait_for_command(self): # {{{
		while True:
			cmd = (yield {('gate', (('isotope', int),)): None, 'action': None})
			if cmd['command'] == 'gate':
				isotope = cmd['args']['isotope']
				if not 0 <= isotope < len(self.Public.inventory):
					self.reply(_('invalid inventory id given to gate'))
					continue
				isotope = decode_isotope(self.Public.inventory[isotope])
				if isotope is None:
					self.reply(_('invalid inventory item given to gate'))
					continue
				if isotope not in self.room['gate']:
					self.reply(_('that isotope is not in the gate'))
					continue
				return {'command': 'gate', 'isotope': isotope}
			elif cmd['command'] == 'action':
				if len(cmd['args']) != 3:
					log(cmd)
					self.reply(_('action requires 3 arguments'))
					continue
				if not isinstance(cmd['args'][0], int):
					self.reply(_('first action arguement must be an int'))
					continue
				idx = cmd['args'][0]
				if not 0 <= idx < len(self.Public.actions):
					self.reply(_('first action argument out of range'))
					continue
				puzzle = self.Public.actions[idx]
				if not isinstance(cmd['args'][1], (tuple, list)):
					self.reply(_('second action argument must be a sequence'))
					continue
				if not isinstance(cmd['args'][2], (tuple, list)):
					self.reply(_('third action argument must be a sequence'))
					continue
				if len(cmd['args'][1]) != len(puzzle['input']):
					self.reply(_('second action argument must have length of inputs'))
					continue
				if len(cmd['args'][2]) != len(puzzle['output']):
					self.reply(_('third action argument must have length of outputs'))
					continue
				if any(not isinstance(x, int) for x in cmd['args'][1]):
					self.reply(_('input isotopes must be passed as ints'))
					continue
				if any(not 0 <= x < len(self.Public.inventory) for x in cmd['args'][1]):
					self.reply(_('input isotope index out of range'))
					continue
				inputs = [decode_isotope(self.Public.inventory[x]) for x in cmd['args'][1]]
				if any(x is None for x in inputs):
					self.reply(_('invalid input isotope provided'))
					continue
				outputs = [decode_isotope(x) for x in cmd['args'][2]]
				if any(x is None for x in outputs):
					self.reply(_('You have prepared your container incorrectly. The isotope I provided you has unfortunately been destroyed.'))
					continue
				if any(y not in (None, x) for x, y in zip(cmd['args'][1], puzzle['input'])):
					self.reply(_('wrong input isotope provided'))
					continue
				if any(y not in (None, x) for x, y in zip(cmd['args'][2], puzzle['output'])):
					self.reply(_('wrong output isotope provided'))
					continue
				return {'command': 'action', 'index': idx, 'inputs': inputs, 'inputindex': cmd['args'][1], 'outputs': outputs}
			else:
				raise AssertionError('internal error: invalid command')
		# }}}
	# }}}

# vim: set foldmethod=marker :
