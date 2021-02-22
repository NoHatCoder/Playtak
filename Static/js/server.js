function decode_utf8(ar){
	var a
	out=""
	var intermediate=0
	var missing=0
	for(a=0;a<ar.length;a++){
		var code=ar[a]
		if(missing==0){
			if(code<128){
				out+=String.fromCharCode(code)
			}
			else if(code>=192){
				if(code<224){
					intermediate=code-192
					missing=1
				}
				else if(code<240){
					intermediate=code-224
					missing=2
				}
				else if(code<248){
					intermediate=code-240
					missing=3
				}
				else{
					out+="?"
				}
			}
			else{
				out+="?"
			}
		}
		else{
			if(code<128 || code>=192){
				missing=0
				out+="?"
			}
			else{
				intermediate=intermediate*64+code-128
				missing--
				if(missing==0){
					if(intermediate<0x10000){
						out+=String.fromCharCode(intermediate)
					}
					else{
						intermediate -= 0x10000
						out+=String.fromCharCode((intermediate >> 10) + 0xD800,(intermediate % 0x400) + 0xDC00)
					}
				}
			}
		}
	}
	return out
}

function minuteseconds(seconds){
	seconds=+seconds
	var minutes=Math.floor(seconds/60)
	seconds=seconds%60
	return (minutes>0?minutes:"")+":"+(seconds<10?"0":"")+seconds
}

function startswith(start,str){
	return str.slice(0,start.length)===start
}

var ratinglist={}
function fetchratings(){
	var xhttp = new XMLHttpRequest()
	xhttp.onreadystatechange = function(){
		if(this.readyState == 4 && this.status == 200){
			var rawratings=JSON.parse(xhttp.responseText)
			var a,b
			for(a=0;a<rawratings.length;a++){
				var pl=rawratings[a]
				var names=pl[0].split(" ")
				for(b=0;b<names.length;b++){
					ratinglist["!"+names[b]]=pl
				}
			}
			server.rendeergameslist()
			server.rendeerseekslist()
			server.updateplayerinfo()
		}
	}
	xhttp.open("GET",'/ratinglist.json',true)
	xhttp.send()
	//Run shortly after ratings have been generated, random time within 3 minute window, in order to not DDoS the server.
	setTimeout(fetchratings,(Math.ceil(Date.now()/3600000+0.16)-Math.random()*0.05-0.1)*3600000-Date.now())
}

function getratingstring(player){
	var pl=ratinglist["!"+player]
	if(!pl || pl[1]<100){
		return "&numsp;&numsp;&numsp;&numsp;"
	}
	if(pl[1]<1000){
		return "&numsp;"+pl[1]
	}
	return pl[1]+""
}
function getrating(player){
	var pl=ratinglist["!"+player]
	if(pl){
		return pl[1]
	}
	return 0
}
function isbot(player){
	var pl=ratinglist["!"+player]
	if(pl){
		return !!pl[4]
	}
	return false
}

