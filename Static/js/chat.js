var chathandler={
	chat_width:180
	,rooms:{}
	,cur_room:'global-'
	
	,createRoom:function(id,name){
		if(this.rooms.hasOwnProperty(id)){
			return
		}
		var header=$("<div class='roomheader'/>").append(name).click(selectThis)
		var roombody=$("<div class='roombody'/>")
		if(id!="global-"){
			var closebutton=$("<button class='chatclose'>×</button>").click(closeThis)
			header.prepend(closebutton)
		}
		this.rooms[id]=[header,roombody,""]
		$("#roomslist").append(header)
		$("#room_divs").append(roombody)
		function selectThis(){
			chathandler.selectRoom(id)
		}
		function closeThis(){
			header.remove()
			roombody.remove()
			delete chathandler.rooms[id]
			if(chathandler.cur_room==id){
				chathandler.selectRoom("global-")
			}
			if(id.split("-")[0]=="room"){
				server.leaveroom(id.replace(/^room\-/,""))
			}
		}
	}
	,createPrivateRoom:function(name){
		this.createRoom("priv-"+name,"<b>"+name+"</b>")
	}

	,selectRoom:function(id){
		if(this.rooms.hasOwnProperty(id)){
			if(this.rooms.hasOwnProperty(this.cur_room)){
				var oldroom=this.rooms[this.cur_room]
				oldroom[0].removeClass("selected")
				oldroom[1].removeClass("selected")
			}
			var room=this.rooms[id]
			room[0].addClass("selected")
			room[0].removeClass("newmessages")
			room[1].addClass("selected")
			$("#roomslist").prepend(room[0])
			this.cur_room=id
			$("#room_divs").scrollTop($("#room_divs")[0].scrollHeight)
		}
	}
	,init:function(){
		this.createRoom("global-","<b>Global</b>")
		this.selectRoom("global-")
	}
	,received:function(type,roomName,name,txt){
		var id=type+"-"+roomName
		if(id!=this.cur_room){
			if(type=="priv" && !this.rooms.hasOwnProperty(id)){
				this.createRoom(id,"<b>"+roomName+"</b>")
			}
			if(this.rooms.hasOwnProperty(id)){
				this.rooms[id][0].addClass("newmessages")
				$("#roomslist").prepend(this.rooms[id][0])
				$("#roomslist").prepend(this.rooms[this.cur_room][0])
			}
		}
		if(this.rooms.hasOwnProperty(id)){
			var $cs = this.rooms[id][1]

			var now = new Date()
			var hours = now.getHours()
			var mins = now.getMinutes()
			var cls = 'chattime'
			var timenow = getZero(hours) + ':' + getZero(mins)

			if(localStorage.getItem('hide-chat-time') === 'true'){
				cls = cls + ' hidden'
			}

			if(timenow !== this.rooms[id][2]){
				$cs.append('<div class="' + cls + '">' + timenow + '</div>')
				this.rooms[id][2] = timenow
			}
			$cs.append('<span class="chatname context-player">' + name + ':</span>')
			var options = {/* ... */}

			var occ = (txt.match(new RegExp(server.myname,"g")) || []).length
			txt = txt.linkify(options)
			var occ2 = (txt.match(new RegExp(server.myname,"g")) || []).length

			//someone said our name and link in string doesn't contain name
			if(occ === occ2 && txt.indexOf(server.myname) > -1){
				txt = txt.replace(new RegExp('(^|[^\\w\\d])(' + server.myname + ')(?=$|[^\\w\\d])','g'),'$1<span class="chatmyname">$2</span>')
			}

			$cs.append(' ' + txt + '<br>')

			$("#room_divs").scrollTop($("#room_divs")[0].scrollHeight)
		}
	}
	,adjustChatWidth:function(width){
		this.chat_width = width

		$('#chat-size-display').html(this.chat_width)
		$('#chat-size-slider').val(this.chat_width)
		$('#cmenu').width(this.chat_width)

		$('#chat-toggle-button').css('right',this.chat_width+16)
	}
	,hideChatTime:function(){
		if(document.getElementById('hide-chat-time').checked){
			localStorage.setItem('hide-chat-time','true')
			$('.chattime').each(function(index){
				$(this).addClass('hidden')
			})
		}
		else{
			localStorage.setItem('hide-chat-time','false')
			$('.chattime').each(function(index){
				$(this).removeClass('hidden')
			})
		}
	}
	,send:function(){
		var msg = $('#chat-me').val()
		if(this.cur_room=="global-"){
			server.chat('global','',msg)
		}
		else if(this.cur_room.split("-")[0]=="room"){
			server.chat('room',this.cur_room.split('room-')[1],msg)
		}
		else{ //Assuming priv
			server.chat('priv',this.cur_room.split('priv-')[1],msg)
		}
		$('#chat-me').val('')
		return false
	}
}

