const ratingListUrl = '/ratinglist.json';

class Game {
	/**
	 * @param {number|string} gameId
	 * @param {string} player1name
	 * @param {string} player2name
	 * @param {string} boardSize 4x4 | 5x5 | ...
	 * @param {number} time
	 * @param {number} timeIncrement
	 */
	constructor(gameId, player1name, player2name, boardSize, time, timeIncrement) {
		this.gameId = gameId;
		this.player1name = player1name;
		this.player2name = player2name;
		this.boardSize = boardSize;
		this.time = time;
		this.timeIncrement = timeIncrement;
	}

	/**
	 * @param {server} server
	 * @returns {HTMLTableRowElement}
	 */
	render(server) {
		const timeMinutes = Math.floor(this.timeIncrement / 60);
		const timeSeconds = getZero(Math.floor(this.timeIncrement % 60));

		const p1rating = server.getPlayerRatingRow(this.player1name);
		const p2rating = server.getPlayerRatingRow(this.player2name);
		const myRating = server.getPlayerRatingRow(server.myname);

		const boardSizeSpan = `<span class='badge'>${this.boardSize}</span>`;

		const row = $('<tr/>')
			.addClass(`row game${this.gameId}`)
			.click(() => server.observegame(this.gameId));
		$('<td class="right"/>').append(Server.getRatingSpan(myRating, p1rating)).appendTo(row);
		$('<td class="playername right"/>').append(this.player1name).appendTo(row);
		$('<td class="center"/>').append('vs').appendTo(row);
		$('<td class="playername left"/>').append(this.player2name).appendTo(row);
		$('<td class="left"/>').append(Server.getRatingSpan(myRating, p2rating)).appendTo(row);
		$('<td/>').append(boardSizeSpan).appendTo(row);
		$('<td/>').append(`${timeMinutes}:${timeSeconds}`).appendTo(row);
		$('<td/>').append(`+${this.timeIncrement}s`).appendTo(row);
		return row;
	}
}
class Seek {
	/**
	 * @param {number|string} gameId
	 * @param {string} playerName
	 * @param {number} boardSize
	 * @param {number} time
	 * @param {number} timeIncrement
	 * @param {'W'|'B'|undefined} color
	 */
	constructor(gameId, playerName, boardSize, time, timeIncrement, color) {
		this.gameId = gameId;
		this.playerName = playerName;
		this.boardSize = boardSize;
		this.time = time;
		this.timeIncrement = timeIncrement;
		this.color = color;

		if (playerName.toLowerCase().includes('bot')) {
			const [botLevel, botLevelDescription] = botlist[playerName] || [100, 'Unknown'];
			this.isBot = true;
			this.botLevel = botLevel;
			this.description = botLevelDescription;
		} else {
			this.isBot = false;
			this.description = '';
		}
	}

	/**
	 * @param {server} server
	 * @returns {HTMLTableRowElement}
	 */
	render(server) {
		const timeMinutes = Math.floor(this.timeIncrement / 60);
		const timeSeconds = getZero(Math.floor(this.timeIncrement % 60));

		const playerRating = server.getPlayerRatingRow(this.playerName);
		const myRating = server.getPlayerRatingRow(server.myname);

		const img = $('<img src="images/circle_any.svg"/>');
		if (this.color) {
			img.src = (this.color === 'W' ? 'images/circle_white.svg' : 'images/circle_black.svg');
		}
		const descriptionSpan = this.description ? `<span class='botlevel'>${this.description}</span>` : '';
		const playerNameSpan = `<span class='playername'>${this.playerName}</span>`;
		const boardSizeSpan = `<span class='badge'>${this.boardSize}x${this.boardSize}</span>`;

		const row = $('<tr/>')
			.addClass(`row seek${this.gameId}`)
			.click(() => { server.acceptseek(this.gameId); });
		$(`<td class="colorchoice ${this.color || ''}"/>`).appendTo(row);
		$('<td/>').append(descriptionSpan + playerNameSpan).appendTo(row);
		$('<td class="right"/>').append(Server.getRatingSpan(myRating, playerRating)).appendTo(row);
		$('<td/>').append(boardSizeSpan).appendTo(row);
		$('<td/>').append(`${timeMinutes}:${timeSeconds}`).appendTo(row);
		$('<td/>').append(`+${this.timeIncrement}s`).appendTo(row);
		return row;
	}
}

