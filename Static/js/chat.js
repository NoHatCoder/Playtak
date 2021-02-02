const chathandler = {
	lastChatTime: '',
	chat_width: 180,
	cur_room: 'global',

	init: function () {
		$('#chat').offset({ top: $('nav').height() + 5 });
		$('#chat').height(window.innerHeight - $('nav').height() - 118);
		$('#chat-toggle-button').offset({ top: $('nav').height() + 7 });

		$('#room-div-global').append('<a href="#" onclick="showPrivacyPolicy();"> Privacy Policy</a><br>');
	},
	/**
	 * Callback from server
	 */
	received: function (type, roomName, rawName, rawTxt) {
		console.log('received', type, roomName, rawName, rawTxt);

		const isIrc = rawName === 'IRC';
		const clsname = `chatname context-player ${isIrc ? 'ircname' : ''}`;
		const name = isIrc ? rawTxt.split('<')[1].split('>')[0] : rawName;
		let txt = isIrc ? rawTxt.split(`<${name}>`)[1] : rawTxt;

		if (type === 'priv') {
			// Create room if doesn't exist and switch to it
			if (!this.roomExists('priv', roomName)) {
				chathandler.createPrivateRoom(roomName);
				chathandler.setRoom('priv', roomName);
			}
		}
		let room = `${type}-${roomName}`;
		if (type === 'global') {
			room = 'global';
		}

		const $cs = $(`#room-div-${room}`);

		const now = new Date();
		const hours = now.getHours();
		const mins = now.getMinutes();
		let cls = 'chattime';
		const timenow = `${getZero(hours)}:${getZero(mins)}`;

		if (localStorage.getItem('hide-chat-time') === 'true') {
			cls = `${cls} hidden`;
		}

		if (timenow !== this.lastChatTime) {
			$cs.append(`<div class="${cls}">${timenow}</div>`);
			this.lastChatTime = timenow;
		}
		$cs.append(`<span class="${clsname}">${name}:</span>`);
		const options = {/* ... */ };

		const occ = (txt.match(new RegExp(server.myname, 'g')) || []).length;
		txt = txt.linkify(options);
		const occ2 = (txt.match(new RegExp(server.myname, 'g')) || []).length;

		// someone said our name and link in string doesn't contain name
		if (occ === occ2 && txt.indexOf(server.myname) > -1) {
			txt = txt.replace(new RegExp(`(^|[^\\w\\d])(${server.myname})(?=$|[^\\w\\d])`, 'g'), '$1<span class="chatmyname">$2</span>');
		}

		$cs.append(` ${txt}<br>`);

		$cs.scrollTop($cs[0].scrollHeight);
	},
	/**
	 * Callback from server to print a msg without styling.
	 * The caller will do stying on their end
	 */
	raw: function (type, roomName, msg) {
		let room = `${type}-${roomName}`;
		if (type === 'global') {
			room = 'global';
		}

		const $cs = $(`#room-div-${room}`);
		$cs.append(` ${msg}<br>`);

		$cs.scrollTop($cs[0].scrollHeight);
	},
	/**
	 * Callback from UI
	 */
	send: function () {
		const msg = $('#chat-me').val();
		if (msg.startsWith('.')) {
			server.send(msg.slice(1));
		}
		else if (this.cur_room.startsWith('global')) {
			server.chat('global', '', msg);
		}
		else if (this.cur_room.startsWith('room-')) {
			server.chat('room', this.cur_room.split('room-')[1], msg);
		}
		else { // Assuming priv
			server.chat('priv', this.cur_room.split('priv-')[1], msg);
		}

		$('#chat-me').val('');
	},
	/*
		 * Callback from UI
		 */
	selectRoom: function (type, name) {
		this.cur_room = (`${type}-${name}`);
		if (type === 'global') {
			this.cur_room = 'global';
		}

		const title = $(`.room-name-${this.cur_room} a span`).html();
		$('#cur_room').html(title);
	},

	setRoom: function (type, name) {
		const room = `${type}-${name}`;
		$(`.room-name-${room} a`).tab('show');
		chathandler.selectRoom(type, name);
	},
	/*
		 * Callback from UI
		 */
	removeRoom: function (type, name) {
		const room = `${type}-${name}`;
		console.log(`remove ${room}`);

		if (this.cur_room === room) {
			$('#room_list li:eq(0) a').tab('show');
			this.selectRoom('global', 'global');
		}

		if (type === 'room') {
			server.leaveroom(name);
		}

		$(`.room-name-${room}`).remove();
		$(`#room-div-${room}`).remove();
	},
	/*
		 * Callback from UI
		 */
	createRoom: function (type, name, title) {
		const room = `${type}-${name}`;

		const roomDiv = $('<div/>').attr('id', `room-div-${room}`)
			.addClass('tab-pane');
		$('#room_divs').append(roomDiv);

		const roomList = $('#room_list');
		const a = $('<a/>').click(() => chathandler.selectRoom(type, name))
			.attr('data-toggle', 'tab')
			.attr('href', `#room-div-${room}`)
			.append(title);
		const li = $('<li/>').append(a).addClass(`room-name-${room}`);

		$('<div/>').addClass('btn').html('&times;')
			.click(() => chathandler.removeRoom(type, name))
			.appendTo(li);

		$('#room_list').append(li);
	},

	/*
		 * Callback from UI
		 */
	createGameRoom: function (game, p1, p2) {
		const p1span = $('<span/>').html(p1).addClass('playername');
		const p2span = $('<span/>').html(p2).addClass('playername');
		const vs = $('<span/>').html(' vs ');
		const sp = $('<span/>').append(p1span).append(vs).append(p2span);

		this.createRoom('room', game, sp);
	},

	createPrivateRoom: function (player) {
		const psp = $('<span/>').html(player).addClass('playername');
		const sp = $('<span/>').append(psp);

		this.createRoom('priv', player, sp);
	},

	roomExists: function (type, name) {
		return $(`.room-name-${type}-${name}`).length;
	},
	/*
		 * Notify checkbox change for checkbox:
		 * Hide chat time
		 */
	hideChatTime: function () {
		if (document.getElementById('hide-chat-time').checked) {
			localStorage.setItem('hide-chat-time', 'true');
			$('.chattime').each(function (index) {
				$(this).addClass('hidden');
			});
		} else {
			localStorage.setItem('hide-chat-time', 'false');
			$('.chattime').each(function (index) {
				$(this).removeClass('hidden');
			});
		}
	},
	showchat: function () {
		$('#chat-toggle-button').css('right', this.chat_width + 5);
		$('#chat-toggle-text').html('>><br>c<br>h<br>a<br>t');
		$('#chat').removeClass('hidden');
		if (fixedcamera || true) {
			generateCamera();
		}
	},
	hidechat: function () {
		$('#chat-toggle-button').css('right', 0);
		$('#chat-toggle-text').html('<<<br>c<br>h<br>a<br>t');
		$('#chat').addClass('hidden');
		if (fixedcamera || true) {
			generateCamera();
		}
	},
	adjustChatWidth: function (width) {
		this.chat_width = width;

		$('#chat-size-display').html(this.chat_width);
		$('#chat-size-slider').val(this.chat_width);
		$('#chat').width(this.chat_width);

		$('chat-toggle-button').css('right', this.chat_width + 5);
	},
	togglechat: function () {
		if ($('#chat').hasClass('hidden')) {
			this.showchat();
		} else {
			this.hidechat();
		}
	},
};

$(() => {
	$.contextMenu({
		selector: '.context-player',
		trigger: 'left',
		items: {
			PrivateChat: {
				name: 'Private chat',
				callback: function (key, opt) {
					const name = opt.$trigger[0].innerText.split(':')[0];

					// Don't create if already exists
					if (!chathandler.roomExists('priv', name)) {
						chathandler.createPrivateRoom(name);
					}

					chathandler.setRoom('priv', name);
				},
			},
			Games: {
				name: 'Games',
				callback: function (key, opt) {
					const name = opt.$trigger[0].innerText.split(':')[0];
					// yuck.. but we don't need any more sophistication
					let url = 'https://www.playtak.com/games/search?game%5Bplayer_white%5D=kaka&game%5Bplayer_black%5D=kaka&game%5Bjoin%5D=or';
					url = url.replace(/kaka/g, name);
					window.open(url);
				},
			},
		},
	});

	$('.context-player').on('click', function (e) {
		console.log('clicked', this);
	});
});
