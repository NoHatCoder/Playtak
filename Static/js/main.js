function alert(type, msg) {
	$('#alert-text').text(msg);
	var $alert = $('#alert');
	$alert.removeClass("alert-success alert-info alert-warning alert-danger");

	$alert.addClass("alert-"+type);
	$alert.removeClass('hidden');
	$alert.stop(true, true);
	$alert.fadeTo(4000, 500).slideUp(500, function() {
		$alert.addClass('hidden');
	});
	alert2(type, msg);
}

function alert2(type, msg) {
	$('#alert-text2').text(msg);
	var $alert = $('#alert2');
	$alert.removeClass("alert-success alert-info alert-warning alert-danger");

	$alert.addClass("alert-"+type);
	$alert.removeClass('hidden');
	$alert.stop(true, true);
	$alert.fadeTo(4000, 500).slideUp(500, function() {
		$alert.addClass('hidden');
	});
}

var camera, scene, renderer, light, canvas, controls = null;
var perspective
var ismobile=false
var fixedcamera=false
var clickthrough=true
var pixelratio=1
var rendererdone=false

// antialiasing must be disabled per default, so slower devices are not impaired.
var antialiasing_mode = true;

var botlist = {
	"Tiltak_Bot": [0, "Very&nbsp;Hard"],
	"TakticianBot": [2, "Very&nbsp;Hard"],
	"TakkerusBot": [5, "Very&nbsp;Hard"],
	"alphatak_bot": [10, "Hard"],
	"AaaarghBot": [15, "Hard"],
	"ShlktBot": [20, "Intermediate"],
	"IntuitionBot": [25, "Intermediate"],
	"takkybot": [30, "Easy"],
	"BeginnerBot": [40, "Beginner"],
	"FriendlyBot": [50, "Adjustable"],
	"TakticianBotDev": [60, "Experimental"],
	"FPABot":[65, "Experimental"],
	"alphabot": [70, "Experimental"],
	"cutak_bot": [80, "Experimental"]
};

init();
$(window).on("load", animate);

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