class Server {
	constructor() {
		this.connection = null;
		this.timeoutvar = null;
		this.myname = null;
		this.tries = 0;
		this.timervar = null;
		this.lastTimeUpdate = null;
		this.lastBt = 0;
		this.lastWt = 0;
		this.anotherlogin = false;
		this.loggedin = false;
		/** @type {[[string, number, number, number, boolean]] | undefined} */
		this.rating = undefined;
		this.loginTimer = null;

		/** @type {Game[]} */
		this.gameList = [];
		/** @type {Seek[]} */
		this.seekList = [];
	}

	connect() {
		const self = this;
		if (this.connection && this.connection.readyState > 1) {
			this.connection = null;
		}
		if (!this.connection) {
			const proto = 'wss://';
			let url = `${window.location.host}/ws`;
			if (window.location.host.indexOf('localhost') > -1 || window.location.host.indexOf('127.0.0.1') > -1 || window.location.host.indexOf('192.168.') === 0) {
				url = 'www.playtak.com/ws/';
				// proto = 'ws://'
				// url=window.location.host.replace(/\:\d+$/,"")+":9999" + '/ws'
			}
			this.connection = new WebSocket(proto + url, 'binary');
			this.connection.onerror = (e) => {
				output(`Connection error: ${e}`);
			};
			this.connection.onmessage = (e) => {
				const blob = e.data;
				const reader = new FileReader();
				reader.onload = () => {
					const responseText = new TextDecoder('utf-8').decode(reader.result);
					self.msg(responseText);
					/*
					const res = res_text.split("\n");
					const i;
					for (i = 0; i < res.length - 1; i++) {
						this.msg(res[i]);
					}
					*/
				};
				reader.readAsArrayBuffer(blob);
			};
			this.connection.onclose = () => {
				this.loggedin = false;
				document.getElementById('login-button').textContent = 'Sign up / Login';
				$('#onlineplayers').addClass('hidden');
				document.getElementById('onlineplayersbadge').innerHTML = '0';
				document.getElementById('seekcount').innerHTML = '0';
				document.getElementById('seekcountbot').innerHTML = '0';
				document.getElementById('gamecount').innerHTML = '0';
				document.getElementById('scratchsize').disabled = false;
				board.scratch = true;
				board.observing = false;
				board.gameno = 0;
				document.title = 'Tak';
				$('#seeklist').empty();
				$('#seeklistbot').empty();
				$('#gamelist').empty();
				stopTime();

				if (localStorage.getItem('keeploggedin') === 'true' && !this.anotherlogin) {
					alert('info', 'Connection lost. Trying to reconnect...');
					this.startLoginTimer();
				} else {
					alert('info', 'You\'re disconnected from server');
				}
			};
		}

		if (!this.rating) {
			window.fetch(ratingListUrl)
				.then((response) => {
					response.json()
						.then((json) => {
							this.rating = json;
							// Update lists once the rating is available
							this.renderGameList();
							this.renderSeekList();
						})
						.catch((err) => console.error('Failed to parse JSON from ratings', err));
				})
				.catch((err) => console.error('Failed to get ratings', err));
		}
	}

	logout() {
		localStorage.removeItem('keeploggedin');
		localStorage.removeItem('usr');
		localStorage.removeItem('token');
		if (this.connection) {
			this.connection.close();
			alert('info', 'Disconnnecting from server....');
			this.connection = null;
		}
	}