/*
var chathandler = {
	lastChatTime:''
	,chat_width:180
	,cur_room:'global'

	,init:function(){
		//$('#chat').offset({top:$('nav').height() + 5})
		$('#chat').css("top",($('nav').height() + 5)+"px")
		$('#chat').height(window.innerHeight - $('nav').height() - 118)
		//$('#chat-toggle-button').offset({top:$('nav').height() + 7})
		$('#chat-toggle-button').css("top",($('nav').height() + 7)+"px")

		$('#room-div-global').append('<a href="#" onclick="showPrivacyPolicy();"> Privacy Policy</a><br>')
	}
	,received:function(type,roomName,name,txt){
		console.log('received',type,roomName,name,txt)
		var clsname = 'chatname context-player'

		if(name === 'IRC'){
			name = txt.split('<')[1].split('>')[0]
			txt = txt.split('<' + name + '>')[1]
			clsname = clsname + ' ircname'
		}

		if(type === 'priv'){
			//Create room if doesn't exist and switch to it
			if(!this.roomExists('priv',roomName)){
				chathandler.createPrivateRoom(roomName)
				chathandler.setRoom('priv',roomName)
			}
		}
		var room = type + '-' + roomName
		if(type == 'global'){room = 'global'}

		var $cs = $('#room-div-' + room)

		var now = new Date()
		var hours = now.getHours()
		var mins = now.getMinutes()
		var cls = 'chattime'
		var timenow = getZero(hours) + ':' + getZero(mins)

		if(localStorage.getItem('hide-chat-time') === 'true'){
			cls = cls + ' hidden'
		}

		if(timenow !== this.lastChatTime){
			$cs.append('<div class="' + cls + '">' + timenow + '</div>')
			this.lastChatTime = timenow
		}
		$cs.append('<span class="' + clsname + '">' + name + ':</span>')
		var options = {}

		var occ = (txt.match(new RegExp(server.myname,"g")) || []).length
		txt = txt.linkify(options)
		var occ2 = (txt.match(new RegExp(server.myname,"g")) || []).length

		//someone said our name and link in string doesn't contain name
		if(occ === occ2 && txt.indexOf(server.myname) > -1){
			txt = txt.replace(new RegExp('(^|[^\\w\\d])(' + server.myname + ')(?=$|[^\\w\\d])','g'),'$1<span class="chatmyname">$2</span>')
		}

		$cs.append(' ' + txt + '<br>')

		$cs.scrollTop($cs[0].scrollHeight)
	}

	,raw:function(type,roomName,msg){
		var room = type + '-' + roomName
		if(type === 'global'){room = 'global'}

		var $cs = $('#room-div-' + room)
		$cs.append(' ' + msg + '<br>')

		$cs.scrollTop($cs[0].scrollHeight)
	}

	,send:function(){
		var msg = $('#chat-me').val()
		if(msg.startsWith('.')){
			server.send(msg.slice(1))
		}
		else{
			if(this.cur_room.startsWith('global')){
				server.chat('global','',msg)
			}
			else if(this.cur_room.startsWith('room-')){
				server.chat('room',this.cur_room.split('room-')[1],msg)
			}
			else{ //Assuming priv
				server.chat('priv',this.cur_room.split('priv-')[1],msg)
			}
		}
		$('#chat-me').val('')
	}

	,selectRoom:function(type,name){
		this.cur_room = (type + '-' + name)
		if(type === 'global'){this.cur_room = 'global'}

		title = $('.room-name-' + this.cur_room + ' a span').html()
		$('#cur_room').html(title)
	}

	,setRoom:function(type,name){
		var room = type + '-' + name
		$('.room-name-' + room + ' a').tab('show')
		chathandler.selectRoom(type,name)
	}
	,removeRoom:function(type,name){
		var room = type + '-' + name
		console.log('remove '+room)

		if(this.cur_room === room){
			$('#room_list li:eq(0) a').tab('show')
			this.selectRoom('global','global')
		}

		if(type === 'room'){server.leaveroom(name)}

		$('.room-name-' + room).remove()
		$('#room-div-' + room).remove()
	}

	,createRoom:function(type,name,title){
		var room = type + '-' + name

		var room_div = $('<div/>').attr('id','room-div-' + room)
			.addClass('tab-pane')
		$('#room_divs').append(room_div)

		var room_list = $('#room_list')
		var a = $('<a/>').click(function(){chathandler.selectRoom(type,name)})
			.attr('data-toggle','tab')
			.attr('href','#room-div-' + room)
			.append(title)
		var li = $('<li/>').append(a).addClass('room-name-' + room)

		$('<div/>').addClass('btn').html('&times;')
			.click(function(){chathandler.removeRoom(type,name)})
			.appendTo(li)

		$('#room_list').append(li)
	}

	,createGameRoom:function(game,p1,p2){
		var p1span = $('<span/>').html(p1).addClass('playername')
		var p2span = $('<span/>').html(p2).addClass('playername')
		var vs = $('<span/>').html(' vs ')
		var sp = $('<span/>').append(p1span).append(vs).append(p2span)

		this.createRoom('room',game,sp)
	}

	,createPrivateRoom:function(player){
		var psp = $('<span/>').html(player).addClass('playername')
		var sp = $('<span/>').append(psp)

		this.createRoom('priv',player,sp)
	}

	,roomExists:function(type,name){
		return $('.room-name-' + type + '-' + name).length
	}

	,hideChatTime:function(){
		if(document.getElementById('hide-chat-time').checked){
			localStorage.setItem('hide-chat-time','true')
			$('.chattime').each(function(index){
				$(this).addClass('hidden')
			})
		}
		else{
			localStorage.setItem('hide-chat-time','false')
			$('.chattime').each(function(index){
				$(this).removeClass('hidden')
			})
		}
	}

	,adjustChatWidth:function(width){
		this.chat_width = width

		$('#chat-size-display').html(this.chat_width)
		$('#chat-size-slider').val(this.chat_width)
		$('#chat').width(this.chat_width)

		$('#chat-toggle-button').css('right',this.chat_width+5)
	}

}
*/

$(function(){
	$.contextMenu({
		selector:'.context-player'
		,trigger:'left'
		,items:{
			PrivateChat:{
				name:"Private chat"
				,callback:function(key,opt){
					var name = opt.$trigger[0].innerText.split(':')[0]
					var id="priv-"+name
					chathandler.createRoom(id,"<b>"+name+"</b>")
					chathandler.selectRoom(id)

					//Don't create if already exists
					//if(!chathandler.roomExists('priv',name)){chathandler.createPrivateRoom(name)}

					//chathandler.setRoom('priv',name)
				}
			}
			,Games:{
				name:"Games"
				,callback:function(key,opt){
					var name = opt.$trigger[0].innerText.split(':')[0].replace(/[^a-zA-Z0-9_]/g,"")
					//yuck.. but we don't need any more sophistication
					var url="https://www.playtak.com/games/search?playerw="+name+"&mirror=on"
					window.open(url)
				}
			}
		}
	})

	$('.context-player').on('click',function(e){
		console.log('clicked',this)
	})
})