function generateCamera(){
	if(!rendererdone){
		return
	}
	var cuttop=37+10
	var cutleft=($('#rmenu').hasClass('hidden')?0:209)+10
	var cutright=($('#chat').hasClass('hidden')?0:6+(+localStorage.getItem('chat_size')||180))+10
	var cutbottom=0+10
	
	/*
	var cuttop=0
	var cutleft=0
	var cutright=0
	var cutbottom=0
	*/
	
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
	var camdir=new THREE.Vector3(4,-25,-25).normalize()
	var invcamdir=camdir.clone().negate()
	var up=new THREE.Vector3(0,1,0)
	var camleft=new THREE.Vector3()
	camleft.crossVectors(up,camdir).normalize()
	var camup=new THREE.Vector3()
	camup.crossVectors(camdir,camleft).normalize()
	var camright=camleft.clone().negate()
	var camdown=camup.clone().negate()
	//console.log(camleft)
	//console.log(camup)
	if(perspective>0){
		var scaletop=Math.tan(perspective*Math.PI/360/2)
		var scalebottom=scaletop-scaletop*2*cutbottom/window.innerHeight
		var scaleleft=scaletop*window.innerWidth/window.innerHeight
		var scaleright=scaleleft-scaleleft*2*cutright/window.innerWidth
		scaletop-=scaletop*2*cuttop/window.innerHeight
		scaleleft-=scaleleft*2*cutleft/window.innerWidth
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
		console.log(maxleft,maxright,maxtop,maxbottom)
		console.log(fvtop,fvbottom,fvleft,fvright)
		var lrcampos=combinefrustumvectors(fvleft.clone().multiplyScalar(maxleft),fvright.clone().multiplyScalar(maxright))
		var tbcampos=combinefrustumvectors(fvtop.clone().multiplyScalar(maxtop),fvbottom.clone().multiplyScalar(maxbottom))
		var lrlen=lrcampos.dot(invcamdir)
		var tblen=tbcampos.dot(invcamdir)
		
		console.log(lrcampos.dot(invcamdir),tbcampos.dot(invcamdir))
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
		
		console.log(lrcampos.dot(invcamdir),tbcampos.dot(invcamdir))
		var camdiff=tbcampos.clone().sub(lrcampos)
		var lradjust=camup.clone().multiplyScalar(camdiff.dot(camup))
		var finalcampos=lrcampos.clone().add(lradjust)
		

		var centeroffset=camdir.clone().multiplyScalar(finalcampos.dot(invcamdir))
		var camcenter=finalcampos.clone().add(centeroffset)
		
		camera = new THREE.PerspectiveCamera(perspective/2, canvas.width / canvas.height, Math.max(lrlen-2000,1),lrlen+2000);
		camera.position.set(finalcampos.x,finalcampos.y,finalcampos.z);
		
		
		/*
		var bonusdistance=((1100+perspective*perspective/200)/1000)*0.65*(1.5+0.2*(Math.max(5,board.size)-5))/(Math.min(window.innerWidth/2/window.innerHeight,1))
		camera = new THREE.PerspectiveCamera(perspective/2, canvas.width / canvas.height, 5000/perspective, 500000/perspective);
		camera.position.set(-bonusdistance*8000/perspective, bonusdistance*50000/perspective+150-perspective, bonusdistance*50000/perspective);
		*/
		
		controls = new THREE.OrbitControls(camera, renderer.domElement);
		//controls = new THREE.OrbitControls(camera,document.getElementById("addressbarhack"))
		controls.minDistance = 20000/perspective;
		controls.maxDistance = 300000/perspective;
		controls.enableKeys = false;
		controls.center.set(camcenter.x,camcenter.y,camcenter.z)
		controls.enablePan=false
		
		if(ismobile){
			controls.zoomSpeed = 0.5;
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
		var scalex=(window.innerWidth-cutleft-cutright)/(maxleft-maxright)
		var scaley=(window.innerHeight-cuttop-cutbottom)/(maxtop-maxbottom)
		var scale=Math.min(scalex,scaley)
		var xpadding=(maxleft-maxright)*(1-scale/scalex)
		var ypadding=(maxtop-maxbottom)*(1-scale/scaley)
		cutleft+=xpadding/2
		cutright+=xpadding/2
		cuttop+=ypadding/2
		cutbottom+=ypadding/2
		//var zoomout=(300+40*(Math.max(5,board.size)-5))*1.1
		/*
		var effectiveheight=Math.min(window.innerWidth/2,window.innerHeight)
		camera = new THREE.OrthographicCamera( -zoomout*window.innerWidth/effectiveheight, zoomout*window.innerWidth/effectiveheight, zoomout*window.innerHeight/effectiveheight, -zoomout*window.innerHeight/effectiveheight, 1, 8000 );
		*/
		//console.log(maxleft,maxright,maxtop,maxbottom)
		//console.log(pointlist)
		camera = new THREE.OrthographicCamera(-maxleft-cutleft/scale,-maxright+cutright/scale,maxtop+cuttop/scale,maxbottom-cutbottom/scale, 2500, 5000 );
		camera.position.set(-400, 2500, 2500);
		
		controls = new THREE.OrbitControls(camera, renderer.domElement);
		//controls = new THREE.OrbitControls(camera,document.getElementById("addressbarhack"))
		controls.minZoom = 0.5;
		controls.maxZoom = 3;
		controls.enableKeys = false;
		//controls.center.set(0,150,0)
		controls.center.set(0,0,0)
		controls.enablePan=false
		
		if(ismobile){
			controls.zoomSpeed = 0.5;
		}
	}
	if(fixedcamera){
		controls.enableRotate=false
		controls.enableZoom=false
	}
	board.boardside="white"
	if ((board.mycolor=="black") != (board.boardside=="black")){
		board.reverseboard();
	}
}

function init() {
	//setTimeout("window.scrollTo(0,0)",3000)
	//setTimeout("window.scrollTo(0,1000)",5000)
	//document.getElementById("scratchsize").innerHTML=window.innerHeight+":"+window.outerHeight+":"+window.locationbar.visible+":"+window.menubar.visible+":"+window.statusbar.visible+":"+window.toolbar.visible
	/*
	window.location="#"+window.innerWidth+":"+window.innerHeight+":"+window.devicePixelRatio
	*/
	make_style_selector();
	// load the user settings.
	var ua = navigator.userAgent.toLowerCase();
	if (ua.indexOf("android") > -1 || ua.indexOf("iphone") > -1 || ua.indexOf("ipod") > -1 || ua.indexOf("ipad") > -1){
		//controls.zoomSpeed = 0.5;
		ismobile=true
	}
	loadSettings();

	canvas = document.getElementById("gamecanvas");
	//canvas.width = pixelwidth;
	//canvas.height = pixelheight;

/*
	//camera = new THREE.PerspectiveCamera(70, canvas.width / canvas.height, 1, 2000);
	camera = new THREE.PerspectiveCamera(10, canvas.width / canvas.height, 1, 2000);
	//camera = new THREE.OrthographicCamera( window.innerWidth / - 2, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight / - 2, 1, 2000 );
	camera.position.set(0, canvas.width / 2, canvas.height / 2);
	//camera.updateProjectionMatrix();
*/
	scene = new THREE.Scene();

	renderer = new THREE.WebGLRenderer({canvas: canvas,antialias: antialiasing_mode});
	//renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize( window.innerWidth, window.innerHeight );
	pixelratio=window.devicePixelRatio||1
	renderer.setPixelRatio(pixelratio)
	//renderer.setSize( 800, 640);
	renderer.setClearColor(0xdddddd, 1);

	//document.body.appendChild(renderer.domElement);
	
	//canvas.style.width=window.innerWidth+"px"
	//canvas.style.height=window.innerHeight+"px"

	window.addEventListener('resize', onWindowResize, false);
	window.addEventListener('keyup', onKeyUp, false);
/*
	controls = new THREE.OrbitControls(camera, renderer.domElement);
	controls.minDistance = 200;
	controls.maxDistance = 1500;
	controls.enableKeys = false;
	
	if(ismobile){
		controls.zoomSpeed = 0.5;
	}
*/
	board.create(5, "white", true);
	board.initEmpty();
	rendererdone=true
	generateCamera()
	var geometry = new THREE.TorusGeometry(sq_size / 2 + 5, 3, 16, 100);
	//geometry.vertices.shift();
	highlighter = new THREE.Mesh(geometry, materials.highlighter);
	highlighter.rotateX(Math.PI / 2);
	
	addressbarhack=document.getElementById("addressbarhack")
	
	canvas.addEventListener('mousedown', onDocumentMouseDown, false);
	canvas.addEventListener('mouseup', onDocumentMouseUp, false);
	canvas.addEventListener('mousemove', onDocumentMouseMove, false);
	canvas.addEventListener('contextmenu', function(e){e.preventDefault()}, false);
	/*
	addressbarhack.addEventListener('mousedown', onDocumentMouseDown, {passive:true});
	addressbarhack.addEventListener('mouseup', onDocumentMouseUp, {passive:true});
	addressbarhack.addEventListener('mousemove', onDocumentMouseMove, {passive:true});
	*/

	
	/*
	var a
	for(a=0;a<pointlist.length;a++){
		mat=new THREE.MeshBasicMaterial({color: 0xff0000})
		var geometry2 = new THREE.BoxGeometry(10,10,10);
		geometry2.center();
		var square2 = new THREE.Mesh(geometry2, mat);
		square2.position.set(pointlist[a].x,pointlist[a].y,pointlist[a].z);
		scene.add(square2);
	}
	*/
	
	materials.updateBoardMaterials();
	materials.updatePieceMaterials();
}

function onWindowResize() {
	//document.getElementById("scratchsize").innerHTML="r:"+window.innerHeight+":"+window.outerHeight+":"+window.locationbar.visible+":"+window.menubar.visible+":"+window.statusbar.visible+":"+window.toolbar.visible
	/*
	document.getElementById("scratchsize").innerHTML="r:"+window.innerWidth+":"+window.innerHeight+":"+window.devicePixelRatio
	window.location="#r:"+window.innerWidth+":"+window.innerHeight+":"+window.devicePixelRatio
	pixelwidth=Math.round((window.devicePixelRatio||1)*window.innerWidth)
	pixelheight=Math.round((window.devicePixelRatio||1)*window.innerHeight)
	*/
	//canvas.width = pixelwidth;
	//canvas.height = pixelheight;
	renderer.setSize(window.innerWidth, window.innerHeight);
	pixelratio=window.devicePixelRatio||1
	renderer.setPixelRatio(pixelratio)
	//canvas.style.width=window.innerWidth+"px"
	//canvas.style.height=window.innerHeight+"px"

	generateCamera()
	/*
	camera.aspect = canvas.width / canvas.height;
	camera.updateProjectionMatrix();
	*/

	$('#chat').offset({ top: $('nav').height() + 5 });
	$('#chat-toggle-button').offset({ top: $('nav').height() + 7 });
	$('#chat').height(window.innerHeight - $('nav').height() - 118);
	
	/*
	if(isBreakpoint('xs') || isBreakpoint('sm')) {
		chathandler.hidechat();
		hidermenu();
	} else {
		chathandler.showchat();
		showrmenu();
	}
	*/
}

var dontanimate=false;
function animate() {
	setTimeout(function () {
		if(!dontanimate){
			requestAnimationFrame(animate);
		}
	}, 1000 / 30);

	controls.update();
	renderer.render(scene, camera);
}


function onDocumentMouseMove(e) {
	//e.preventDefault();
	var x = e.clientX - canvas.offsetLeft;
	var y = e.clientY - canvas.offsetTop;
	mouse.x = (pixelratio * x / canvas.width) * 2 - 1;
	mouse.y = -(pixelratio * y / canvas.height) * 2 + 1;

	board.mousemove();
}

function onDocumentMouseDown(e) {
	//e.preventDefault();

	var x = e.clientX - canvas.offsetLeft;
	var y = e.clientY - canvas.offsetTop;
	mouse.x = (pixelratio * x / canvas.width) * 2 - 1;
	mouse.y = -(pixelratio * y / canvas.height) * 2 + 1;

	if (e.button === 2){
		board.rightclick();
	}
	else if (e.button === 0) {
		if(board.movecount !== board.moveshown)
			return;
		board.leftclick();
	}
	board.mousemove();
}

function onDocumentMouseUp(e) {
	if (e.button === 2){
		e.preventDefault()
		board.rightup();
	}
}

function onKeyUp(e) {
	switch(e.keyCode) {
		case 27://ESC
			board.showmove(board.moveshown,true);
			//stepback();
			//stepforward();
			break;

		case 38://UP
			stepback();
			break;

		case 40://DOWN
			stepforward();
			break;
	}
}

function output(e) {
	if (typeof DEBUG !== 'undefined' && DEBUG){
		console.log("output:" + e);
	}
}

function buttonclick() {
	var input = document.getElementById("input");
	var data = input.value;
	input.value = "";
	server.send(data);
}

function scratchbutton(size) {
	if (board.observing)
		server.send("Unobserve " + board.gameno);
	if (board.scratch || board.observing) {
		board.clear();
		board.create(size, "white", true);
		board.initEmpty();
	}
}
function rmenu() {
	if($('#rmenu').hasClass('hidden'))
		showrmenu();
	else
		hidermenu();
}

function showrmenu() {
	$('#notation-toggle-text').html('&lt;&lt;<br>n<br>o<br>t<br>a<br>t<br>i<br>o<br>n');
	$('#notation-toggle-text').css("left","202px")
	$('#rmenu').removeClass('hidden');
	if(fixedcamera){
		generateCamera()
	}
}

function hidermenu() {
	$('#rmenu').addClass('hidden');
	$('#notation-toggle-text').html('&gt;&gt;<br>n<br>o<br>t<br>a<br>t<br>i<br>o<br>n');
	$('#notation-toggle-text').css("left","-5px")
	if(fixedcamera){
		generateCamera()
	}
}

function zoom(out) {
	console.log('zoom', out, controls);
	if (out)
		controls.constraint.dollyOut(1.5);
	else
		controls.constraint.dollyIn(1.5);
}

function load() {
	$('#loadmodal').modal('hide')
	if (!board.scratch && !board.observing) {
		alert('warning', "TPS/PTN won't be displayed in the middle of an online game");
		return;
	}

	server.unobserve();

	var text = $('#loadptntext').val();

	var tpsRE = /\[(TPS\s*)?\"?\s*([,x12345678SC\/]+)(\s+([\d+]))?(\s+(\d+|-))?\s*\"?\s*\]/;
	var tps = tpsRE.exec(text);

	dontanimate = true;

	if(!tps)
		board.loadptn(text);
	else
		board.loadtps(text);

	dontanimate = false;

	$('#loadptntext').val('');
}

function loadptn(text) {
	$('#loadmodal').modal('hide')
	var files = $('#loadptnfile')[0].files;
	if(files.length == 0)
		return;
	var reader = new FileReader();
	reader.onload = function(txt) {
		server.unobserve();
		board.loadptn(reader.result);
	}
	reader.readAsText(files[0]);
}

function volume_change() {
	var movesound = document.getElementById("move-sound");
	var chimesound = document.getElementById("chime-sound");

	if($('#volume-img').hasClass('fa-volume-off')) {
		movesound.muted = false;
		chimesound.muted = false;

		movesound.play();
		localStorage.setItem('sound', 'true');
	} else {
		movesound.muted = true;
		chimesound.muted = true;

		localStorage.setItem('sound', 'false');
	}
	$('#volume-img').toggleClass('fa-volume-up fa-volume-off');
}

function isBreakpoint( alias ) {
	return $('.device-' + alias).is(':hidden');
}

function startTime(fromFn) {
	if(typeof fromFn === 'undefined' && !server.timervar)
		return;
	var now = new Date();
	var t = now.getHours()*60*60 + now.getMinutes()*60+now.getSeconds();
	var elapsed = t-lastTimeUpdate;

	if(board.movecount%2 === 0) {
		t1 = lastWt - elapsed;
		$('.player1-time:first').html(parseInt(t1/60)+':'+getZero(t1%60));
	} else {
		t2 = lastBt - elapsed;
		$('.player2-time:first').html(parseInt(t2/60)+':'+getZero(t2%60));
	}

	server.timervar = setTimeout(startTime, 500);
}

function stopTime() {
	clearTimeout(server.timervar);
	server.timervar = null;
}

function getZero(t) {
	return t<10?'0'+t:t;
}

/*
 * Settings loaded on initialization. Try to keep them in the order of the window.
 * First the left-hand div, then the right-hand div.
 */
function loadSettings() {
	// load the setting for wall orientation.
	if(localStorage.getItem('diagonal_walls')==='true') {
		document.getElementById('wall-orientation').checked = true;
		diagonal_walls = true;
	}

	// load the setting for piece size.
	if(localStorage.getItem('piece_size')!==null) {
		piece_size = parseInt(localStorage.getItem('piece_size'));
		document.getElementById('piece-size-display').innerHTML = piece_size;
		document.getElementById('piece-size-slider').value = piece_size;
	}

	// load white piece style.
	if (localStorage.getItem('piece_style_white2')!==null) {
		var styleName = localStorage.getItem('piece_style_white2');
		materials.white_piece_style_name = styleName;
		materials.white_cap_style_name = styleName;
		document.getElementById('piece-style-white-' + styleName).checked = true;
	}

	// load black piece style.
	if (localStorage.getItem('piece_style_black2')!==null) {
		var styleName = localStorage.getItem('piece_style_black2');
		materials.black_piece_style_name = styleName;
		materials.black_cap_style_name = styleName;
		document.getElementById('piece-style-black-' + styleName).checked = true;
	}

	// load black board style.
	if (localStorage.getItem('board_style_black2')!==null) {
		var styleName = localStorage.getItem('board_style_black2');
		materials.black_sqr_style_name = styleName;
		document.getElementById('board-style-black-' + styleName).checked = true;
	}

	// load white board style.
	if (localStorage.getItem('board_style_white2')!==null) {
		var styleName = localStorage.getItem('board_style_white2');
		materials.white_sqr_style_name = styleName;
		document.getElementById('board-style-white-' + styleName).checked = true;
	}

	// load the setting for antialiasing.
	if(localStorage.getItem('antialiasing_mode')==='false') {
		document.getElementById('antialiasing-checkbox').checked = false;
		antialiasing_mode = false;
	}
	
	if(localStorage.getItem('fixedcamera')==='false') {
		fixedcamera=false
	}
	else if(localStorage.getItem('fixedcamera')==='true') {
		fixedcamera=true
	}
	else{
		fixedcamera=ismobile
	}
	document.getElementById('fix-camera-checkbox').checked = fixedcamera;

	if(localStorage.getItem('clickthrough')==='false') {
		clickthrough=false
	}
	document.getElementById('click-checkbox').checked = clickthrough;

	// load whether or not the 'Send' button should be hidden.
	if (localStorage.getItem('hide-send')==='true')
	{
		document.getElementById('hide-send-checkbox').checked = true;
		document.getElementById('send-button').style.display = "none";
		$('#chat').height(window.innerHeight - $('nav').height() - 51);
	}
	
	document.getElementById("chat-size-slider").value=+localStorage.getItem('chat_size')||180
	document.getElementById("chat-size-display").innerHTML=+localStorage.getItem('chat_size')||180
	sliderChatSize(+localStorage.getItem('chat_size')||180)
	
	perspective=localStorage.getItem("perspective")
	if(!perspective){
		if(ismobile){
			perspective=0
		}
		else{
			perspective=140
		}
	}
	perspective=+perspective
	document.getElementById('perspective-display').innerHTML=+perspective;
	document.getElementById('perspective-slider').value=perspective

	//load setting for hide chat time
	if (localStorage.getItem('hide-chat-time')==='true')
	{
		document.getElementById('hide-chat-time').checked = true;
		$('.chattime').each(function(index) {
			$(this).addClass('hidden');
		});
	}

	// load the setting for automatically rotating the board, when assigned player 2.
	if(localStorage.getItem('auto_rotate')==='false') {
		document.getElementById('auto-rotate-checkbox').checked = false;
	}

	/*//load chat width.. doesnt work properly
	if(localStorage.getItem('chat-width')!==null) {
		chat_width = Number(localStorage.getItem('chat-width'));
		console.log('val====='+chat_width);
		adjustChatWidth();
	}*/
}

/*
 * Notify checkbox change for checkbox:
 *	 Diagonal walls
 */
function checkboxDiagonalWalls() {
	if (document.getElementById('wall-orientation').checked) {
		localStorage.setItem('diagonal_walls', 'true');
		diagonal_walls = true;
	} else {
		localStorage.setItem('diagonal_walls', 'false');
		diagonal_walls = false;
	}
	board.updatepieces();
}

/*
 * Notify slider movement:
 *	 Piece size
 */
function sliderPieceSize(newSize) {
	localStorage.setItem('piece_size', newSize);
	document.getElementById('piece-size-display').innerHTML=newSize;
	piece_size = parseInt(newSize);
	if(fixedcamera){
		generateCamera()
	}
}

function perspectiveChange(newPerspective) {
	localStorage.setItem('perspective', newPerspective);
	document.getElementById('perspective-display').innerHTML=newPerspective;
	perspective = +newPerspective;
	generateCamera()
}

/*
 * Notify radio button check:
 *	 Piece style - white
 */
function radioPieceStyleWhite(styleName) {
	document.getElementById('piece-style-white-' + styleName).checked = true;
	materials.white_piece_style_name = styleName;
	materials.white_cap_style_name = styleName;
	localStorage.setItem('piece_style_white2', styleName);
	board.updatepieces();
}

/*
 * Notify radio button check:
 *	 Piece style - black
 */
function radioPieceStyleBlack(styleName) {
	document.getElementById('piece-style-black-' + styleName).checked = true;
	materials.black_piece_style_name = styleName;
	materials.black_cap_style_name = styleName;
	localStorage.setItem('piece_style_black2', styleName);
	board.updatepieces();
}

/*
 * Notify radio button check:
 *	 Board style - black
 */
function radioBoardStyleBlack(styleName) {
	document.getElementById('board-style-black-' + styleName).checked = true;
	materials.black_sqr_style_name = styleName;
	localStorage.setItem('board_style_black2', styleName);
	board.updateboard();
}

/*
 * Notify radio button check:
 *	 Board style - white
 */
function radioBoardStyleWhite(styleName) {
	document.getElementById('board-style-white-' + styleName).checked = true;
	materials.white_sqr_style_name = styleName;
	localStorage.setItem('board_style_white2', styleName);
	board.updateboard();
}

/*
 * Notify checkbox change for checkbox:
 *	 Antialiasing
 */
function checkboxAntialiasing() {
	if (document.getElementById('antialiasing-checkbox').checked) {
		localStorage.setItem('antialiasing_mode', 'true');
	} else {
		localStorage.setItem('antialiasing_mode', 'false');
	}
}

function checkboxFixCamera() {
	if (document.getElementById('fix-camera-checkbox').checked) {
		localStorage.setItem('fixedcamera', 'true');
		fixedcamera=true
	} else {
		localStorage.setItem('fixedcamera', 'false');
		fixedcamera=false
	}
	generateCamera()
}

function checkboxClick() {
	if (document.getElementById('click-checkbox').checked) {
		localStorage.setItem('clickthrough', 'true');
		clickthrough=true
	} else {
		localStorage.setItem('clickthrough', 'false');
		clickthrough=false
	}
	//generateCamera()
}


/*
 * Notify checkbox change for checkbox:
 *	 Hide 'Send' button
 */
function checkboxHideSend() {
	if (document.getElementById('hide-send-checkbox').checked) {
		localStorage.setItem('hide-send', 'true');
		document.getElementById('send-button').style.display = "none";
		$('#chat').height(window.innerHeight - $('nav').height() - 51);
	} else {
		localStorage.setItem('hide-send', 'false');
		document.getElementById('send-button').style.display = "initial";
		$('#chat').height(window.innerHeight - $('nav').height() - 85);
	}

}

/*
 * Notify checkbox change for checkbox:
 *	 Rotate board when player 2
 */
function checkboxAutoRotate() {
	if (document.getElementById('auto-rotate-checkbox').checked) {
		localStorage.setItem('auto_rotate', 'true');
	} else {
		localStorage.setItem('auto_rotate', 'false');
	}
}

function showPrivacyPolicy() {
	$('#help-modal').modal('hide');
	$('#privacy-modal').modal('show');
}

function getHeader(key, val) {
	return '['+key+' "'+val+'"]\r\n';
}

function getNotation() {
	var p1 = $('.player1-name:first').html();
	var p2 = $('.player2-name:first').html();
	var now = new Date();
	var dt = (now.getYear()-100)+'.'+(now.getMonth()+1)+'.'+now.getDate()+' '+now.getHours()+'.'+getZero(now.getMinutes());

	$('#download_notation').attr('download', p1+' vs '+p2+' '+dt+'.ptn');

	var res='';
	res += getHeader('Site', 'PlayTak.com');
	res += getHeader('Date', '20'+(now.getYear()-100)+'.'+(now.getMonth()+1)+'.'+now.getDate());
	res += getHeader('Player1', p1);
	res += getHeader('Player2', p2);
	res += getHeader('Size', board.size);
	res += getHeader('Result', board.result);
	res += '\r\n';

	var count=1;

	$('#moveslist tr').each(function() {
		$('td', this).each(function() {
			var val = $(this).text();
			res += val;

			if(count%3 === 0)
				res += '\r\n';
			else
				res += ' ';

			count++;
		})
	});

	return res;
}

function downloadNotation() {
	$('#download_notation').attr('href', 'data:text/plain;charset=utf-8,'+encodeURIComponent(getNotation()));
}

function copyNotationLink() {
	var link = 'http://www.playtak.com/?load=' + encodeURIComponent(getNotation());

	var dummy = document.createElement("input");
	document.body.appendChild(dummy);

	dummy.value = link;
	dummy.select();

	try {
		var successful = document.execCommand('copy');
		if (successful)
			alert('success', 'Copied!');
		else
			alert('danger', 'Unable to copy!');
	} catch(err) {
		alert('danger', 'Unable to copy!');
	}

	document.body.removeChild(dummy);
}

function sliderChatSize(newSize) {
	chathandler.showchat();
	chathandler.adjustChatWidth(+newSize);
	localStorage.setItem('chat_size', newSize);
	if(fixedcamera){
		generateCamera()
	}
}

function undoButton() {
	if(board.scratch)
		board.undo();
	else
		server.undo();
}

function showresetpwd() {
	$('#login').modal('hide');
	$('#resetpwd-modal').modal('show');
}

function fastrewind() {
	board.showmove(board.movestart);
}

function stepback() {
	board.showmove(board.moveshown-1);
}

function stepforward() {
	board.showmove(board.moveshown+1);
}

function fastforward() {
	board.showmove(board.movecount);
}

$(document).ready(function() {
	if(localStorage.getItem('sound')==='false') {
		volume_change();
	}
	if(isBreakpoint('xs') || isBreakpoint('sm')) {
		chathandler.hidechat();
		hidermenu();
	} else {
		chathandler.showchat();
		showrmenu();
	}
	chathandler.init();
	if (location.search.startsWith('?load=')) {
		var text = decodeURIComponent(location.search.split('?load=')[1]);
		$('#loadptntext').val(text.replace(/\n/g, ' '));
		document.title = "Tak Review";
		load();
	} else if(localStorage.getItem('keeploggedin')==='true') {
		server.init();
	}
	//tour(false);
})