	loginbutton() {
		if (this.loggedin) {
			this.logout();
		} else {
			$('#login').modal('show');
		}
	}
	/*
	init() {
		if (this.connection && this.connection.readyState === 2)//closing connection
			this.connection = null;
		if (this.connection && this.connection.readyState === 3)//closed
			this.connection = null;
		if (this.connection) { //user clicked logout
			this.connection.close();
			alert("info", "Disconnnecting from server....");

			localStorage.removeItem('keeploggedin');
			localStorage.removeItem('usr');
			localStorage.removeItem('token');
			this.connection=null
			return;
		}

		const proto = 'wss://'
		const url = window.location.host + '/ws'
		if(window.location.host.indexOf("localhost")>-1 || window.location.host.indexOf("127.0.0.1")>-1){
			url = "www.playtak.com/ws/"
			//proto = 'ws://'
			//url=window.location.host.replace(/\:\d+$/,"")+":9999" + '/ws'
		}
		this.connection = new WebSocket(proto+url, "binary");
		board.server = this;
		this.connection.onerror = function (e) {
			output("Connection error: " + e);
		};
		this.connection.onmessage = function (e) {
			const blob = e.data;
			const reader = new FileReader();
			reader.onload = function (event) {
				const res_text = new TextDecoder("utf-8").decode(reader.result);
					 //server.msg(res_text);

				const res = res_text.split("\n");
				const i;
				for (i = 0; i < res.length - 1; i++) {
					server.msg(res[i]);
				}

			};
			reader.readAsArrayBuffer(blob);
		};
		this.connection.onopen = function (e) {
		};
		this.connection.onclose = function (e) {
			document.getElementById('login-button').textContent = 'Sign up / Login';
			$('#onlineplayers').addClass('hidden');
			document.getElementById("onlineplayersbadge").innerHTML = "0";
			document.getElementById("seekcount").innerHTML = "0";
			document.getElementById("seekcountbot").innerHTML = "0";
			document.getElementById("gamecount").innerHTML = "0";
			document.getElementById("scratchsize").disabled = false;
			board.scratch = true;
			board.observing = false;
			board.gameno = 0;
			document.title = "Tak";
			$('#seeklist').children().each(function() {
				this.remove();
			});
			$('#seeklistbot').children().each(function() {
				this.remove();
			});
			$('#gamelist').children().each(function() {
				this.remove();
			});
			stopTime();

			if(localStorage.getItem('keeploggedin')==='true' &&
												!server.anotherlogin) {
				alert("info", "Connection lost. Trying to reconnect...");
				server.startLoginTimer();
			} else {
				alert("info", "You're disconnected from server");
			}
		};
	},
	*/

	startLoginTimer() {
		if (this.loginTimer !== null) {
			return;
		}
		this.loginTimer = setTimeout(() => this.loginTimerFn(), 5000);
	}

	stopLoginTimer() {
		if (this.loginTimer === null) {
			return;
		}
		clearTimeout(this.loginTimer);
		this.loginTimer = null;
	}

	loginTimerFn() {
		this.connect();
		this.loginTimer = setTimeout(() => this.loginTimerFn(), 5000);
	}

	login() {
		this.connect();
		if (this.connection.readyState === 0) {
			this.connection.onopen = () => this.login();
		} else if (this.connection.readyState === 1) {
			const name = $('#login-username').val();
			const pass = $('#login-pwd').val();

			this.send(`Login ${name} ${pass}`);
		}
	}

	guestlogin() {
		this.connect();
		if (this.connection.readyState === 0) {
			this.connection.onopen = () => this.guestlogin();
		} else if (this.connection.readyState === 1) {
			this.send('Login Guest');
		}
	}

	register() {
		this.connect();
		if (this.connection.readyState === 0) {
			this.connection.onopen = () => this.register();
		} else if (this.connection.readyState === 1) {
			const name = $('#register-username').val();
			const email = $('#register-email').val();
			const retypedEmail = $('#retype-register-email').val();

			if (email !== retypedEmail) {
				alert('danger', 'Email addresses don\'t match');
				return;
			}

			this.send(`Register ${name} ${email}`);
		}
	}

	changepassword() {
		this.connect();
		if (this.connection.readyState === 0) {
			this.connection.onopen = () => this.changepassword();
		} else if (this.connection.readyState === 1) {
			const curpass = $('#cur-pwd').val();
			const newpass = $('#new-pwd').val();
			const retypenewpass = $('#retype-new-pwd').val();

			if (newpass !== retypenewpass) {
				alert('danger', 'Passwords don\'t match');
			} else {
				this.send(`ChangePassword ${curpass} ${newpass}`);
			}
		}
	}

	sendresettoken() {
		this.connect();
		if (this.connection.readyState === 0) {
			this.connection.onopen = () => this.sendresettoken();
		} else if (this.connection.readyState === 1) {
			const name = $('#resettoken-username').val();
			const email = $('#resettoken-email').val();
			this.send(`SendResetToken ${name} ${email}`);
		}
	}

	resetpwd() {
		this.connect();
		if (this.connection.readyState === 0) {
			this.connection.onopen = () => this.resetpwd();
		} else if (this.connection.readyState === 1) {
			const name = $('#resetpwd-username').val();
			const token = $('#resetpwd-token').val();
			const npwd = $('#reset-new-pwd').val();
			const rnpwd = $('#reset-retype-new-pwd').val();
			if (npwd !== rnpwd) {
				alert('danger', 'Passwords don\'t match');
			} else {
				this.send(`ResetPassword ${name} ${token} ${npwd}`);
			}
		}
	}