var server = {
	connection:null
	,timeoutvar:null
	,myname:null
	,tries:0
	,timervar:null
	,lastTimeUpdate:null
	,anotherlogin:false
	,loggedin:false
	,seekslist:[]
	,gameslist:[]
	,changeseektime:0

	,connect:function(){
		if(this.connection && this.connection.readyState>1){
			this.connection = null
		}
		if(!this.connection){
			var proto = 'wss://'
			var url = window.location.host + '/ws'
			if(window.location.host.indexOf("localhost")>-1 || window.location.host.indexOf("127.0.0.1")>-1 || window.location.host.indexOf("192.168.")==0){
				url = "www.playtak.com/ws/"
				//proto = 'ws://'
				//url=window.location.host.replace(/\:\d+$/,"")+":9999" + '/ws'
			}
			this.connection = new WebSocket(proto+url,"binary")
			this.connection.onerror = function(e){
				output("Connection error: " + e)
			}
			this.connection.onmessage = function(e){
				var blob = e.data
				var reader = new FileReader()
				reader.onload = function(event){
					var ui8a=new Uint8Array(reader.result)
					var res_text=decode_utf8(ui8a)
					server.msg(res_text)
				}
				reader.readAsArrayBuffer(blob)
			}
			this.connection.onclose = function(e){
				server.loggedin=false
				document.getElementById('login-button').textContent = 'Log In'
				document.getElementById('login-button').classList.remove("loggedin")
				$('#onlineplayers').addClass('hidden')
				document.getElementById("onlineplayersbadge").innerHTML = "0"
				document.getElementById("seekcount").innerHTML = "0"
				document.getElementById("seekcountbot").innerHTML = "0"
				document.getElementById("gamecount").innerHTML = "0"
				//document.getElementById("scratchsize").disabled = false
				board.scratch = true
				board.observing = false
				board.gameno = 0
				document.title = "Tak"
				server.myname=null
				server.seekslist=[]
				server.gameslist=[]
				server.rendeergameslist()
				server.rendeerseekslist()
				server.updateplayerinfo()
				stopTime()

				if(localStorage.getItem('keeploggedin')==='true' && !server.anotherlogin){
					alert("info","Connection lost. Trying to reconnect...")
					server.startLoginTimer()
				}
				else{
					alert("info","You're disconnected from server")
				}
			}
		}
	}
	,logout:function(){
		localStorage.removeItem('keeploggedin')
		localStorage.removeItem('usr')
		localStorage.removeItem('token')
		if(this.connection){
			this.connection.close()
			alert("info","Disconnnecting from server....")
			this.connection=null
		}
	}
	,loginbutton:function(){
		if(server.loggedin){
			this.logout()
		}
		else{
			$('#login').modal('show')
		}
	}

	,loginTimer:null

	,startLoginTimer:function(){
		if(server.loginTimer !== null){return}
		server.loginTimer = setTimeout(server.loginTimerFn,5000)
	}

	,stopLoginTimer:function(){
		if(server.loginTimer == null){return}
		clearTimeout(server.loginTimer)
		server.loginTimer = null
	}

	,loginTimerFn:function(){
		server.connect()
		server.loginTimer = setTimeout(server.loginTimerFn,5000)
	}

	,login:function(){
		this.connect()
		if(this.connection.readyState==0){
			this.connection.onopen=function(){server.login()}
		}
		else if(this.connection.readyState==1){
			var name = $('#login-username').val()
			var pass = $('#login-pwd').val()

			this.send("Login " + name + " " + pass)
		}
	}
	,guestlogin:function(){
		this.connect()
		if(this.connection.readyState==0){
			this.connection.onopen=function(){server.guestlogin()}
		}
		else if(this.connection.readyState==1){
			this.send("Login Guest")
		}
	}
	,register:function(){
		this.connect()
		if(this.connection.readyState==0){
			this.connection.onopen=function(){server.register()}
		}
		else if(this.connection.readyState==1){
			var name = $('#register-username').val()
			var email = $('#register-email').val()
			var retyped_email = $('#retype-register-email').val()

			if(email !== retyped_email){
				alert("danger","Email addresses don't match")
				return
			}

			this.send("Register " + name + " " + email)
		}
	}
	,changepassword:function(){
		this.connect()
		if(this.connection.readyState==0){
			this.connection.onopen=function(){server.changepassword()}
		}
		else if(this.connection.readyState==1){
			var curpass = $('#cur-pwd').val()
			var newpass = $('#new-pwd').val()
			var retypenewpass = $('#retype-new-pwd').val()

			if(newpass !== retypenewpass){
				alert("danger","Passwords don't match")
			}
			else{
				this.send("ChangePassword "+curpass+" "+newpass)
			}
		}
	}
	,sendresettoken:function(){
		this.connect()
		if(this.connection.readyState==0){
			this.connection.onopen=function(){server.sendresettoken()}
		}
		else if(this.connection.readyState==1){
			var name = $('#resettoken-username').val()
			var email = $('#resettoken-email').val()
			this.send('SendResetToken '+name+' '+email)
		}
	}
	,resetpwd:function(){
		this.connect()
		if(this.connection.readyState==0){
			this.connection.onopen=function(){server.resetpwd()}
		}
		else if(this.connection.readyState==1){
			var name = $('#resetpwd-username').val()
			var token = $('#resetpwd-token').val()
			var npwd = $('#reset-new-pwd').val()
			var rnpwd = $('#reset-retype-new-pwd').val()
			if(npwd !== rnpwd){
				alert("danger","Passwords don't match")
			}
			else{
				this.send('ResetPassword '+name+' '+token+' '+npwd)
			}
		}
	}
	,keepalive:function(){
		if(server.connection && server.connection.readyState === 1){//open connection
			server.send("PING")
		}
	}
	,msg:function(e){
		console.log(e)
		output(e)
		e = e.trim()
		if(startswith("Game Start",e)){
			//Game Start no. size player_white vs player_black yourcolor time
			var spl = e.split(" ")
			board.newgame(Number(spl[3]),spl[7])
			board.gameno = Number(spl[2])
			console.log("gno "+board.gameno)
			//document.getElementById("scratchsize").disabled = true

			$('#player-me-name').removeClass('player1-name')
			$('#player-me-name').removeClass('player2-name')
			$('#player-opp-name').removeClass('player1-name')
			$('#player-opp-name').removeClass('player2-name')

			$('#player-me-time').removeClass('player1-time')
			$('#player-me-time').removeClass('player2-time')
			$('#player-opp-time').removeClass('player1-time')
			$('#player-opp-time').removeClass('player2-time')

			$('#player-me').removeClass('selectplayer')
			$('#player-opp').removeClass('selectplayer')

			if(spl[7] === "white"){//I am white
				$('#player-me-name').addClass('player1-name')
				$('#player-opp-name').addClass('player2-name')

				$('#player-me-time').addClass('player1-time')
				$('#player-opp-time').addClass('player2-time')

				$('#player-me-img').addClass('white-player-color')
				$('#player-opp-img').removeClass('white-player-color')

				$('#player-me').addClass('selectplayer')
			}
			else{//I am black
				$('#player-me-name').addClass('player2-name')
				$('#player-opp-name').addClass('player1-name')

				$('#player-me-time').addClass('player2-time')
				$('#player-opp-time').addClass('player1-time')

				$('#player-me-img').removeClass('white-player-color')
				$('#player-opp-img').addClass('white-player-color')

				$('#player-opp').addClass('selectplayer')
			}

			$('.player1-name:first').html(spl[4])
			$('.player2-name:first').html(spl[6])
			document.title = "Tak: " + spl[4] + " vs " + spl[6]

			var time = Number(spl[8])
			var m = parseInt(time/60)
			var s = getZero(parseInt(time%60))
			$('.player1-time:first').html(m+':'+s)
			$('.player2-time:first').html(m+':'+s)

			if(spl[7] === "white"){//I am white
				if(!chathandler.roomExists('priv',spl[6])){chathandler.createPrivateRoom(spl[6])}
				chathandler.setRoom('priv',spl[6])
			}
			else{//I am black
				if(!chathandler.roomExists('priv',spl[4])){chathandler.createPrivateRoom(spl[4])}
				chathandler.setRoom('priv',spl[4])
			}

			var chimesound = document.getElementById("chime-sound")
			//chimesound.pause()
			chimesound.currentTime=0
			chimesound.play()
		}
		else if(startswith("Observe Game#",e)){
			//Observe Game#1 player1 vs player2, 4x4, 180, 7 half-moves played, player2 to move
			var spl = e.split(" ")

			var p1 = spl[2]
			var p2 = spl[4].split(',')[0]

			board.clear()
			board.create(Number(spl[5].split("x")[0]),"white",false,true)
			board.initEmpty()
			board.gameno = Number(spl[1].split("Game#")[1])
			$('.player1-name:first').html(p1)
			$('.player2-name:first').html(p2)
			document.title = "Tak: " + p1 + " vs " + p2

			var time = Number(spl[6].split(",")[0])
			var m = parseInt(time/60)
			var s = getZero(parseInt(time%60))
			$('.player1-time:first').html(m+':'+s)
			$('.player2-time:first').html(m+':'+s)

			if(!chathandler.roomExists('room','Game'+board.gameno)){chathandler.createGameRoom('Game'+board.gameno,p1,p2)}
			chathandler.setRoom('room','Game'+board.gameno)
		}
		else if(startswith("GameList Add Game#",e)){
			//GameList Add Game#1 player1 vs player2, 4x4, 180, 15, 0 half-moves played, player1 to move
			var spl = e.split(" ")
			this.gameslist.push({
				id:+spl[2].split("Game#")[1]
				,time:Number(spl[7].split(",")[0])
				,increment:spl[8].split(",")[0]
				,player1:spl[3]
				,player2:spl[5].split(",")[0]
				,size:spl[6].split(",")[0]
			})
			this.rendeergameslist()
		}
		else if(startswith("GameList Remove Game#",e)){
			//GameList Remove Game#1 player1 vs player2, 4x4, 180, 0 half-moves played, player1 to move
			var spl = e.split(" ")
			var id = +spl[2].split("Game#")[1]
			var newgameslist=[]
			var a
			for(a=0;a<this.gameslist.length;a++){
				if(id!=this.gameslist[a].id){
					newgameslist.push(this.gameslist[a])
				}
			}
			this.gameslist=newgameslist
			this.rendeergameslist()
		}
		else if(startswith("Game#",e)){
			var spl = e.split(" ")
			var gameno = Number(e.split("Game#")[1].split(" ")[0])
			//Game#1 ...
			if(gameno === board.gameno){
				//Game#1 P A4 (C|W)
				if(spl[1] === "P"){
					board.serverPmove(spl[2].charAt(0),Number(spl[2].charAt(1)),spl[3])
				}
				//Game#1 M A2 A5 2 1
				else if(spl[1] === "M"){
					var nums = []
					for(i = 4;i < spl.length;i++){nums.push(Number(spl[i]))}
					board.serverMmove(
						spl[2].charAt(0),
						Number(spl[2].charAt(1)),
						spl[3].charAt(0),
						Number(spl[3].charAt(1)),
						nums
					)
				}
				//Game#1 Time 170 200
				else if(spl[1] === "Time"){
					var wt = Math.max(+spl[2]||0,0)
					var bt = Math.max(+spl[3]||0,0)
					lastWt = wt
					lastBt = bt

					var now = new Date()
					lastTimeUpdate = now.getTime()/1000

					board.timer_started = true
					startTime(true)
				}
				//Game#1 RequestUndo
				else if(spl[1] === "RequestUndo"){
					alert("info","Your opponent requests to undo the last move")
					$('#undo').toggleClass('opp-requested-undo request-undo')
				}
				//Game#1 RemoveUndo
				else if(spl[1] === "RemoveUndo"){
					alert("info","Your opponent removes undo request")
					$('#undo').toggleClass('opp-requested-undo request-undo')
				}
				//Game#1 Undo
				else if(spl[1] === "Undo"){
					board.undo()
					alert("info","Game has been UNDOed by 1 move")
					$('#undo').removeClass('i-requested-undo').removeClass('opp-requested-undo').addClass('request-undo')
				}
				//Game#1 OfferDraw
				else if(spl[1] === "OfferDraw"){
					$('#draw').toggleClass('opp-offered-draw offer-draw')
					alert("info","Draw is offered by your opponent")
				}
				//Game#1 RemoveDraw
				else if(spl[1] === "RemoveDraw"){
					$('#draw').removeClass('i-offered-draw').removeClass('opp-offered-draw').addClass('offer-draw')
					alert("info","Draw offer is taken back by your opponent")
				}
				//Game#1 Over result
				else if(spl[1] === "Over"){
					document.title = "Tak"
					board.result = spl[2]

					var msg = "Game over <span class='bold'>" + spl[2] + "</span><br>"
					var res
					var type

					if(spl[2] === "R-0" || spl[2] === "0-R"){type = "making a road"}
					else if(spl[2] === "F-0" || spl[2] === "0-F"){type = "having more flats"}
					else if(spl[2] === "1-0" || spl[2] === "0-1"){type = "resignation or time"}

					if(spl[2] === "R-0" || spl[2] === "F-0" || spl[2] === "1-0"){
						if(board.observing === true){
							msg += "White wins by "+type
						}
						else if(board.mycolor === "white"){
							msg += "You win by "+type
						}
						else{
							msg += "Your opponent wins by "+type
						}
					}
					else if(spl[2] === "1/2-1/2"){
						msg += "The game is a draw!"
					}
					else if(spl[2] === "0-0"){
						msg += "The game is aborted!"
					}
					else{//black wins
						if(board.observing === true){
							msg += "Black wins by "+type
						}
						else if(board.mycolor === "white"){
							msg += "Your opponent wins by "+type
						}
						else{
							msg += "You win by "+type
						}
					}

					//document.getElementById("scratchsize").disabled = false
					stopTime()

					$('#gameoveralert-text').html(msg)
					$('#gameoveralert').modal('show')
					board.gameover()
				}
				//Game#1 Abandoned
				else if(spl[1] === "Abandoned."){
					//Game#1 Abandoned. name quit
					document.title = "Tak"

					if(board.mycolor === "white"){
						board.result = "1-0"
					}
					else{
						board.result = "0-1"
					}

					var msg = "Game abandoned by " + spl[2] + "."
					if(!board.observing){msg += " You win!"}

					//document.getElementById("scratchsize").disabled = false
					stopTime()

					$('#gameoveralert-text').html(msg)
					$('#gameoveralert').modal('show')
					board.gameover()
				}
			}
		}
		else if(startswith("Login or Register",e)){
			server.stopLoginTimer()
			server.send("Client " + "TakWeb-16.05.26")
			clearInterval(this.timeoutvar)
			this.timeoutvar = setInterval(this.keepalive,30000)
			if(localStorage.getItem('keeploggedin')==='true' && this.tries<3){
				var uname = localStorage.getItem('usr')
				var token = localStorage.getItem('token')
				server.send("Login " + uname + " " + token)
				this.tries++
			}
			else{
				localStorage.removeItem('keeploggedin')
				localStorage.removeItem('usr')
				localStorage.removeItem('token')
				$('#login').modal('show')
			}
		}
		//Registered ...
		else if(startswith("Registered",e)){
			alert("success","You're registered! Check mail for password")
		}
		//Name already taken
		else if(startswith("Name already taken",e)){
			alert("danger","Name is already taken")
		}
		//Can't register with guest in the name
		else if(startswith("Can't register with guest in the name",e)){
			alert("danger","Can't register with guest in the name")
		}
		//Unknown format for username/email
		else if(startswith("Unknown format for username/email",e)){
			alert("danger",e)
		}
		//Authentication failure
		else if(startswith("Authentication failure",e)){
			console.log('failure')
			if(($('#login').data('bs.modal') || {}).isShown){
				alert("danger","Authentication failure")
			}
			else{
				localStorage.removeItem('keeploggedin')
				localStorage.removeItem('usr')
				localStorage.removeItem('token')
				$('#login').modal('show')
			}
		}
		else if(startswith("Wrong password",e)){
			alert("danger","Wrong Password")
		}
		//You're already logged in
		else if(startswith("You're already logged in",e)){
			alert("warning","You're already logged in from another window")
			this.connection.close()
		}
		//Welcome kaka!
		else if(startswith("Welcome ",e)){

			this.tries = 0
			$('#login').modal('hide')
			document.getElementById('login-button').textContent = 'Log Out'
			document.getElementById('login-button').classList.add("loggedin")
			this.myname = e.split("Welcome ")[1].split("!")[0]
			server.updateplayerinfo()
			alert("success","You're logged in "+this.myname+"!")
			document.title = "Tak"
			server.loggedin=true

			var rem = $('#keeploggedin').is(':checked')
			if(rem === true && !startswith("Guest",this.myname)){
				console.log('storing')
				var name = $('#login-username').val()
				var token = $('#login-pwd').val()

				localStorage.setItem('keeploggedin','true')
				localStorage.setItem('usr',name)
				localStorage.setItem('token',token)
			}
		}
		else if(startswith("Password changed",e)){
			$('#settings-modal').modal('hide')
			alert("success","Password changed!")
		}
		else if(startswith("Message",e)){
			var msg = e.split("Message ")

			if(e.includes("You've logged in from another window. Disconnecting")){server.anotherlogin = true}

			alert("info","Server says: " + msg[1])
		}
		else if(startswith("Error",e)){
			var msg = e.split("Error:")[1]
			alert("danger","Server says: "+msg)
		}
		//Shout <name> msg
		else if(startswith("Shout ",e)){
			var regex = /Shout <([^\s]*)> (.*)/g
			var match = regex.exec(e)

			chathandler.received('global','',match[1],match[2])
		}
		//ShoutRoom name <name> msg
		else if(startswith("ShoutRoom",e)){
			var regex = /ShoutRoom ([^\s]*) <([^\s]*)> (.*)/g
			var match = regex.exec(e)

			chathandler.received('room',match[1],match[2],match[3])
		}
		//Tell <name> msg
		else if(startswith("Tell",e)){
			var regex = /Tell <([^\s]*)> (.*)/g
			var match = regex.exec(e)

			chathandler.received('priv',match[1],match[1],match[2])
		}
		//Told <name> msg
		else if(startswith("Told",e)){
			var regex = /Told <([^\s]*)> (.*)/g
			var match = regex.exec(e)

			chathandler.received('priv',match[1],this.myname,match[2])
		}
		else if(startswith("CmdReply",e)){
			var msg = e.split("CmdReply ")[1]
			msg = '<span class="cmdreply">' + msg + '</span>'

			chathandler.raw('global','global',msg)
		}
		//new seek
		else if(startswith("Seek new",e)){
			//Seek new 1 chaitu 5 180 15 W|B
			var spl = e.split(" ")
			this.seekslist.push({
				id:+spl[2]
				,player:spl[3]
				,size:spl[4]+'x'+spl[4]
				,time:Number(spl[5])
				,increment:Number(spl[6])
				,color:spl[7]||"A"
			})
			this.rendeerseekslist()
		}
		//remove seek
		else if(startswith("Seek remove",e)){
			//Seek remove 1 chaitu 5 15
			var spl = e.split(" ")
			var id = +spl[2]
			var newseekslist=[]
			var a
			for(a=0;a<this.seekslist.length;a++){
				if(id!=this.seekslist[a].id){
					newseekslist.push(this.seekslist[a])
				}
			}
			this.seekslist=newseekslist
			this.rendeerseekslist()
		}
		//Online players
		else if(startswith("Online ",e)){
			$('#onlineplayers').removeClass('hidden')
			var op = document.getElementById("onlineplayersbadge")
			op.innerHTML = Number(e.split("Online ")[1])
		}
		//Reset token sent
		else if(startswith("Reset token sent",e)){
			alert("success","Token sent to your email")
			$("#resetpwd-ul li:eq(1) a").tab('show')
		}
		//Wrong token
		else if(startswith("Wrong token",e)){
			alert("danger","Wrong token. Try again")
		}
		//Password is changed
		else if(startswith("Password is changed",e)){
			alert("danger","Password changed. Login with your new password.")
			$('#resetpwd-modal').modal('hide')

			var name = $('#resetpwd-username').val()
			var pass = $('#reset-new-pwd').val()

			this.send("Login " + name + " " + pass)
		}
	}
	,updateplayerinfo:function(){
		document.getElementById("playerinfo").innerHTML=""
		$("#playerinfo").append((this.myname||"")+" ("+getratingstring(this.myname)+")")
		document.getElementById("playerinfo").href="ratings.html"+(this.myname?"#"+this.myname:"")
	}
	,rendeergameslist:function(){
		var listtable=document.getElementById("gamelist")
		listtable.innerHTML=""
		var a
		for(a=0;a<this.gameslist.length;a++){
			var game=this.gameslist[a]
			var p1 = "<span class='playername'>"+game.player1+"</span>"
			var p2 = "<span class='playername'>"+game.player2+"</span>"
			var sz = "<span class='badge'>"+game.size+"</span>"

			var row = $('<tr/>')
				.addClass('game'+game.id)
				.click(game.id,function(ev){server.observegame(ev.data)})
				.appendTo($('#gamelist'))
			$('<td/>').append(getratingstring(game.player1)).appendTo(row)
			$('<td/>').append(p1).addClass("right").appendTo(row)
			$('<td/>').append('vs').addClass("center").appendTo(row)
			$('<td/>').append(p2).appendTo(row)
			$('<td/>').append(getratingstring(game.player2)).addClass("right").appendTo(row)
			$('<td/>').append(sz).addClass("right").appendTo(row)
			$('<td/>').append(minuteseconds(game.time)).addClass("right").appendTo(row)
			$('<td/>').append('+'+minuteseconds(game.increment)).addClass("right").appendTo(row)
		}
		document.getElementById("gamecount").innerHTML=this.gameslist.length
	}
	,rendeerseekslist:function(){
		var humanlisttable=document.getElementById("seeklist")
		humanlisttable.innerHTML=""
		var botlisttable=document.getElementById("seeklistbot")
		botlisttable.innerHTML=""
		this.seekslist.sort(function(a,b){return getrating(b.player)-getrating(a.player) || ((a.player.toLowerCase()+" "+a.player)>(b.player.toLowerCase()+" "+b.player)?1:-1)})
		var a
		var playercount=0
		var botcount=0
		var myrating=1000
		var levelgap=150
		var maxlevels=3
		if(this.myname){
			myrating=getrating(this.myname)||1000
		}
		for(a=0;a<this.seekslist.length;a++){
			var seek=this.seekslist[a]
			var img = "images/circle_any.svg"
			if(seek.color=="W"){
				img="images/circle_white.svg"
			}
			if(seek.color=="B"){
				img="images/circle_black.svg"
			}
			var imgstring = '<img src="'+img+'"/>'

			var pspan = "<span class='playername'>"+seek.player+"</span>"
			var sizespan = "<span class='badge'>"+seek.size+"</span>"
			var row = $('<tr/>')
				.addClass('seek'+seek.id)
				.click(seek.id,function(ev){server.acceptseek(ev.data)})
			if(isbot(seek.player)){
				row.appendTo($('#seeklistbot'))
				botcount++
			}
			else{
				row.appendTo($('#seeklist'))
				playercount++
			}
			var rating=getrating(seek.player)
			var ratingdecoration=""
			if(rating){
				if(rating>=myrating+levelgap){
					ratingdecoration="<span class='ratingup'>"+("↑↑↑".slice(0,Math.min(Math.floor((rating-myrating)/levelgap),3)))+"</span>"
				}
				else if(rating<=myrating-levelgap){
					ratingdecoration="<span class='ratingdown'>"+("↓↓↓".slice(0,Math.min(Math.floor((myrating-rating)/levelgap),3)))+"</span>"
				}
				else{
					ratingdecoration="<span class='ratingequal'>≈</span>"
				}
			}
			$('<td/>').append(imgstring).appendTo(row)
			$('<td/>').append(pspan).appendTo(row)
			$('<td/>').append(ratingdecoration+getratingstring(seek.player)).addClass("right").appendTo(row)
			$('<td/>').append(sizespan).addClass("right").appendTo(row)
			$('<td/>').append(minuteseconds(seek.time)).addClass("right").appendTo(row)
			$('<td/>').append('+'+minuteseconds(seek.increment)).addClass("right").appendTo(row)
		}
		if(!botcount){
			$('<tr/>').append($('<td colspan="6"/>')).appendTo($('#seeklistbot'))
		}
		$('<tr/>').append($('<td colspan="6"/>')).appendTo($('#seeklist'))
		document.getElementById("seekcount").innerHTML=playercount
		document.getElementById("seekcountbot").innerHTML=botcount
		this.changeseektime=Date.now()
	}
	,chat:function(type,name,msg){
		if(type === 'global'){this.send('Shout '+msg)}
		else if(type == 'room'){this.send('ShoutRoom ' + name + ' ' + msg)}
		else if(type === 'priv'){this.send('Tell ' + name + ' ' + msg)}
		else{console.log('undefined chat type')}
	}
	,leaveroom:function(room){
		this.send('LeaveRoom ' + room)
	}
	,send:function(e){
		if(this.connection && this.connection.readyState === 1){this.connection.send(e + "\n")}
		else{this.error("You are not logged on to the server")}
	}
	,error:function(e){
		alert("danger",e)
	}
	,seek:function(){
		var size = $('#boardsize').find(':selected').text()
		size = parseInt(size)
		var time = $('#timeselect').find(':selected').text()
		var inc = $('#incselect').find(':selected').text()
		var clrtxt = $('#colorselect').find(':selected').text()
		var clr=''
		if(clrtxt == 'White'){clr = ' W'}
		if(clrtxt == 'Black'){clr = ' B'}

		this.send("Seek "+size+" " + (time*60) + " " + inc + clr)
		$('#creategamemodal').modal('hide')
	}
	,removeseek:function(){
		this.send("Seek 0 0 0")
		$('#creategamemodal').modal('hide')
	}
	,draw:function(){
		if(board.scratch){return}
		else if(board.observing){return}

		if($('#draw').hasClass("offer-draw")){//offer
			$('#draw').toggleClass('i-offered-draw offer-draw')
			this.send("Game#" + board.gameno + " OfferDraw")
		}
		else if($('#draw').hasClass("i-offered-draw")){//remove offer
			$('#draw').toggleClass('i-offered-draw offer-draw')
			this.send("Game#" + board.gameno + " RemoveDraw")
		}
		else{//accept the offer
			$('#draw').removeClass('i-offered-draw').removeClass('opp-offered-draw').addClass('offer-draw')
			this.send("Game#" + board.gameno + " OfferDraw")
		}
	}
	,undo:function(){
		if(board.observing){return}

		if($('#undo').hasClass('request-undo')){//request undo
			this.send("Game#" + board.gameno + " RequestUndo")
			$('#undo').toggleClass('request-undo i-requested-undo')
			alert('info','Undo request sent')
		}
		else if($('#undo').hasClass('opp-requested-undo')){//accept request
			this.send("Game#" + board.gameno + " RequestUndo")
			$('#undo').toggleClass('request-undo opp-requested-undo')
		}
		else if($('#undo').hasClass('i-requested-undo')){//remove request
			this.send("Game#" + board.gameno + " RemoveUndo")
			$('#undo').toggleClass('request-undo i-requested-undo')
			alert('info','Undo request removed')
		}
	}
	,resign:function(){
		if(board.scratch){return}
		else if(board.observing){return}

		this.send("Game#" + board.gameno + " Resign")
	}
	,acceptseek:function(e){
		if(this.changeseektime+800>Date.now()){
			return
		}
		this.send("Accept " + e)
		$('#joingame-modal').modal('hide')
	}
	,unobserve:function(){
		if(board.gameno !== 0){this.send("Unobserve " + board.gameno)}
	}
	,observegame:function(no){
		$('#watchgame-modal').modal('hide')
		if(board.observing === false && board.scratch === false){ //don't observe game while playing another
			return
		}
		if(no === board.gameno){return}
		this.unobserve()
		this.send("Observe " + no)
	}
}
