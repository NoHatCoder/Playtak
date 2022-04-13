function alert(type,msg) {
	$('#alert-text').text(msg)
	var $alert = $('#alert')
	$alert.removeClass("alert-success alert-info alert-warning alert-danger")

	$alert.addClass("alert-"+type)
	$alert.removeClass('hidden')
	$alert.stop(true,true)
	$alert.fadeTo(4000,500).slideUp(500,function() {
		$alert.addClass('hidden')
	})
	alert2(type,msg)
}

function alert2(type,msg) {
	$('#alert-text2').text(msg)
	var $alert = $('#alert2')
	$alert.removeClass("alert-success alert-info alert-warning alert-danger")

	$alert.addClass("alert-"+type)
	$alert.removeClass('hidden')
	$alert.stop(true,true)
	$alert.fadeTo(4000,500).slideUp(500,function() {
		$alert.addClass('hidden')
	})
}

var infobartimer=0
var currentinfomessage=1
var infochangetime=-Infinity
//var infodisplaytimes=[]
var infodisplayweights=[]
function infobar(){
	var bar=document.getElementById("infobar")
	if(!bar){
		bar=document.createElement("div")
		bar.id="infobar"
		document.body.appendChild(bar)
	}
	var cuttop=$('nav').height()+10
	var cutleft=($('#rmenu').hasClass('hidden')?0:209)+10
	var cutright=($('#cmenu').hasClass('hidden')?0:24+(+localStorage.getItem('chat_size')||180))+10
	bar.style.top=(cuttop+2)+"px"
	bar.style.left=(cutleft+20)+"px"
	bar.style.right=(cutright+20)+"px"
	
	var messages=[
		{
			m:"You need to log in in order to play."
			,c:function(){return !server.loggedin}
			,t:20
			,f:100
		}
		,{
			m:"Join the <a target='_blank' href='https://discord.gg/2xEt42X'>Tak community on Discord</a>."
			,c:function(){return true}
			,t:20
			,f:1
		}
		,{
			m:"There is a daily puzzle on <a target='_blank' href='https://ditaktic.blogspot.com/'>ditaktic.blogspot.com</a>."
			,c:function(){return true}
			,t:20
			,f:1
		}
		,{
			m:"Visit <a target='_blank' href='https://worldbuildersmarket.com/collections/tak-a-beautiful-game'>worldbuildersmarket.com</a> or <a target='_blank' href='https://aswood.works/shop'>aswood.works</a> in order to buy a physical Tak set."
			,c:function(){return true}
			,t:20
			,f:1
		}
		,{
			m:"Have you read <a target='_blank' href='https://ustak.org/play-beautiful-game-tak/'>the rules</a>?"
			,c:function(){return server.loggedin}
			,t:20
			,f:1
		}
		,{
			m:"In settings (gear icon), you can set the perspective to 0 and fix the camera in order to get a 2D experience."
			,c:function(){return server.loggedin && !(perspective==0 && fixedcamera)}
			,t:30
			,f:1
		}
		,{
			m:"In settings (gear icon), you can enable perspective and make the board rotatable."
			,c:function(){return server.loggedin && (perspective==0 && fixedcamera && ismobile)}
			,t:20
			,f:1
		}
		,{
			m:"You can join the <a target='_blank' href='https://ustak.org/'>US Tak Association</a>."
			,c:function(){return server.loggedin}
			,t:20
			,f:1
		}
		,{
			m:"Sign up for the <a target='_blank' href='https://play.toornament.com/en_US/tournaments/5570424523300052992/'>US Tak Beginner tournament</a>."
			,c:function(){var myrating=1000;if(server.myname){myrating=getrating(server.myname)||1000};return server.loggedin && myrating<1500}
			,t:20
			,f:10
		}
	]
	changemessage()
	function changemessage(){
		var now=invarianttime()
		var a
		var nextmessage=0
		clearTimeout(infobartimer)
		if(now>infochangetime || !(messages[currentinfomessage].c())){
			var possibilities=[]
			for(a=0;a<messages.length;a++){
				infodisplayweights[a]=(infodisplayweights[a]||Math.random())+messages[a].f
				if(messages[a].c()){
					if(currentinfomessage!=a){
						possibilities.push(a)
					}
				}
				else{
					infodisplayweights[a]=Math.min(infodisplayweights[a],messages[a].f*(10+Math.random()))
				}
			}

			possibilities.sort(function(a,b){return infodisplayweights[b]-infodisplayweights[a]})
			if(possibilities.length>=2){
				nextmessage=possibilities[Math.random()>(infodisplayweights[possibilities[0]]/(infodisplayweights[possibilities[0]]+infodisplayweights[possibilities[1]]))?1:0]
			}
			else if(possibilities.length>=1){
				nextmessage=possibilities[0]
			}

			currentinfomessage=nextmessage
			infochangetime=now+1000*messages[nextmessage].t
			bar.innerHTML=messages[nextmessage].m
			infodisplayweights[nextmessage]*=.5
		}
		infobartimer=setTimeout(changemessage,infochangetime-now)
	}
	/*
	function changemessage(){
		var now=invarianttime()
		var a
		var nextmessage=0
		clearTimeout(infobartimer)
		if(now>infochangetime || !(messages[currentinfomessage].c())){
			var possibilities=[]
			for(a=0;a<messages.length;a++){
				infodisplaytimes[a]=infodisplaytimes[a]||(-Math.floor(Math.random()*1000000000))
				if(messages[a].c() && currentinfomessage!=a){
					possibilities.push(a)
				}
			}
			if(possibilities[0]==0){
				nextmessage=0
			}
			else{
				possibilities.sort(function(a,b){return infodisplaytimes[a]-infodisplaytimes[b]})
				if(possibilities.length>=2){
					nextmessage=possibilities[Math.floor(Math.random()*2)]
				}
				else if(possibilities.length>=1){
					nextmessage=possibilities[0]
				}
			}
			currentinfomessage=nextmessage
			infochangetime=now+1000*messages[nextmessage].t
			bar.innerHTML=messages[nextmessage].m
			infodisplaytimes[nextmessage]=now
		}
		infobartimer=setTimeout(changemessage,infochangetime-now)
	}
	*/
}
function infobaroff(){
	try{
		document.getElementById("infobar").style.display="none"
	}
	catch(e){
		
	}
}