	keepalive() {
		if (this.connection && this.connection.readyState === 1) { // open connection
			this.send('PING');
		}
	}

	/**
	 * Handles messages from the server
	 * @param {string} e Message/command
	 */
	msg(rawMessage) {
		console.log(rawMessage);
		output(rawMessage);
		const e = rawMessage.trim();
		if (e.startsWith('Game Start')) {
			// Game Start no. size player_white vs player_black yourcolor time
			const spl = e.split(' ');
			board.newgame(Number(spl[3]), spl[7]);
			board.gameno = Number(spl[2]);
			console.log(`gno ${board.gameno}`);
			document.getElementById('scratchsize').disabled = true;

			$('#player-me-name').removeClass('player1-name');
			$('#player-me-name').removeClass('player2-name');
			$('#player-opp-name').removeClass('player1-name');
			$('#player-opp-name').removeClass('player2-name');

			$('#player-me-time').removeClass('player1-time');
			$('#player-me-time').removeClass('player2-time');
			$('#player-opp-time').removeClass('player1-time');
			$('#player-opp-time').removeClass('player2-time');

			$('#player-me').removeClass('selectplayer');
			$('#player-opp').removeClass('selectplayer');

			if (spl[7] === 'white') { // I am white
				$('#player-me-name').addClass('player1-name');
				$('#player-opp-name').addClass('player2-name');

				$('#player-me-time').addClass('player1-time');
				$('#player-opp-time').addClass('player2-time');

				$('#player-me-img').addClass('white-player-color');
				$('#player-opp-img').removeClass('white-player-color');

				$('#player-me').addClass('selectplayer');
			} else { // I am black
				$('#player-me-name').addClass('player2-name');
				$('#player-opp-name').addClass('player1-name');

				$('#player-me-time').addClass('player2-time');
				$('#player-opp-time').addClass('player1-time');

				$('#player-me-img').removeClass('white-player-color');
				$('#player-opp-img').addClass('white-player-color');

				$('#player-opp').addClass('selectplayer');
			}

			$('.player1-name:first').html(spl[4]);
			$('.player2-name:first').html(spl[6]);
			document.title = `Tak: ${spl[4]} vs ${spl[6]}`;

			const time = Number(spl[8]);
			const m = Math.floor(time / 60);
			const s = getZero(Math.floor(time % 60));
			$('.player1-time:first').html(`${m}:${s}`);
			$('.player2-time:first').html(`${m}:${s}`);

			if (spl[7] === 'white') { // I am white
				if (!chathandler.roomExists('priv', spl[6])) {
					chathandler.createPrivateRoom(spl[6]);
				}
				chathandler.setRoom('priv', spl[6]);
			} else { // I am black
				if (!chathandler.roomExists('priv', spl[4])) {
					chathandler.createPrivateRoom(spl[4]);
				}
				chathandler.setRoom('priv', spl[4]);
			}

			const chimesound = document.getElementById('chime-sound');
			chimesound.pause();
			chimesound.currentTime = 0;
			chimesound.play();
		} else if (e.startsWith('Observe Game#')) {
			// Observe Game#1 player1 vs player2, 4x4, 180, 7 half-moves played, player2 to move
			const spl = e.split(' ');

			const p1 = spl[2];
			const p2 = spl[4].split(',')[0];

			board.clear();
			board.create(Number(spl[5].split('x')[0]), 'white', false, true);
			board.initEmpty();
			board.gameno = Number(spl[1].split('Game#')[1]);
			$('.player1-name:first').html(p1);
			$('.player2-name:first').html(p2);
			document.title = `Tak: ${p1} vs ${p2}`;

			const time = Number(spl[6].split(',')[0]);
			const m = Math.floor(time / 60);
			const s = getZero(Math.floor(time % 60));
			$('.player1-time:first').html(`${m}:${s}`);
			$('.player2-time:first').html(`${m}:${s}`);

			if (!chathandler.roomExists('room', `Game${board.gameno}`)) {
				chathandler.createGameRoom(`Game${board.gameno}`, p1, p2);
			}
			chathandler.setRoom('room', `Game${board.gameno}`);
		} else if (e.startsWith('GameList Add Game#')) {
			// GameList Add Game#1 player1 vs player2, 4x4, 180, 15, 0 half-moves played, player1 to move
			const split = e.split(' ');

			const gameId = split[2].split('Game#')[1];
			const time = Number(split[7].split(',')[0]);
			const inc = split[8].split(',')[0];
			const p1name = split[3];
			const p2name = split[5].split(',')[0];
			const boardSize = split[6].split(',')[0];

			this.gameList.push(new Game(gameId, p1name, p2name, boardSize, time, inc));
			this.renderGameList();
		} else if (e.startsWith('GameList Remove Game#')) {
			// GameList Remove Game#1 player1 vs player2, 4x4, 180, 0 half-moves played, player1 to move
			const split = e.split(' ');

			const gameId = split[2].split('Game#')[1];
			this.gameList = this.gameList.filter((game) => game.gameId !== gameId);
			this.renderGameList();
		} else if (e.startsWith('Game#')) {
			const spl = e.split(' ');
			const gameno = Number(e.split('Game#')[1].split(' ')[0]);
			// Game#1 ...
			if (gameno === board.gameno) {
				// Game#1 P A4 (C|W)
				if (spl[1] === 'P') {
					board.serverPmove(spl[2].charAt(0), Number(spl[2].charAt(1)), spl[3]);
				}
				// Game#1 M A2 A5 2 1
				else if (spl[1] === 'M') {
					const nums = [];
					for (let i = 4; i < spl.length; i += 1) {
						nums.push(Number(spl[i]));
					}
					board.serverMmove(
						spl[2].charAt(0),
						Number(spl[2].charAt(1)),
						spl[3].charAt(0),
						Number(spl[3].charAt(1)),
						nums
					);
				}
				// Game#1 Time 170 200
				else if (spl[1] === 'Time') {
					const wt = Math.max(+spl[2] || 0, 0);
					const bt = Math.max(+spl[3] || 0, 0);
					this.lastWt = wt;
					this.lastBt = bt;

					const now = new Date();
					this.lastTimeUpdate = now.getTime() / 1000;

					board.timer_started = true;
					startTime(true);
				}
				// Game#1 RequestUndo
				else if (spl[1] === 'RequestUndo') {
					alert('info', 'Your opponent requests to undo the last move');
					$('#undo').toggleClass('opp-requested-undo request-undo');
				}
				// Game#1 RemoveUndo
				else if (spl[1] === 'RemoveUndo') {
					alert('info', 'Your opponent removes undo request');
					$('#undo').toggleClass('opp-requested-undo request-undo');
				}
				// Game#1 Undo
				else if (spl[1] === 'Undo') {
					board.undo();
					alert('info', 'Game has been UNDOed by 1 move');
					$('#undo').removeClass('i-requested-undo').removeClass('opp-requested-undo').addClass('request-undo');
				}
				// Game#1 OfferDraw
				else if (spl[1] === 'OfferDraw') {
					$('#draw').toggleClass('opp-offered-draw offer-draw');
					alert('info', 'Draw is offered by your opponent');
				}
				// Game#1 RemoveDraw
				else if (spl[1] === 'RemoveDraw') {
					$('#draw').removeClass('i-offered-draw').removeClass('opp-offered-draw').addClass('offer-draw');
					alert('info', 'Draw offer is taken back by your opponent');
				}
				// Game#1 Over result
				else if (spl[1] === 'Over') {
					document.title = 'Tak';
					board.result = spl[2];

					let msg = `Game over <span class='bold'>${spl[2]}</span><br>`;
					let type;

					if (spl[2] === 'R-0' || spl[2] === '0-R') {
						type = 'making a road';
					}
					else if (spl[2] === 'F-0' || spl[2] === '0-F') {
						type = 'having more flats';
					}
					else if (spl[2] === '1-0' || spl[2] === '0-1') {
						type = 'resignation or time';
					}

					if (spl[2] === 'R-0' || spl[2] === 'F-0' || spl[2] === '1-0') {
						if (board.observing === true) {
							msg += `White wins by ${type}`;
						} else if (board.mycolor === 'white') {
							msg += `You win by ${type}`;
						} else {
							msg += `Your opponent wins by ${type}`;
						}
					} else if (spl[2] === '1/2-1/2') {
						msg += 'The game is a draw!';
					} else if (spl[2] === '0-0') {
						msg += 'The game is aborted!';
					} else { // black wins
						// eslint-disable-next-line no-lonely-if
						if (board.observing === true) {
							msg += `Black wins by ${type}`;
						} else if (board.mycolor === 'white') {
							msg += `Your opponent wins by ${type}`;
						} else {
							msg += `You win by ${type}`;
						}
					}

					document.getElementById('scratchsize').disabled = false;
					stopTime();

					$('#gameoveralert-text').html(msg);
					$('#gameoveralert').modal('show');
					board.gameover();
				}
				// Game#1 Abandoned
				else if (spl[1] === 'Abandoned.') {
					// Game#1 Abandoned. name quit
					document.title = 'Tak';

					if (board.mycolor === 'white') {
						board.result = '1-0';
					} else {
						board.result = '0-1';
					}

					let msg = `Game abandoned by ${spl[2]}.`;
					if (!board.observing) {
						msg += ' You win!';
					}

					document.getElementById('scratchsize').disabled = false;
					stopTime();

					$('#gameoveralert-text').html(msg);
					$('#gameoveralert').modal('show');
					board.gameover();
				}
			}
		} else if (e.startsWith('Login or Register')) {
			this.stopLoginTimer();
			this.send('Client TakWeb-16.05.26');
			clearInterval(this.timeoutvar);
			this.timeoutvar = setInterval(() => this.keepalive(), 30000);
			if (localStorage.getItem('keeploggedin') === 'true' && this.tries < 3) {
				const uname = localStorage.getItem('usr');
				const token = localStorage.getItem('token');
				this.send(`Login ${uname} ${token}`);
				this.tries += 1;
			} else {
				localStorage.removeItem('keeploggedin');
				localStorage.removeItem('usr');
				localStorage.removeItem('token');
				$('#login').modal('show');
			}
		}
		// Registered ...
		else if (e.startsWith('Registered')) {
			alert('success', 'You\'re registered! Check mail for password');
		}
		// Name already taken
		else if (e.startsWith('Name already taken')) {
			alert('danger', 'Name is already taken');
		}
		// Can't register with guest in the name
		else if (e.startsWith('Can\'t register with guest in the name')) {
			alert('danger', 'Can\'t register with guest in the name');
		}
		// Unknown format for username/email
		else if (e.startsWith('Unknown format for username/email')) {
			alert('danger', e);
		}
		// Authentication failure
		else if (e.startsWith('Authentication failure')) {
			console.log('failure');
			if (($('#login').data('bs.modal') || {}).isShown) {
				alert('danger', 'Authentication failure');
			} else {
				localStorage.removeItem('keeploggedin');
				localStorage.removeItem('usr');
				localStorage.removeItem('token');
				$('#login').modal('show');
			}
		} else if (e.startsWith('Wrong password')) {
			alert('danger', 'Wrong Password');
		}
		// You're already logged in
		else if (e.startsWith('You\'re already logged in')) {
			alert('warning', 'You\'re already logged in from another window');
			this.connection.close();
		}
		// Welcome kaka!
		else if (e.startsWith('Welcome ')) {
			this.tries = 0;
			$('#login').modal('hide');
			document.getElementById('login-button').textContent = 'Logout';
			this.myname = e.split('Welcome ')[1].split('!')[0];
			alert('success', `You're logged in ${this.myname}!`);
			document.title = 'Tak';
			this.loggedin = true;

			const rem = $('#keeploggedin').is(':checked');
			if (rem === true && !this.myname.startsWith('Guest')) {
				console.log('storing');
				const name = $('#login-username').val();
				const token = $('#login-pwd').val();

				localStorage.setItem('keeploggedin', 'true');
				localStorage.setItem('usr', name);
				localStorage.setItem('token', token);
			}
		} else if (e.startsWith('Password changed')) {
			$('#settings-modal').modal('hide');
			alert('success', 'Password changed!');
		} else if (e.startsWith('Message')) {
			const msg = e.split('Message ');

			if (e.includes('You\'ve logged in from another window. Disconnecting')) {
				this.anotherlogin = true;
			}

			alert('info', `Server says: ${msg[1]}`);
		} else if (e.startsWith('Error')) {
			const msg = e.split('Error:')[1];
			alert('danger', `Server says: ${msg}`);
		}
		// Shout <name> msg
		else if (e.startsWith('Shout ')) {
			const regex = /Shout <([^\s]*)> (.*)/g;
			const match = regex.exec(e);

			chathandler.received('global', '', match[1], match[2]);
		}
		// ShoutRoom name <name> msg
		else if (e.startsWith('ShoutRoom')) {
			const regex = /ShoutRoom ([^\s]*) <([^\s]*)> (.*)/g;
			const match = regex.exec(e);

			chathandler.received('room', match[1], match[2], match[3]);
		}
		// Tell <name> msg
		else if (e.startsWith('Tell')) {
			const regex = /Tell <([^\s]*)> (.*)/g;
			const match = regex.exec(e);

			chathandler.received('priv', match[1], match[1], match[2]);
		}
		// Told <name> msg
		else if (e.startsWith('Told')) {
			const regex = /Told <([^\s]*)> (.*)/g;
			const match = regex.exec(e);

			chathandler.received('priv', match[1], this.myname, match[2]);
		} else if (e.startsWith('CmdReply')) {
			const msg = e.split('CmdReply ')[1];
			const messageSpan = `<span class="cmdreply">${msg}</span>`;

			chathandler.raw('global', 'global', messageSpan);
		}
		// new seek
		else if (e.startsWith('Seek new')) {
			// Seek new 1 chaitu 5 180 15 W|B
			const split = e.split(' ');

			const gameId = split[2];
			const time = Number(split[5]);
			const timeIncrement = split[6];

			const playerName = split[3];
			const boardSize = split[4];
			const color = split[7];

			this.seekList.push(new Seek(gameId, playerName, boardSize, time, timeIncrement, color));
			this.renderSeekList();
		}
		// remove seek
		else if (e.startsWith('Seek remove')) {
			// Seek remove 1 chaitu 5 15
			const split = e.split(' ');

			const gameId = split[2];
			this.seekList = this.seekList.filter((seek) => seek.gameId !== gameId);
			this.renderSeekList();
		}
		// Online players
		else if (e.startsWith('Online ')) {
			$('#onlineplayers').removeClass('hidden');
			const op = document.getElementById('onlineplayersbadge');
			op.innerHTML = Number(e.split('Online ')[1]);
		}
		// Reset token sent
		else if (e.startsWith('Reset token sent')) {
			alert('success', 'Token sent to your email');
			$('#resetpwd-ul li:eq(1) a').tab('show');
		}
		// Wrong token
		else if (e.startsWith('Wrong token')) {
			alert('danger', 'Wrong token. Try again');
		}
		// Password is changed
		else if (e.startsWith('Password is changed')) {
			alert('danger', 'Password changed. Login with your new password.');
			$('#resetpwd-modal').modal('hide');

			const name = $('#resetpwd-username').val();
			const pass = $('#reset-new-pwd').val();

			this.send(`Login ${name} ${pass}`);
		}
	}

	chat(type, name, msg) {
		if (type === 'global') {
			this.send(`Shout ${msg}`);
		}
		else if (type === 'room') {
			this.send(`ShoutRoom ${name} ${msg}`);
		}
		else if (type === 'priv') {
			this.send(`Tell ${name} ${msg}`);
		}
		else {
			console.log('undefined chat type');
		}
	}

	leaveroom(room) {
		this.send(`LeaveRoom ${room}`);
	}

	send(e) {
		const binaryData = (new TextEncoder()).encode(`${e}\n`);

		if (this.connection && this.connection.readyState === 1) {
			this.connection.send(binaryData);
		}
		else {
			this.error('You are not logged on to the server');
		}
	}

	static error(e) {
		alert('danger', e);
	}

	seek() {
		// boardSizeText is 3x3 / 4x4 ...
		const boardSizeText = $('#boardsize').find(':selected').text();
		const boardSize = parseInt(boardSizeText, 10);
		const time = $('#timeselect').find(':selected').text();
		const inc = $('#incselect').find(':selected').text();
		const colorText = $('#colorselect').find(':selected').text();
		let color = '';
		if (colorText === 'White') {
			color = 'W';
		}
		if (colorText === 'Black') {
			color = 'B';
		}

		this.send(`Seek ${boardSize} ${time * 60} ${inc} ${color}`);
		$('#creategamemodal').modal('hide');
	}