var camera,scene,renderer,light,canvas,controls = null
var perspective
var ismobile=false
var isidevice=false
var fixedcamera=false
var clickthrough=true
var hovertext=true
var pixelratio=1
var rendererdone=false
var clearcolor=0xdddddd

var antialiasing_mode = true
var maxaniso=1
var anisolevel=16

var settingscounter=0

var botlist = {
	"Tiltak_Bot":[0,"Very&nbsp;Hard"]
	,"TakticianBot":[2,"Very&nbsp;Hard"]
	,"TakkerusBot":[5,"Very&nbsp;Hard"]
	,"alphatak_bot":[10,"Hard"]
	,"AaaarghBot":[15,"Hard"]
	,"ShlktBot":[20,"Intermediate"]
	,"IntuitionBot":[25,"Intermediate"]
	,"takkybot":[30,"Easy"]
	,"BeginnerBot":[40,"Beginner"]
	,"FriendlyBot":[50,"Adjustable"]
	,"TakticianBotDev":[60,"Experimental"]
	,"FPABot":[65,"Experimental"]
	,"alphabot":[70,"Experimental"]
	,"cutak_bot":[80,"Experimental"]
}

init()
$(window).on("load",animate)

function combinefrustumvectors(a,b){
	var a2=a.dot(a)
	var b2=b.dot(b)
	var ab=a.dot(b)
	var a2b2=a2*b2
	var div=a2b2-ab*ab
	var bmul=(a2b2-a2*ab)/div
	var amul=(a2b2-b2*ab)/div
	return a.clone().multiplyScalar(amul).addScaledVector(b,bmul)
}

function frustumprojectionhelper(invcam,fv){
	return fv.dot(fv)/fv.dot(invcam)
}

function generateCamera(){
	if(!rendererdone){
		return
	}
	
	settingscounter=(settingscounter+1)&15
	
	var cuttop=$('nav').height()+10
	var cutleft=($('#rmenu').hasClass('hidden')?0:209)+10
	var cutright=($('#cmenu').hasClass('hidden')?0:24+(+localStorage.getItem('chat_size')||180))+10
	var cutbottom=0+10

	var pointlist=[]
	var xsizea=board.size*sq_size/2+border_size+stackOffsetFromBorder+piece_size
	var xsizeb=(board.size-1)*sq_size/2+piece_size/2
	var yneg=sq_height/2
	var yposa=10*piece_height-yneg
	var yposb=20*piece_height+yneg
	var zsizea=board.size*sq_size/2+border_size
	var zsizeb=xsizeb
	var a,b
	for(a=-1;a<2;a+=2){
		for(b=-1;b<2;b+=2){
			pointlist.push(new THREE.Vector3(a*xsizea,-yneg,b*zsizea))
			pointlist.push(new THREE.Vector3(a*xsizea,yposa,b*zsizea))
			pointlist.push(new THREE.Vector3(a*xsizeb,yposb,b*zsizeb))
		}
	}
	var invcamdir
	if(camera && !fixedcamera){
		invcamdir=camera.position.clone().sub(controls.center).normalize()
	}
	else{
		invcamdir=new THREE.Vector3(-4,25,25).normalize()
	}
	var camdir=invcamdir.clone().negate()
	var up=new THREE.Vector3(0,1,0)
	var camleft=new THREE.Vector3()
	camleft.crossVectors(up,camdir).normalize()
	var camup=new THREE.Vector3()
	camup.crossVectors(camdir,camleft).normalize()
	var camright=camleft.clone().negate()
	var camdown=camup.clone().negate()
	if(perspective>0){
		var fw=pixelratio*(window.innerWidth+Math.abs(cutleft-cutright))
		var fh=pixelratio*(window.innerHeight+Math.abs(cuttop-cutbottom))
		var ox=pixelratio*(Math.max(0,cutright-cutleft))
		var oy=pixelratio*(Math.max(0,cutbottom-cuttop))
		var xv=pixelratio*(window.innerWidth-cutleft-cutright)
		var yv=pixelratio*(window.innerHeight-cuttop-cutbottom)
		var perspectiveheight=fh*perspective/(yv+xv)/90
		var perspectivewidth=perspectiveheight*fw/fh
		var perspectiveangle=Math.atan(perspectiveheight)*360/Math.PI
		var scaletop=perspectiveheight*yv/fh
		var scalebottom=scaletop
		var scaleleft=perspectivewidth*xv/fw
		var scaleright=scaleleft
		var fvtop=camup.clone().divideScalar(scaletop).add(invcamdir).normalize()
		var fvbottom=camdown.clone().divideScalar(scalebottom).add(invcamdir).normalize()
		var fvleft=camleft.clone().divideScalar(scaleleft).add(invcamdir).normalize()
		var fvright=camright.clone().divideScalar(scaleright).add(invcamdir).normalize()
		var maxleft=0
		var maxright=0
		var maxtop=0
		var maxbottom=0
		for(a=0;a<pointlist.length;a++){
			var newdist=fvleft.dot(pointlist[a])
			maxleft=Math.max(maxleft,newdist)
			var newdist=fvright.dot(pointlist[a])
			maxright=Math.max(maxright,newdist)
			var newdist=fvtop.dot(pointlist[a])
			maxtop=Math.max(maxtop,newdist)
			var newdist=fvbottom.dot(pointlist[a])
			maxbottom=Math.max(maxbottom,newdist)
		}

		var camdist=0
		var camcenter=new THREE.Vector3(0,0,0)

		if(fixedcamera){
			var lrcampos=combinefrustumvectors(fvleft.clone().multiplyScalar(maxleft),fvright.clone().multiplyScalar(maxright))
			var tbcampos=combinefrustumvectors(fvtop.clone().multiplyScalar(maxtop),fvbottom.clone().multiplyScalar(maxbottom))
			var lrlen=lrcampos.dot(invcamdir)
			var tblen=tbcampos.dot(invcamdir)

			if(lrlen<tblen){
				var addin=(maxleft+maxright)*(tblen/lrlen-1)/2
				lrcampos=combinefrustumvectors(fvleft.clone().multiplyScalar(maxleft+addin),fvright.clone().multiplyScalar(maxright+addin))

				lrlen=lrcampos.dot(invcamdir)
				addin+=(maxleft+maxright+addin*2)*(tblen/lrlen-1)/2
				lrcampos=combinefrustumvectors(fvleft.clone().multiplyScalar(maxleft+addin),fvright.clone().multiplyScalar(maxright+addin))

			}
			else{
				var addin=(maxtop+maxbottom)*(lrlen/tblen-1)/2
				tbcampos=combinefrustumvectors(fvtop.clone().multiplyScalar(maxtop+addin),fvbottom.clone().multiplyScalar(maxbottom+addin))

				tblen=tbcampos.dot(invcamdir)
				addin+=(maxtop+maxbottom+addin*2)*(lrlen/tblen-1)/2
				tbcampos=combinefrustumvectors(fvtop.clone().multiplyScalar(maxtop+addin),fvbottom.clone().multiplyScalar(maxbottom+addin))

			}

			camdist=lrcampos.dot(invcamdir)
			var camdiff=tbcampos.clone().sub(lrcampos)
			var lradjust=camup.clone().multiplyScalar(camdiff.dot(camup))
			var finalcampos=lrcampos.clone().add(lradjust)

			var centeroffset=camdir.clone().multiplyScalar(finalcampos.dot(invcamdir))
			camcenter=finalcampos.clone().add(centeroffset)

			camera = new THREE.PerspectiveCamera(perspectiveangle,canvas.width / canvas.height,Math.max(camdist-800,10),camdist+800)
			camera.setViewOffset(fw,fh,ox,oy,canvas.width,canvas.height)
			camera.position.set(finalcampos.x,finalcampos.y,finalcampos.z)
		}
		else{
			camdist=Math.max(camdist,frustumprojectionhelper(invcamdir,fvleft.clone().multiplyScalar(maxleft)))
			camdist=Math.max(camdist,frustumprojectionhelper(invcamdir,fvright.clone().multiplyScalar(maxright)))
			camdist=Math.max(camdist,frustumprojectionhelper(invcamdir,fvtop.clone().multiplyScalar(maxtop)))
			camdist=Math.max(camdist,frustumprojectionhelper(invcamdir,fvbottom.clone().multiplyScalar(maxbottom)))

			var finalcampos=invcamdir.clone().multiplyScalar(camdist)

			camera = new THREE.PerspectiveCamera(perspectiveangle,canvas.width / canvas.height,Math.max(camdist/5-800,10),camdist*3+800)
			camera.setViewOffset(fw,fh,ox,oy,canvas.width,canvas.height)
			camera.position.set(finalcampos.x,finalcampos.y,finalcampos.z)
		}

		controls = new THREE.OrbitControls(camera,renderer.domElement)
		controls.minDistance = camdist/5
		controls.maxDistance = camdist*3
		controls.enableKeys = false
		controls.center.set(camcenter.x,camcenter.y,camcenter.z)
		controls.enablePan=false

		if(ismobile){
			controls.zoomSpeed = 0.5
		}
	}
	else{
		var maxleft=0
		var maxright=0
		var maxtop=0
		var maxbottom=0
		for(a=0;a<pointlist.length;a++){
			var newleft=camleft.dot(pointlist[a])
			maxleft=Math.max(maxleft,newleft)
			maxright=Math.min(maxright,newleft)
			var newtop=camup.dot(pointlist[a])
			maxtop=Math.max(maxtop,newtop)
			maxbottom=Math.min(maxbottom,newtop)
		}
		var scalex=(maxleft-maxright)/(window.innerWidth-cutleft-cutright)
		var scaley=(maxtop-maxbottom)/(window.innerHeight-cuttop-cutbottom)
		var scale=Math.max(scalex,scaley)
		var xpadding=(window.innerWidth-cutleft-cutright)*(1-scalex/scale)
		var ypadding=(window.innerHeight-cuttop-cutbottom)*(1-scaley/scale)
		cutleft+=xpadding/2
		cutright+=xpadding/2
		cuttop+=ypadding/2
		cutbottom+=ypadding/2

		//console.log(cutleft,cutright,cuttop,cutbottom)
		camera = new THREE.OrthographicCamera(-maxleft-cutleft*scale,-maxright+cutright*scale,maxtop+cuttop*scale,maxbottom-cutbottom*scale,2000,5000 )
		var campos=invcamdir.multiplyScalar(3500)
		camera.position.set(campos.x,campos.y,campos.z)

		controls = new THREE.OrbitControls(camera,renderer.domElement)
		controls.minZoom = 0.5
		controls.maxZoom = 3
		controls.enableKeys = false
		controls.center.set(0,0,0)
		controls.enablePan=false

		if(ismobile){
			controls.zoomSpeed = 0.5
		}
	}
	if(fixedcamera){
		controls.enableRotate=false
		controls.enableZoom=false
		board.boardside="white"
	}
	if((board.mycolor=="black") != (board.boardside=="black")){
		board.reverseboard()
	}
}