	removeseek() {
		this.send('Seek 0 0 0');
		$('#creategamemodal').modal('hide');
	}

	draw() {
		if (board.scratch || board.observing) {
			return;
		}

		if ($('#draw').hasClass('offer-draw')) { // offer
			$('#draw').toggleClass('i-offered-draw offer-draw');
			this.send(`Game#${board.gameno} OfferDraw`);
		} else if ($('#draw').hasClass('i-offered-draw')) { // remove offer
			$('#draw').toggleClass('i-offered-draw offer-draw');
			this.send(`Game#${board.gameno} RemoveDraw`);
		} else { // accept the offer
			$('#draw').removeClass('i-offered-draw').removeClass('opp-offered-draw').addClass('offer-draw');
			this.send(`Game#${board.gameno} OfferDraw`);
		}
	}

	undo() {
		if (board.observing) {
			return;
		}

		if ($('#undo').hasClass('request-undo')) { // request undo
			this.send(`Game#${board.gameno} RequestUndo`);
			$('#undo').toggleClass('request-undo i-requested-undo');
			alert('info', 'Undo request sent');
		} else if ($('#undo').hasClass('opp-requested-undo')) { // accept request
			this.send(`Game#${board.gameno} RequestUndo`);
			$('#undo').toggleClass('request-undo opp-requested-undo');
		} else if ($('#undo').hasClass('i-requested-undo')) { // remove request
			this.send(`Game#${board.gameno} RemoveUndo`);
			$('#undo').toggleClass('request-undo i-requested-undo');
			alert('info', 'Undo request removed');
		}
	}