function init() {
	make_style_selector()
	var ua = navigator.userAgent.toLowerCase()
	if(ua.indexOf("android") > -1 || ua.indexOf("iphone") > -1 || ua.indexOf("ipod") > -1 || ua.indexOf("ipad") > -1){
		ismobile=true
	}
	if(ua.indexOf("iphone") > -1 || ua.indexOf("ipod") > -1 || ua.indexOf("ipad") > -1){
		isidevice=true
		//document.body.ontouchstart=document.body.ontouchmove=document.body.ontouchend=document.body.ontouchcancel=document.body.ontouchforcechange=
		
		document.body.ongesturestart=document.body.ongesturechange=document.body.ongestureend=function(ev){
			ev.preventDefault()
		}
	}
	
	var fson=false
	if(ismobile && !isidevice){
		var fsbutton=document.createElement("button")
		fsbutton.className="navitem"
		fsbutton.innerHTML="Fullscreen"
		fsbutton.onclick=togglefs
		document.getElementById("menubar").appendChild(fsbutton)
	}
	function togglefs(){
		if(fson){
			document.exitFullscreen()
		}
		else{
			document.documentElement.requestFullscreen()
		}
		fson=!fson
	}
	
	/*
	document.body.onclick=document.body.onmousedown=document.body.onmouseup=document.body.onmousemove=function(ev){
		if(ev.target && (ev.target.nodeName=="BUTTON" || ev.target.nodeName=="INPUT" || ev.target.nodeName=="A" || ev.target.onclick)){
			
		}
		else{
			//console.log(ev)
			ev.preventDefault()
		}
	}
	*/
	loadSettings()

	canvas = document.getElementById("gamecanvas")

	scene = new THREE.Scene()

	renderer = new THREE.WebGLRenderer({canvas:canvas,antialias:antialiasing_mode})
	renderer.setSize( window.innerWidth,window.innerHeight )
	pixelratio=(window.devicePixelRatio||1)*scalelevel
	renderer.setPixelRatio(pixelratio)
	renderer.setClearColor(clearcolor,1)
	maxaniso=Math.min(renderer.getMaxAnisotropy()||1,16)

	window.addEventListener('resize',onWindowResize,false)
	window.addEventListener('keyup',onKeyUp,false)

	board.create(5,"white",true)
	board.initEmpty()
	rendererdone=true
	generateCamera()
	var geometry = new THREE.TorusGeometry(sq_size / 2 + 5,3,16,100)
	highlighter = new THREE.Mesh(geometry,materials.highlighter)
	highlighter.rotateX(Math.PI / 2)

	addressbarhack=document.getElementById("addressbarhack")

	canvas.addEventListener('mousedown',onDocumentMouseDown,false)
	canvas.addEventListener('mouseup',onDocumentMouseUp,false)
	canvas.addEventListener('mousemove',onDocumentMouseMove,false)
	canvas.addEventListener('contextmenu',function(e){e.preventDefault()},false)

	materials.updateBoardMaterials()
	materials.updatePieceMaterials()
}

function onWindowResize() {
	if(rendererdone){
		renderer.setSize(window.innerWidth,window.innerHeight)
		pixelratio=(window.devicePixelRatio||1)*scalelevel
		renderer.setPixelRatio(pixelratio)
		adjustsidemenu()

		generateCamera()

		$('#chat').css("top",($('nav').height() + 6)+"px")
		//$('#chat-toggle-button').css("top",($('nav').height() + 7)+"px")
		//$('#chat').height(window.innerHeight - $('nav').height() - 118)
		$('#floating').css("top",($('nav').height() + 6)+"px")
		//alert("info",$('nav').height())
	}
}

var dontanimate=false
var scenehash=0
var lastanimate=0
function animate() {
	adjustlayout()
	if(!dontanimate){
		controls.update()
		var newscenehash=floathashscene()
		var now=Date.now()
		if(scenehash!=newscenehash || lastanimate+1000<=now){
			scenehash=newscenehash
			lastanimate=now
			renderer.render(scene,camera)
		}
	}
	requestAnimationFrame(animate)
}

function adjustlayout(){
	if(document.getElementById("menubar").scrollHeight>50){
		$("#moremenu").show()
	}
	else{
		$("#moremenu").hide()
	}
}

function floathashscene(){
	var hash=0
	var multiplier=1
	updatepoint(camera.position)
	updatepoint(controls.center)
	update(camera.zoom)
	var a
	for(a=0;a<board.piece_objects.length;a++){
		updatepoint(board.piece_objects[a].position)
	}
	update(window.innerWidth)
	update(window.innerHeight)
	update(anisolevel)
	update(pixelratio)
	update(settingscounter)
	if(board.highlighted){
		updatepoint(highlighter.position)
	}
	function updatepoint(p){
		update(p.x)
		update(p.y)
		update(p.z)
	}
	function update(n){
		hash+=n*multiplier
		multiplier*=1.0010472219
	}
	return hash
}


function onDocumentMouseMove(e) {
	var x = e.clientX - canvas.offsetLeft
	var y = e.clientY - canvas.offsetTop
	mouse.x = (pixelratio * x / canvas.width) * 2 - 1
	mouse.y = -(pixelratio * y / canvas.height) * 2 + 1

	board.mousemove()
}

function onDocumentMouseDown(e) {
	var x = e.clientX - canvas.offsetLeft
	var y = e.clientY - canvas.offsetTop
	mouse.x = (pixelratio * x / canvas.width) * 2 - 1
	mouse.y = -(pixelratio * y / canvas.height) * 2 + 1

	if(e.button === 2){
		board.rightclick()
	}
	else if(e.button === 0) {
		if(board.movecount !== board.moveshown) {return}
		board.leftclick()
	}
	board.mousemove()
}

function onDocumentMouseUp(e) {
	if(e.button === 2){
		e.preventDefault()
		board.rightup()
	}
}

function onKeyUp(e) {
	switch(e.keyCode) {
		case 27://ESC
			board.showmove(board.moveshown,true)
			break

		case 38://UP
			stepback()
			break

		case 40://DOWN
			stepforward()
			break
	}
}

function output(e) {
	if(typeof DEBUG !== 'undefined' && DEBUG){
		console.log("output:" + e)
	}
}

function buttonclick() {
	var input = document.getElementById("input")
	var data = input.value
	input.value = ""
	server.send(data)
}

function togglescratch(){
	var rect=document.getElementById("scratchbutton").getBoundingClientRect()
	$("#scratchlist").css("top",(rect.top+36)+"px").css("left",rect.left+"px").toggle()
}
function scratchbutton(size) {
	if(board.observing) {server.send("Unobserve " + board.gameno)}
	if(board.scratch || board.observing) {
		board.clear()
		board.create(size,"white",true)
		board.initEmpty()
	}
}

function adjustsidemenu(notation,chat){
	var vertical=window.screen.width<window.screen.height
	var notationstore="shownotation"+(vertical?"v":"h")
	var chatstore="showchat"+(vertical?"v":"h")
	
	var notationstate=localStorage[notationstore]
	if(notation=="show"){
		notationstate="show"
	}
	else if(notation=="hide"){
		notationstate="hide"
	}
	else if(notation=="toggle"){
		notationstate=notationstate=="show"?"hide":"show"
	}
	else{
		if(!(notationstate=="show" || notationstate=="hide")){
			notationstate=(window.innerWidth<600?"hide":"show")
		}
	}
	localStorage[notationstore]=notationstate
	if($('#rmenu').hasClass('hidden')){
		if(notationstate=="show"){
			$('#notation-toggle-text').html('&lt;&lt;<br>n<br>o<br>t<br>a<br>t<br>i<br>o<br>n')
			$('#notation-toggle-text').css("left","202px")
			$('#rmenu').removeClass('hidden')
			generateCamera()
		}
	}
	else if(notationstate=="hide"){
		$('#rmenu').addClass('hidden')
		$('#notation-toggle-text').html('&gt;&gt;<br>n<br>o<br>t<br>a<br>t<br>i<br>o<br>n')
		$('#notation-toggle-text').css("left","-5px")
		generateCamera()
	}
	
	var chatstate=localStorage[chatstore]
	if(chat=="show"){
		chatstate="show"
	}
	else if(chat=="hide"){
		chatstate="hide"
	}
	else if(chat=="toggle"){
		chatstate=chatstate=="show"?"hide":"show"
	}
	else{
		if(!(chatstate=="show" || chatstate=="hide")){
			chatstate=(window.innerWidth<600?"hide":"show")
		}
	}
	localStorage[chatstore]=chatstate
	if($('#cmenu').hasClass('hidden')){
		if(chatstate=="show"){
			$('#chat-toggle-button').css('right',chathandler.chat_width+16)
			$('#chat-toggle-button').html('&gt;&gt;<br>c<br>h<br>a<br>t')
			$('#cmenu').removeClass('hidden')
			generateCamera()
		}
	}
	else if(chatstate=="hide"){
		$('#chat-toggle-button').css('right',"-5px")
		$('#chat-toggle-button').html('&lt;&lt;<br>c<br>h<br>a<br>t')
		$('#cmenu').addClass('hidden')
		generateCamera()
	}
	infobar()
}
function rmenu() {
	if($('#rmenu').hasClass('hidden')) {showrmenu()}
	else{hidermenu()}
}

function showrmenu() {
	$('#notation-toggle-text').html('&lt;&lt;<br>n<br>o<br>t<br>a<br>t<br>i<br>o<br>n')
	$('#notation-toggle-text').css("left","202px")
	$('#rmenu').removeClass('hidden')
	if(fixedcamera || true){
		generateCamera()
	}
}

function hidermenu() {
	$('#rmenu').addClass('hidden')
	$('#notation-toggle-text').html('&gt;&gt;<br>n<br>o<br>t<br>a<br>t<br>i<br>o<br>n')
	$('#notation-toggle-text').css("left","-5px")
	if(fixedcamera || true){
		generateCamera()
	}
}

function zoom(out) {
	console.log('zoom',out,controls)
	if(out) {controls.constraint.dollyOut(1.5)}
	else{controls.constraint.dollyIn(1.5)}
}