	resign() {
		if (board.scratch || board.observing) {
			return;
		}

		this.send(`Game#${board.gameno} Resign`);
	}

	acceptseek(e) {
		this.send(`Accept ${e}`);
		$('#joingame-modal').modal('hide');
	}

	unobserve() {
		if (board.gameno !== 0) {
			this.send(`Unobserve ${board.gameno}`);
		}
	}

	observegame(no) {
		$('#watchgame-modal').modal('hide');
		if (board.observing === false && board.scratch === false) { // don't observe game while playing another
			return;
		}
		if (no === board.gameno) {
			return;
		}
		this.unobserve();
		this.send(`Observe ${no}`);
	}

	renderGameList() {
		document.getElementById('gamecount').textContent = this.gameList.length;

		$('#gamelist').empty();
		this.gameList.forEach((game) => game.render(this).appendTo($('#gamelist')));
	}

	renderSeekList() {
		const playerSeeks = this.seekList.filter((seek) => !seek.isBot);
		const botSeeks = this.seekList.filter((seek) => seek.isBot);
		botSeeks.sort((seekA, seekB) => seekA.botLevel > seekB.botLevel);

		const playerSeekTbody = $('#seeklist');
		playerSeekTbody.empty();
		playerSeeks.forEach((seek) => seek.render(this).appendTo(playerSeekTbody));
		const botSeekTbody = $('#seeklistbot');
		botSeekTbody.empty();
		botSeeks.forEach((seek) => seek.render(this).appendTo(botSeekTbody));

		document.getElementById('seekcount').textContent = playerSeeks.length;
		document.getElementById('seekcountbot').textContent = botSeeks.length;
	}