function load() {
	$('#loadmodal').modal('hide')
	if(!board.scratch && !board.observing) {
		alert('warning',"TPS/PTN won't be displayed in the middle of an online game")
		return
	}

	server.unobserve()

	var text = $('#loadptntext').val()

	var tpsRE = /\[(TPS\s*)?\"?\s*([,x12345678SC\/]+)(\s+([\d+]))?(\s+(\d+|-))?\s*\"?\s*\]/
	var tps = tpsRE.exec(text)

	dontanimate = true

	if(!tps) {board.loadptn(text)}
	else{board.loadtps(text)}

	dontanimate = false

	$('#loadptntext').val('')
}

function loadptn(text) {
	$('#loadmodal').modal('hide')
	var files = $('#loadptnfile')[0].files
	if(files.length == 0) {return}
	var reader = new FileReader()
	reader.onload = function(txt) {
		server.unobserve()
		board.loadptn(reader.result)
	}
	reader.readAsText(files[0])
}
/*
function volume_change() {
	var movesound = document.getElementById("move-sound")
	var chimesound = document.getElementById("chime-sound")
	var hurrysound = document.getElementById("hurry-sound")

	if(localStorage["sound"]=="false") {
		movesound.muted = false
		chimesound.muted = false
		hurrysound.muted = false
		movesound.pause()
		movesound.currentTime=0
		movesound.play()
		localStorage.setItem('sound','true')
		document.getElementById("soundoff").display="none"
		document.getElementById("soundon").display="inline-block"
	}
	else{
		movesound.muted = true
		chimesound.muted = true
		hurrysound.muted = true

		localStorage.setItem('sound','false')
		document.getElementById("soundoff").display="inline-block"
		document.getElementById("soundon").display="none"
	}
}
*/
function turnsoundon(){
	var movesound = document.getElementById("move-sound")
	var chimesound = document.getElementById("chime-sound")
	var hurrysound = document.getElementById("hurry-sound")
	movesound.muted = false
	chimesound.muted = false
	hurrysound.muted = false
	movesound.currentTime=0
	movesound.play()
	localStorage.setItem('sound','true')
	document.getElementById("soundoff").style.display="none"
	document.getElementById("soundon").style.display="inline-block"
}
function turnsoundoff(){
	var movesound = document.getElementById("move-sound")
	var chimesound = document.getElementById("chime-sound")
	var hurrysound = document.getElementById("hurry-sound")
	movesound.muted = true
	chimesound.muted = true
	hurrysound.muted = true
	localStorage.setItem('sound','false')
	document.getElementById("soundoff").style.display="inline-block"
	document.getElementById("soundon").style.display="none"
}

function isBreakpoint( alias ) {
	return $('.device-' + alias).is(':hidden')
}

var haveplayedhurry=false
function startTime(fromFn) {
	if(typeof fromFn === 'undefined' && !server.timervar) {return}
	var t = invarianttime()
	var elapsed = t-lastTimeUpdate
	var t1
	var nextupdate
	var ismymove=board.checkifmymove()
	var t1f=lastWt
	var t2f=lastBt

	if(board.movecount%2 === 0) {
		t1f=Math.max(lastWt - elapsed,0)
		t1=t1f
	}
	else{
		t2f=Math.max(lastBt - elapsed,0)
		t1=t2f
	}
	nextupdate=((t1-1)%100)+1
	settimers(t1f,t2f)
	if(t1<=10000 && ismymove && !haveplayedhurry){
		haveplayedhurry=true
		var hurrysound = document.getElementById("hurry-sound")
		//hurrysound.pause()
		hurrysound.currentTime=0
		hurrysound.play()
	}
	if(!ismymove){
		haveplayedhurry=false
	}
	clearTimeout(server.timervar)
	server.timervar = setTimeout(startTime,nextupdate)
}

function stopTime() {
	clearTimeout(server.timervar)
	server.timervar = null
}

function settimers(p1t,p2t,nohurry){
	$('.player1-time:first').html(formatTime(p1t))
	$('.player2-time:first').html(formatTime(p2t))
	if(p1t<=10000 && !nohurry){
		$('.player1-time:first').addClass("hurrytime")
	}
	else{
		$('.player1-time:first').removeClass("hurrytime")
	}
	if(p2t<=10000 && !nohurry){
		$('.player2-time:first').addClass("hurrytime")
	}
	else{
		$('.player2-time:first').removeClass("hurrytime")
	}
}
function getZero(t) {
	return t<10?'0'+t:t
}
function formatTime(t){
	if(t<0){
		t=0
	}
	if(t>59900){
		var st=Math.ceil(t/1000)
		return Math.floor(st/60)+':'+getZero(st%60)
	}
	else{
		var dst=Math.ceil(t/100)
		return getZero(Math.floor(dst/10))+".<span style='font-size:70%;'>"+(dst%10)+"</span>"
	}
}



/*
 * Settings loaded on initialization. Try to keep them in the order of the window.
 * First the left-hand div, then the right-hand div.
 */
function loadSettings() {
	// Load theme
	var storedTheme = localStorage.getItem('theme') || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark-theme" : null);
	if (storedTheme === 'dark-theme'){
		var body = document.body;
		body.classList.add(storedTheme);
		document.getElementById('dark-mode').checked = true;
		if(!localStorage.getItem('clearcolor')) {
			console.log('no color')
			localStorage.setItem('clearcolor', '#152028');
			document.getElementById("clearcolorbox").value = '#152028';
			clearcolorchange();
		}
	}
	
	// load the setting for wall orientation.
	if(localStorage.getItem('diagonal_walls')==='true') {
		document.getElementById('wall-orientation').checked = true
		diagonal_walls = true
	}

	// load the setting for piece size.
	if(localStorage.getItem('piece_size')!==null) {
		piece_size = parseInt(localStorage.getItem('piece_size'))
		document.getElementById('piece-size-display').innerHTML = piece_size
		document.getElementById('piece-size-slider').value = piece_size
	}

	// load the setting for displaying the table.
	if(localStorage.getItem('show_table')!==null) {
		show_table = JSON.parse(localStorage.getItem('show_table'));
		document.getElementById('show-table').checked = show_table;
	}

	// load white piece style.
	if(localStorage.getItem('piece_style_white3')!==null) {
		var styleName = localStorage.getItem('piece_style_white3')
		if(!piece_styles.hasOwnProperty(styleName)){
			styleName=Object.keys(piece_styles)[0]
		}
		materials.white_piece_style_name = styleName
		materials.white_cap_style_name = styleName
		document.getElementById('piece-style-white-' + styleName).checked = true
	}

	// load black piece style.
	if(localStorage.getItem('piece_style_black3')!==null) {
		var styleName = localStorage.getItem('piece_style_black3')
		if(!piece_styles.hasOwnProperty(styleName)){
			styleName=Object.keys(piece_styles)[Object.keys(piece_styles).length-1]
		}
		materials.black_piece_style_name = styleName
		materials.black_cap_style_name = styleName
		document.getElementById('piece-style-black-' + styleName).checked = true
	}

	// load black board style.
	if(localStorage.getItem('board_style_black2')!==null) {
		var styleName = localStorage.getItem('board_style_black2')
		if(black_square_styles.indexOf(styleName)==-1){
			styleName=black_square_styles[0]
		}
		materials.black_sqr_style_name = styleName
		document.getElementById('board-style-black-' + styleName).checked = true
	}

	// load white board style.
	if(localStorage.getItem('board_style_white2')!==null) {
		var styleName = localStorage.getItem('board_style_white2')
		if(white_square_styles.indexOf(styleName)==-1){
			styleName=white_square_styles[0]
		}
		materials.white_sqr_style_name = styleName
		document.getElementById('board-style-white-' + styleName).checked = true
	}

	// load the setting for antialiasing.
	if(localStorage.getItem('antialiasing_mode')==='false') {
		document.getElementById('antialiasing-checkbox').checked = false
		antialiasing_mode = false
	}

	sliderAniso(+localStorage['aniso']>=0?+localStorage['aniso']:3)
	sliderScale(+localStorage['scale']>=0?+localStorage['scale']:2)

	if(localStorage.getItem('fixedcamera')==='false') {
		fixedcamera=false
	}
	else if(localStorage.getItem('fixedcamera')==='true') {
		fixedcamera=true
	}
	else{
		fixedcamera=ismobile
	}
	document.getElementById('fix-camera-checkbox').checked = fixedcamera

	if(localStorage.getItem('clickthrough')==='false') {
		clickthrough=false
	}
	document.getElementById('click-checkbox').checked = clickthrough
	
	if(localStorage.getItem('hovertext')==='false') {
		hovertext=false
	}
	else if(localStorage.getItem('hovertext')==='true') {
		hovertext=true
	}
	else{
		hovertext=!ismobile
	}
	document.getElementById('hover-checkbox').checked = hovertext

	// load whether or not the 'Send' button should be hidden.
	if(localStorage.getItem('hide-send')==='true') {
		document.getElementById('hide-send-checkbox').checked = true
		document.getElementById('send-button').style.display = "none"
		//$('#chat').height(window.innerHeight - $('nav').height() - 51)
	}

	chathandler.adjustChatWidth(+localStorage.getItem('chat_size')||180)
	adjustsidemenu()

	perspective=localStorage.getItem("perspective")
	if(!perspective){
		if(ismobile){
			perspective=0
		}
		else{
			perspective=90
		}
	}
	perspective=+perspective
	document.getElementById('perspective-display').innerHTML=+perspective
	document.getElementById('perspective-slider').value=perspective

	//load setting for hide chat time
	if(localStorage.getItem('hide-chat-time')==='true') {
		document.getElementById('hide-chat-time').checked = true
		$('.chattime').each(function(index) {
			$(this).addClass('hidden')
		})
	}

	// load the setting for automatically rotating the board, when assigned player 2.
	if(localStorage.getItem('auto_rotate')==='false') {
		document.getElementById('auto-rotate-checkbox').checked = false
	}
	
	document.getElementById("clearcolorbox").value=localStorage["clearcolor"]||"#dddddd"
	clearcolorchange()
}

/*
 * Notify checkbox change for checkbox:
 *	 Dark Mode
 */
function checkboxDarkMode() {
	var body = document.body;
	// Handle switching from light to dark
	if(document.getElementById('dark-mode').checked) {
		localStorage.setItem('theme','dark-theme');
		// Add attribute to body
		body.classList.add('dark-theme');
		if(localStorage.getItem('clearcolor') === '#dddddd') {
			localStorage.removeItem('clearcolor');
			document.getElementById("clearcolorbox").value = '#152028'
			clearcolorchange();
		}
	}else {
		// Handle switching from dark to light
		if(localStorage.getItem('clearcolor') === '#152028'){
			localStorage.removeItem('clearcolor');
			document.getElementById("clearcolorbox").value = '#dddddd';
			clearcolorchange();
		}
		localStorage.setItem('theme','light-theme');
		body.classList.remove('dark-theme');
		body.classList.add('light-theme')
	}
}

/*
 * Notify checkbox change for checkbox:
 *	 Diagonal walls
 */
function checkboxDiagonalWalls() {
	if(document.getElementById('wall-orientation').checked) {
		localStorage.setItem('diagonal_walls','true')
		diagonal_walls = true
	}
	else{
		localStorage.setItem('diagonal_walls','false')
		diagonal_walls = false
	}
	board.updatepieces()
}

/*
 * Notify slider movement:
 *	 Piece size
 */
function sliderPieceSize(newSize) {
	if(parseInt(newSize)!=piece_size){
		localStorage.setItem('piece_size',newSize)
		document.getElementById('piece-size-display').innerHTML=newSize
		piece_size = parseInt(newSize)
		if(fixedcamera || true){
			generateCamera()
		}
	}
}

/*
 * Notify checkbox change for checkbox:
 *	 Show or hide table
 */
function showTable(event) {
	localStorage.setItem('show_table', event.target.checked);
	board.table.visible = event.target.checked
}

function perspectiveChange(newPerspective) {
	if(perspective != +newPerspective){
		localStorage.setItem('perspective',newPerspective)
		document.getElementById('perspective-display').innerHTML=newPerspective
		perspective = +newPerspective
		generateCamera()
	}
}

/*
 * Notify radio button check:
 *	 Piece style - white
 */
function radioPieceStyleWhite(styleName) {
	document.getElementById('piece-style-white-' + styleName).checked = true
	materials.white_piece_style_name = styleName
	materials.white_cap_style_name = styleName
	localStorage.setItem('piece_style_white3',styleName)
	board.updatepieces()
	settingscounter=(settingscounter+1)&15
}

/*
 * Notify radio button check:
 *	 Piece style - black
 */
function radioPieceStyleBlack(styleName) {
	document.getElementById('piece-style-black-' + styleName).checked = true
	materials.black_piece_style_name = styleName
	materials.black_cap_style_name = styleName
	localStorage.setItem('piece_style_black3',styleName)
	board.updatepieces()
	settingscounter=(settingscounter+1)&15
}

document.getElementById("piecetexture").onchange=gotnewtexturefile
function gotnewtexturefile(){
	var reader = new FileReader()
	if(this.files.length){
		reader.addEventListener("load",fileloaded,false)
		reader.readAsDataURL(this.files[0])
	}
	function fileloaded(){
		localStorage.nextpiecetexture=localStorage.nextpiecetexture||0
		localStorage["piecetexture"+localStorage.nextpiecetexture]=reader.result
		localStorage.nextpiecetexture=1-(+localStorage.nextpiecetexture)
		make_style_selector()
	}
}

/*
 * Notify radio button check:
 *	 Board style - black
 */
function radioBoardStyleBlack(styleName) {
	document.getElementById('board-style-black-' + styleName).checked = true
	materials.black_sqr_style_name = styleName
	localStorage.setItem('board_style_black2',styleName)
	board.updateboard()
	settingscounter=(settingscounter+1)&15
}

/*
 * Notify radio button check:
 *	 Board style - white
 */
function radioBoardStyleWhite(styleName) {
	document.getElementById('board-style-white-' + styleName).checked = true
	materials.white_sqr_style_name = styleName
	localStorage.setItem('board_style_white2',styleName)
	board.updateboard()
	settingscounter=(settingscounter+1)&15
}

/*
 * Notify checkbox change for checkbox:
 *	 Antialiasing
 */
function checkboxAntialiasing() {
	if(document.getElementById('antialiasing-checkbox').checked) {
		localStorage.setItem('antialiasing_mode','true')
	}
	else{
		localStorage.setItem('antialiasing_mode','false')
	}
}

function checkboxFixCamera() {
	if(document.getElementById('fix-camera-checkbox').checked) {
		localStorage.setItem('fixedcamera','true')
		fixedcamera=true
	}
	else{
		localStorage.setItem('fixedcamera','false')
		fixedcamera=false
	}
	generateCamera()
}

function checkboxClick() {
	if(document.getElementById('click-checkbox').checked) {
		localStorage.setItem('clickthrough','true')
		clickthrough=true
	}
	else{
		localStorage.setItem('clickthrough','false')
		clickthrough=false
	}
}

function checkboxHover() {
	if(document.getElementById('hover-checkbox').checked) {
		localStorage.setItem('hovertext','true')
		hovertext=true
	}
	else{
		localStorage.setItem('hovertext','false')
		hovertext=false
	}
}

function clearcolorchange(value){
	if( value && value.length < 7){ return; }
	var val = document.getElementById("clearcolorbox").value;
	localStorage["clearcolor"] = val;
	clearcolor = parseInt(val.replace('#', '0x'));
	if(renderer){
		renderer.setClearColor(clearcolor,1)
		settingscounter=(settingscounter+1)&15
	}
}


/*
 * Notify checkbox change for checkbox:
 *	 Hide 'Send' button
 */
function checkboxHideSend() {
	if(document.getElementById('hide-send-checkbox').checked) {
		localStorage.setItem('hide-send','true')
		document.getElementById('send-button').style.display = "none"
		//$('#chat').height(window.innerHeight - $('nav').height() - 51)
	}
	else{
		localStorage.setItem('hide-send','false')
		document.getElementById('send-button').style.display = "initial"
		//$('#chat').height(window.innerHeight - $('nav').height() - 85)
	}

}

/*
 * Notify checkbox change for checkbox:
 *	 Rotate board when player 2
 */
function checkboxAutoRotate() {
	if(document.getElementById('auto-rotate-checkbox').checked) {
		localStorage.setItem('auto_rotate','true')
	}
	else{
		localStorage.setItem('auto_rotate','false')
	}
}

function showPrivacyPolicy() {
	$('#help-modal').modal('hide')
	$('#privacy-modal').modal('show')
}

function getHeader(key,val) {
	return'['+key+' "'+val+'"]\r\n'
}

function getNotation() {
	var p1 = $('.player1-name:first').html()
	var p2 = $('.player2-name:first').html()
	var now = new Date()
	var dt = now.getFullYear()+'.'+(now.getMonth()+1)+'.'+now.getDate()+' '+now.getHours()+'.'+getZero(now.getMinutes())

	$('#download_notation').attr('download',p1+' vs '+p2+' '+dt+'.ptn')

	var res=''
	res += getHeader('Site','PlayTak.com')
	res += getHeader('Date',now.getFullYear()+'.'+(now.getMonth()+1)+'.'+now.getDate())
	res += getHeader('Player1',p1)
	res += getHeader('Player2',p2)
	res += getHeader('Size',board.size)
	res += getHeader('Komi',board.komi/2)
	res += getHeader('Flats',board.tottiles)
	res += getHeader('Caps',board.totcaps)
	res += getHeader('Result',board.result)
	res += '\r\n'

	$('#moveslist tr').each(function() {
		var line=""
		$('td',this).each(function() {
			var val = $(this).text()
			if(line && val){
				line += ' '
			}
			line += val
		})
		res += line+'\r\n'
	})

	return res
}

function downloadNotation() {
	$('#download_notation').attr('href','data:text/plain;charset=utf-8,'+encodeURIComponent(getNotation()))
}

function copyNotationLink() {
	var link = 'http://www.playtak.com/?load=' + encodeURIComponent(getNotation())

	var dummy = document.createElement("input")
	document.body.appendChild(dummy)

	dummy.value = link
	dummy.select()

	try{
		var successful = document.execCommand('copy')
		if(successful) {alert('success','Copied!')}
		else{alert('danger','Unable to copy!')}
	}
	catch(err) {
		alert('danger','Unable to copy!')
	}

	document.body.removeChild(dummy)
}

function sliderChatSize(newSize) {
	if(newSize!=localStorage['chat_size']){
		chathandler.adjustChatWidth(+newSize)
		localStorage.setItem('chat_size',newSize)
		//adjustsidemenu(null,"show")
		generateCamera()
	}
}

function sliderAniso(anisoin,lazy) {
	if(!lazy || localStorage['aniso']!=anisoin){
		anisolevel=[1,4,8,16][anisoin]
		localStorage['aniso']=anisoin
		$('#aniso-display').html(["Off","4x","8x","16x"][anisoin])
		$('#aniso-slider').val(anisoin)
		materials.updateBoardMaterials()
		materials.updatePieceMaterials()
	}
}

function sliderScale(scalein,lazy) {
	if(!lazy || localStorage['scale']!=scalein){
		scalelevel=[0.5,Math.SQRT1_2,1,Math.SQRT2,2][scalein]
		localStorage['scale']=scalein
		$('#scale-display').html(["0.5","0.7","1.0","1.4","2.0"][scalein])
		$('#scale-slider').val(scalein)
		onWindowResize()
	}
}

function undoButton() {
	if(board.scratch) {board.undo()}
	else{server.undo()}
}

function showresetpwd() {
	$('#login').modal('hide')
	$('#resetpwd-modal').modal('show')
}

function fastrewind() {
	board.showmove(board.movestart)
}

function stepback() {
	board.showmove(board.moveshown-1)
}

function stepforward() {
	board.showmove(board.moveshown+1)
}

function fastforward() {
	board.showmove(board.movecount)
}

function changeboardsize(){
	var size=document.getElementById("boardsize").value
	var piecescaps={
		"3":[10,0]
		,"4":[15,0]
		,"5":[21,1]
		,"6":[30,1]
		,"7":[40,2]
		,"8":[50,2]
	}[size]
	if(piecescaps){
		document.getElementById("piececount").value=piecescaps[0]
		document.getElementById("capcount").value=piecescaps[1]
	}
}

function dohovertext(ev){
	var el=document.getElementById("hovertext")
	el.style.left=ev.clientX+"px"
	el.style.top=(ev.clientY+50)+"px"
	var target=ev.target
	var hoverstring=""
	while(target){
		if(target.dataset && target.dataset.hasOwnProperty("hover")){
			hoverstring=target.dataset.hover
			break
		}
		target=target.parentNode
	}
	if(hoverstring && hovertext){
		el.style.display="block"
		el.textContent=hoverstring
	}
	else{
		el.style.display="none"
	}
}
document.body.onmousemove=dohovertext

$(document).ready(function() {
	if(localStorage.getItem('sound')==='false') {
		turnsoundoff()
	}
	chathandler.init()
	if(location.search.slice(0,6)===('?load=')) {
		var text = decodeURIComponent(location.search.split('?load=')[1])
		$('#loadptntext').val(text.replace(/\n/g,' '))
		document.title = "Tak Review"
		load()
	}
	else if(localStorage.getItem('keeploggedin')==='true') {
		server.connect()
	}
	else{
		server.connect()
		$('#login').modal('show')
	}
	fetchratings()
	infobar()
})