	/**
	 * @param {string} playerName
	 */
	getPlayerRatingRow(playerName) {
		if (!this.rating) return {};
		const ratingRowIndex = this.rating.findIndex((row) => row[0].split(' ').includes(playerName));
		if (ratingRowIndex === -1) return {};
		const ratingRow = this.rating[ratingRowIndex];
		return {
			rank: ratingRowIndex,
			names: ratingRow[0].split(' '),
			displayRating: ratingRow[1],
			rating: ratingRow[2],
			games: ratingRow[3],
			isBot: ratingRow[4],
		};
	}

	/**
	 * @param {{displayRating?: number}} myRating
	 * @param {{displayRating?: number}} playerRating
	 * @returns {string} span with rating and corresponding classes
	 */
	static getRatingSpan(myRating, playerRating) {
		const ratingSpan = $(`<span class='rating'>${playerRating.displayRating ?? ''}</span>`);
		if (playerRating.displayRating === undefined) {
			ratingSpan.addClass('unrated');
		}
		if (playerRating.displayRating && myRating.displayRating) {
			const difference = playerRating.displayRating - myRating.displayRating;

			const roundTo0 = (v) => (v > 0 ? Math.floor(v) : Math.ceil(v));
			const ratingLevelStep = 150; // delta between levels
			// Relative level in [-3, ... +3]. -3 is much weaker, +3 much stronger
			const relativeLevel = Math.max(-3, Math.min(roundTo0(difference / ratingLevelStep), 3));
			const relativeLevelClass = `level${Math.abs(relativeLevel)}`;

			if (relativeLevel === 0) {
				ratingSpan.addClass('even');
			} else if (relativeLevel < 0) {
				ratingSpan.addClass('weaker').addClass(relativeLevelClass);
			} else if (relativeLevel > 0) {
				ratingSpan.addClass('stronger').addClass(relativeLevelClass);
			}
		}
		return ratingSpan[0].outerHTML;
	}
}

// eslint-disable-next-line no-unused-vars
const server = new Server();
