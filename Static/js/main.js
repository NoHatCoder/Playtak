'use-strict';

let scalelevel;

function alert(type, msg) {
	$('#alert-text').text(msg);
	const $alert = $('#alert');
	$alert.removeClass('alert-success alert-info alert-warning alert-danger');

	$alert.addClass(`alert-${type}`);
	$alert.removeClass('hidden');
	$alert.stop(true, true);
	$alert.fadeTo(4000, 500).slideUp(500, () => {
		$alert.addClass('hidden');
	});
	alert2(type, msg);
}

function alert2(type, msg) {
	$('#alert-text2').text(msg);
	const $alert = $('#alert2');
	$alert.removeClass('alert-success alert-info alert-warning alert-danger');

	$alert.addClass(`alert-${type}`);
	$alert.removeClass('hidden');
	$alert.stop(true, true);
	$alert.fadeTo(4000, 500).slideUp(500, () => {
		$alert.addClass('hidden');
	});
}

let camera;
let scene;
let renderer;
let canvas;
let controls = null;

let perspective;
let ismobile = false;
let fixedcamera = false;
let clickthrough = true;
let pixelratio = 1;
let rendererdone = false;

let antialiasingMode = true;
let maxAniso = 1;
let anisoLevel = 16;

let settingscounter = 0;

// eslint-disable-next-line no-unused-vars
const botlist = { // Used-in-server.js
	Tiltak_Bot: [0, 'Very&nbsp;Hard'],
	TakticianBot: [2, 'Very&nbsp;Hard'],
	TakkerusBot: [5, 'Very&nbsp;Hard'],
	alphatak_bot: [10, 'Hard'],
	AaaarghBot: [15, 'Hard'],
	ShlktBot: [20, 'Intermediate'],
	IntuitionBot: [25, 'Intermediate'],
	takkybot: [30, 'Easy'],
	BeginnerBot: [40, 'Beginner'],
	FriendlyBot: [50, 'Adjustable'],
	TakticianBotDev: [60, 'Experimental'],
	FPABot: [65, 'Experimental'],
	alphabot: [70, 'Experimental'],
	cutak_bot: [80, 'Experimental'],
};

init();
$(window).on('load', animate);

function combinefrustumvectors(a, b) {
	const a2 = a.dot(a);
	const b2 = b.dot(b);
	const ab = a.dot(b);
	const a2b2 = a2 * b2;
	const div = a2b2 - ab * ab;
	const bmul = (a2b2 - a2 * ab) / div;
	const amul = (a2b2 - b2 * ab) / div;
	return a.clone().multiplyScalar(amul).addScaledVector(b, bmul);
}

function frustumprojectionhelper(invcam, fv) {
	return fv.dot(fv) / fv.dot(invcam);
}

function generateCamera() {
	if (!rendererdone) {
		return;
	}
	let cuttop = 37 + 10;
	let cutleft = ($('#rmenu').hasClass('hidden') ? 0 : 209) + 10;
	let cutright = ($('#chat').hasClass('hidden') ? 0 : 6 + (+localStorage.getItem('chat_size') || 180)) + 10;
	let cutbottom = 0 + 10;

	const pointlist = [];
	const xsizea = board.size * sqSize / 2 + borderSize + stackOffsetFromBorder + pieceSize;
	const xsizeb = (board.size - 1) * sqSize / 2 + pieceSize / 2;
	const yneg = sqHeight / 2;
	const yposa = 10 * pieceHeight - yneg;
	const yposb = 20 * pieceHeight + yneg;
	const zsizea = board.size * sqSize / 2 + borderSize;
	const zsizeb = xsizeb;
	let a; let b;
	for (a = -1; a < 2; a += 2) {
		for (b = -1; b < 2; b += 2) {
			pointlist.push(new THREE.Vector3(a * xsizea, -yneg, b * zsizea));
			pointlist.push(new THREE.Vector3(a * xsizea, yposa, b * zsizea));
			pointlist.push(new THREE.Vector3(a * xsizeb, yposb, b * zsizeb));
		}
	}
	let invcamdir;
	if (camera && !fixedcamera) {
		invcamdir = camera.position.clone().sub(controls.center).normalize();
	}
	else {
		invcamdir = new THREE.Vector3(-4, 25, 25).normalize();
	}
	const camdir = invcamdir.clone().negate();
	const up = new THREE.Vector3(0, 1, 0);
	const camleft = new THREE.Vector3();
	camleft.crossVectors(up, camdir).normalize();
	const camup = new THREE.Vector3();
	camup.crossVectors(camdir, camleft).normalize();
	const camright = camleft.clone().negate();
	const camdown = camup.clone().negate();
	if (perspective > 0) {
		const fw = pixelratio * (window.innerWidth + Math.abs(cutleft - cutright));
		const fh = pixelratio * (window.innerHeight + Math.abs(cuttop - cutbottom));
		const ox = pixelratio * (Math.max(0, cutright - cutleft));
		const oy = pixelratio * (Math.max(0, cutbottom - cuttop));
		const xv = pixelratio * (window.innerWidth - cutleft - cutright);
		const yv = pixelratio * (window.innerHeight - cuttop - cutbottom);
		const perspectiveheight = fh * perspective / (yv + xv) / 90;
		const perspectivewidth = perspectiveheight * fw / fh;
		const perspectiveangle = Math.atan(perspectiveheight) * 360 / Math.PI;
		const scaletop = perspectiveheight * yv / fh;
		const scalebottom = scaletop;
		const scaleleft = perspectivewidth * xv / fw;
		const scaleright = scaleleft;
		const fvtop = camup.clone().divideScalar(scaletop).add(invcamdir).normalize();
		const fvbottom = camdown.clone().divideScalar(scalebottom).add(invcamdir).normalize();
		const fvleft = camleft.clone().divideScalar(scaleleft).add(invcamdir).normalize();
		const fvright = camright.clone().divideScalar(scaleright).add(invcamdir).normalize();
		let maxleft = 0;
		let maxright = 0;
		let maxtop = 0;
		let maxbottom = 0;
		for (a = 0; a < pointlist.length; a += 1) {
			let newdist = fvleft.dot(pointlist[a]);
			maxleft = Math.max(maxleft, newdist);
			newdist = fvright.dot(pointlist[a]);

			maxright = Math.max(maxright, newdist);
			newdist = fvtop.dot(pointlist[a]);

			maxtop = Math.max(maxtop, newdist);
			newdist = fvbottom.dot(pointlist[a]);

			maxbottom = Math.max(maxbottom, newdist);
		}

		let camdist = 0;
		let camcenter = new THREE.Vector3(0, 0, 0);

		if (fixedcamera) {
			let lrcampos = combinefrustumvectors(fvleft.clone().multiplyScalar(maxleft), fvright.clone().multiplyScalar(maxright));
			let tbcampos = combinefrustumvectors(fvtop.clone().multiplyScalar(maxtop), fvbottom.clone().multiplyScalar(maxbottom));
			let lrlen = lrcampos.dot(invcamdir);
			let tblen = tbcampos.dot(invcamdir);

			if (lrlen < tblen) {
				let addin = (maxleft + maxright) * (tblen / lrlen - 1) / 2;
				lrcampos = combinefrustumvectors(fvleft.clone().multiplyScalar(maxleft + addin), fvright.clone().multiplyScalar(maxright + addin));

				lrlen = lrcampos.dot(invcamdir);
				addin += (maxleft + maxright + addin * 2) * (tblen / lrlen - 1) / 2;
				lrcampos = combinefrustumvectors(fvleft.clone().multiplyScalar(maxleft + addin), fvright.clone().multiplyScalar(maxright + addin));
			}
			else {
				let addin = (maxtop + maxbottom) * (lrlen / tblen - 1) / 2;
				tbcampos = combinefrustumvectors(fvtop.clone().multiplyScalar(maxtop + addin), fvbottom.clone().multiplyScalar(maxbottom + addin));

				tblen = tbcampos.dot(invcamdir);
				addin += (maxtop + maxbottom + addin * 2) * (lrlen / tblen - 1) / 2;
				tbcampos = combinefrustumvectors(fvtop.clone().multiplyScalar(maxtop + addin), fvbottom.clone().multiplyScalar(maxbottom + addin));
			}

			camdist = lrcampos.dot(invcamdir);
			const camdiff = tbcampos.clone().sub(lrcampos);
			const lradjust = camup.clone().multiplyScalar(camdiff.dot(camup));
			const finalcampos = lrcampos.clone().add(lradjust);

			const centeroffset = camdir.clone().multiplyScalar(finalcampos.dot(invcamdir));
			camcenter = finalcampos.clone().add(centeroffset);

			camera = new THREE.PerspectiveCamera(perspectiveangle, canvas.width / canvas.height, Math.max(camdist - 800, 10), camdist + 800);
			camera.setViewOffset(fw, fh, ox, oy, canvas.width, canvas.height);
			camera.position.set(finalcampos.x, finalcampos.y, finalcampos.z);
		}
		else {
			camdist = Math.max(camdist, frustumprojectionhelper(invcamdir, fvleft.clone().multiplyScalar(maxleft)));
			camdist = Math.max(camdist, frustumprojectionhelper(invcamdir, fvright.clone().multiplyScalar(maxright)));
			camdist = Math.max(camdist, frustumprojectionhelper(invcamdir, fvtop.clone().multiplyScalar(maxtop)));
			camdist = Math.max(camdist, frustumprojectionhelper(invcamdir, fvbottom.clone().multiplyScalar(maxbottom)));

			const finalcampos = invcamdir.clone().multiplyScalar(camdist);

			camera = new THREE.PerspectiveCamera(perspectiveangle, canvas.width / canvas.height, Math.max(camdist / 5 - 800, 10), camdist * 3 + 800);
			camera.setViewOffset(fw, fh, ox, oy, canvas.width, canvas.height);
			camera.position.set(finalcampos.x, finalcampos.y, finalcampos.z);
		}

		controls = new THREE.OrbitControls(camera, renderer.domElement);
		controls.minDistance = camdist / 5;
		controls.maxDistance = camdist * 3;
		controls.enableKeys = false;
		controls.center.set(camcenter.x, camcenter.y, camcenter.z);
		controls.enablePan = false;

		if (ismobile) {
			controls.zoomSpeed = 0.5;
		}
	}
	else {
		let maxleft = 0;
		let maxright = 0;
		let maxtop = 0;
		let maxbottom = 0;
		for (a = 0; a < pointlist.length; a += 1) {
			const newleft = camleft.dot(pointlist[a]);
			maxleft = Math.max(maxleft, newleft);
			maxright = Math.min(maxright, newleft);
			const newtop = camup.dot(pointlist[a]);
			maxtop = Math.max(maxtop, newtop);
			maxbottom = Math.min(maxbottom, newtop);
		}
		const scalex = (maxleft - maxright) / (window.innerWidth - cutleft - cutright);
		const scaley = (maxtop - maxbottom) / (window.innerHeight - cuttop - cutbottom);
		const scale = Math.max(scalex, scaley);
		const xpadding = (window.innerWidth - cutleft - cutright) * (1 - scalex / scale);
		const ypadding = (window.innerHeight - cuttop - cutbottom) * (1 - scaley / scale);
		cutleft += xpadding / 2;
		cutright += xpadding / 2;
		cuttop += ypadding / 2;
		cutbottom += ypadding / 2;

		console.log(cutleft, cutright, cuttop, cutbottom);
		camera = new THREE.OrthographicCamera(-maxleft - cutleft * scale, -maxright + cutright * scale, maxtop + cuttop * scale, maxbottom - cutbottom * scale, 2000, 5000);
		const campos = invcamdir.multiplyScalar(3500);
		camera.position.set(campos.x, campos.y, campos.z);

		controls = new THREE.OrbitControls(camera, renderer.domElement);
		controls.minZoom = 0.5;
		controls.maxZoom = 3;
		controls.enableKeys = false;
		controls.center.set(0, 0, 0);
		controls.enablePan = false;

		if (ismobile) {
			controls.zoomSpeed = 0.5;
		}
	}
	if (fixedcamera) {
		controls.enableRotate = false;
		controls.enableZoom = false;
		board.boardside = 'white';
	}
	if ((board.mycolor === 'black') !== (board.boardside === 'black')) {
		board.reverseboard();
	}
}

function init() {
	makeStyleSelector();
	const ua = navigator.userAgent.toLowerCase();
	if (ua.indexOf('android') > -1 || ua.indexOf('iphone') > -1 || ua.indexOf('ipod') > -1 || ua.indexOf('ipad') > -1) {
		ismobile = true;
	}
	loadSettings();

	canvas = document.getElementById('gamecanvas');

	scene = new THREE.Scene();

	renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: antialiasingMode });
	renderer.setSize(window.innerWidth, window.innerHeight);
	pixelratio = (window.devicePixelRatio || 1) * scalelevel;
	renderer.setPixelRatio(pixelratio);
	renderer.setClearColor(0xdddddd, 1);
	// eslint-disable-next-line no-unused-vars
	maxAniso = Math.min(renderer.getMaxAnisotropy() || 1, 16);

	window.addEventListener('resize', onWindowResize, false);
	window.addEventListener('keyup', onKeyUp, false);

	board.create(5, 'white', true);
	board.initEmpty();
	rendererdone = true;
	generateCamera();
	const geometry = new THREE.TorusGeometry(sqSize / 2 + 5, 3, 16, 100);
	highlighter = new THREE.Mesh(geometry, materials.highlighter);
	highlighter.rotateX(Math.PI / 2);

	canvas.addEventListener('mousedown', onDocumentMouseDown, false);
	canvas.addEventListener('mouseup', onDocumentMouseUp, false);
	canvas.addEventListener('mousemove', onDocumentMouseMove, false);
	canvas.addEventListener('contextmenu', (e) => { e.preventDefault(); }, false);

	materials.updateBoardMaterials();
	materials.updatePieceMaterials();
}

function onWindowResize() {
	if (rendererdone) {
		renderer.setSize(window.innerWidth, window.innerHeight);
		pixelratio = (window.devicePixelRatio || 1) * scalelevel;
		renderer.setPixelRatio(pixelratio);

		generateCamera();

		$('#chat').offset({ top: $('nav').height() + 5 });
		$('#chat-toggle-button').offset({ top: $('nav').height() + 7 });
		$('#chat').height(window.innerHeight - $('nav').height() - 118);
	}
}

let dontanimate = false;
let scenehash = 0;
let lastanimate = 0;
function animate() {
	if (!dontanimate) {
		controls.update();
		const newscenehash = floathashscene();
		const now = Date.now();
		if (scenehash !== newscenehash || lastanimate + 1000 <= now) {
			scenehash = newscenehash;
			lastanimate = now;
			renderer.render(scene, camera);
		}
	}
	requestAnimationFrame(animate);
}

function floathashscene() {
	let hash = 0;
	let multiplier = 1;
	updatepoint(camera.position);
	updatepoint(controls.center);
	update(camera.zoom);
	let a;
	for (a = 0; a < board.piece_objects.length; a += 1) {
		updatepoint(board.piece_objects[a].position);
	}
	update(window.innerWidth);
	update(window.innerHeight);
	update(anisoLevel);
	update(pixelratio);
	update(settingscounter);
	if (board.highlighted) {
		updatepoint(highlighter.position);
	}
	function updatepoint(p) {
		update(p.x);
		update(p.y);
		update(p.z);
	}
	function update(n) {
		hash += n * multiplier;
		multiplier *= 1.0010472219;
	}
	return hash;
}

function onDocumentMouseMove(e) {
	const x = e.clientX - canvas.offsetLeft;
	const y = e.clientY - canvas.offsetTop;
	mouse.x = (pixelratio * x / canvas.width) * 2 - 1;
	mouse.y = -(pixelratio * y / canvas.height) * 2 + 1;

	board.mousemove();
}

function onDocumentMouseDown(e) {
	const x = e.clientX - canvas.offsetLeft;
	const y = e.clientY - canvas.offsetTop;
	mouse.x = (pixelratio * x / canvas.width) * 2 - 1;
	mouse.y = -(pixelratio * y / canvas.height) * 2 + 1;

	if (e.button === 2) {
		board.rightclick();
	}
	else if (e.button === 0) {
		if (board.movecount !== board.moveshown) {
			return;
		}
		board.leftclick();
	}
	board.mousemove();
}

function onDocumentMouseUp(e) {
	if (e.button === 2) {
		e.preventDefault();
		board.rightup();
	}
}

function onKeyUp(e) {
	switch (e.keyCode) {
		case 27: // ESC
			board.showmove(board.moveshown, true);
			break;

		case 38: // UP
			stepback();
			break;

		case 40: // DOWN
			stepforward();
			break;

		default:
	}
}

// eslint-disable-next-line no-unused-vars
function output(e) {
	if (typeof DEBUG !== 'undefined' && DEBUG) {
		console.log(`output:${e}`);
	}
}

// eslint-disable-next-line no-unused-vars
function scratchbutton(size) {
	if (board.observing) {
		server.send(`Unobserve ${board.gameno}`);
	}
	if (board.scratch || board.observing) {
		board.clear();
		board.create(size, 'white', true);
		board.initEmpty();
	}
}
// eslint-disable-next-line no-unused-vars
function rmenu() {
	if ($('#rmenu').hasClass('hidden')) {
		showrmenu();
	}
	else {
		hidermenu();
	}
}

function showrmenu() {
	$('#notation-toggle-text').html('&lt;&lt;<br>n<br>o<br>t<br>a<br>t<br>i<br>o<br>n');
	$('#notation-toggle-text').css('left', '202px');
	$('#rmenu').removeClass('hidden');
	generateCamera();
}

function hidermenu() {
	$('#rmenu').addClass('hidden');
	$('#notation-toggle-text').html('&gt;&gt;<br>n<br>o<br>t<br>a<br>t<br>i<br>o<br>n');
	$('#notation-toggle-text').css('left', '-5px');
	generateCamera();
}

function load() {
	$('#loadmodal').modal('hide');
	if (!board.scratch && !board.observing) {
		alert('warning', 'TPS/PTN won\'t be displayed in the middle of an online game');
		return;
	}

	server.unobserve();

	const text = $('#loadptntext').val();

	const tpsRE = /\[(TPS\s*)?\"?\s*([,x12345678SC\/]+)(\s+([\d+]))?(\s+(\d+|-))?\s*\"?\s*\]/;
	const tps = tpsRE.exec(text);

	dontanimate = true;

	if (!tps) {
		board.loadptn(text);
	}
	else {
		board.loadtps(text);
	}

	dontanimate = false;

	$('#loadptntext').val('');
}

function volumeChange() {
	const movesound = document.getElementById('move-sound');
	const chimesound = document.getElementById('chime-sound');
	const hurrysound = document.getElementById('hurry-sound');

	if ($('#volume-img').hasClass('fa-volume-off')) {
		movesound.muted = false;
		chimesound.muted = false;
		hurrysound.muted = false;
		movesound.pause();
		movesound.currentTime = 0;
		movesound.play();
		localStorage.setItem('sound', 'true');
	} else {
		movesound.muted = true;
		chimesound.muted = true;
		hurrysound.muted = true;

		localStorage.setItem('sound', 'false');
	}
	$('#volume-img').toggleClass('fa-volume-up fa-volume-off');
}

function isBreakpoint(alias) {
	return $(`.device-${alias}`).is(':hidden');
}

let haveplayedhurry = false;
function startTime(fromFn) {
	if (typeof fromFn === 'undefined' && !server.timervar) {
		return;
	}
	const now = new Date();
	const t = now.getTime() / 1000;
	const elapsed = t - server.lastTimeUpdate;
	let t1;
	let nextupdate;
	const ismymove = board.checkifmymove();
	let t1f = server.lastWt;
	let t2f = server.lastBt;

	if (board.movecount % 2 === 0) {
		t1f = Math.max(server.lastWt - elapsed, 0);
		t1 = Math.ceil(t1f);
		nextupdate = 1000 * (1 - t1 + t1f);
		$('.player1-time:first').html(`${Math.floor(t1 / 60)}:${getZero(t1 % 60)}`);
		$('.player2-time:first').html(`${Math.floor(server.lastBt / 60)}:${getZero(server.lastBt % 60)}`);
	} else {
		t2f = Math.max(server.lastBt - elapsed, 0);
		t1 = Math.ceil(t2f);
		nextupdate = 1000 * (1 - t1 + t2f);
		$('.player2-time:first').html(`${Math.floor(t1 / 60)}:${getZero(t1 % 60)}`);
		$('.player1-time:first').html(`${Math.floor(server.lastWt / 60)}:${getZero(server.lastWt % 60)}`);
	}
	if (t1f <= 10) {
		$('.player1-time:first').addClass('hurrytime');
	}
	else {
		$('.player1-time:first').removeClass('hurrytime');
	}
	if (t2f <= 10) {
		$('.player2-time:first').addClass('hurrytime');
	}
	else {
		$('.player2-time:first').removeClass('hurrytime');
	}
	if (t1 === 10 && ismymove && !haveplayedhurry) {
		haveplayedhurry = true;
		const hurrysound = document.getElementById('hurry-sound');
		hurrysound.pause();
		hurrysound.currentTime = 0;
		hurrysound.play();
	}
	if (!ismymove) {
		haveplayedhurry = false;
	}
	clearTimeout(server.timervar);
	// eslint-disable-next-line no-unused-vars
	server.timervar = setTimeout(startTime, nextupdate);
}

// eslint-disable-next-line no-unused-vars
function stopTime() {
	clearTimeout(server.timervar);
	server.timervar = null;
}

function getZero(t) {
	return t < 10 ? `0${t}` : t;
}

/*
 * Settings loaded on initialization. Try to keep them in the order of the window.
 * First the left-hand div, then the right-hand div.
 */
function loadSettings() {
	// load the setting for wall orientation.
	if (localStorage.getItem('diagonal_walls') === 'true') {
		document.getElementById('wall-orientation').checked = true;
		diagonalWalls = true;
	}

	// load the setting for piece size.
	if (localStorage.getItem('piece_size') !== null) {
		pieceSize = parseInt(localStorage.getItem('piece_size'), 10);
		document.getElementById('piece-size-display').innerHTML = pieceSize;
		document.getElementById('piece-size-slider').value = pieceSize;
	}

	// load white piece style.
	if (localStorage.getItem('piece_style_white3') !== null) {
		let styleName = localStorage.getItem('piece_style_white3');
		if (!pieceStyles.hasOwnProperty(styleName)) {
			styleName = Object.keys(pieceStyles)[0];
		}
		materials.white_piece_style_name = styleName;
		materials.white_cap_style_name = styleName;
		document.getElementById(`piece-style-white-${styleName}`).checked = true;
	}

	// load black piece style.
	if (localStorage.getItem('piece_style_black3') !== null) {
		let styleName = localStorage.getItem('piece_style_black3');
		if (!pieceStyles.hasOwnProperty(styleName)) {
			styleName = Object.keys(pieceStyles)[Object.keys(pieceStyles).length - 1];
		}
		materials.black_piece_style_name = styleName;
		materials.black_cap_style_name = styleName;
		document.getElementById(`piece-style-black-${styleName}`).checked = true;
	}

	// load black board style.
	if (localStorage.getItem('board_style_black2') !== null) {
		let styleName = localStorage.getItem('board_style_black2');
		if (blackSquareStyles.indexOf(styleName) === -1) {
			styleName = blackSquareStyles[0];
		}
		materials.black_sqr_style_name = styleName;
		document.getElementById(`board-style-black-${styleName}`).checked = true;
	}

	// load white board style.
	if (localStorage.getItem('board_style_white2') !== null) {
		let styleName = localStorage.getItem('board_style_white2');
		if (whiteSquareStyles.indexOf(styleName) === -1) {
			styleName = whiteSquareStyles[0];
		}
		materials.white_sqr_style_name = styleName;
		document.getElementById(`board-style-white-${styleName}`).checked = true;
	}

	// load the setting for antialiasing.
	if (localStorage.getItem('antialiasing_mode') === 'false') {
		document.getElementById('antialiasing-checkbox').checked = false;
		antialiasingMode = false;
	}

	sliderAniso(+localStorage.aniso >= 0 ? +localStorage.aniso : 3);
	sliderScale(+localStorage.scale >= 0 ? +localStorage.scale : 2);

	if (localStorage.getItem('fixedcamera') === 'false') {
		fixedcamera = false;
	}
	else if (localStorage.getItem('fixedcamera') === 'true') {
		fixedcamera = true;
	}
	else {
		fixedcamera = ismobile;
	}
	document.getElementById('fix-camera-checkbox').checked = fixedcamera;

	if (localStorage.getItem('clickthrough') === 'false') {
		clickthrough = false;
	}
	document.getElementById('click-checkbox').checked = clickthrough;

	// load whether or not the 'Send' button should be hidden.
	if (localStorage.getItem('hide-send') === 'true') {
		document.getElementById('hide-send-checkbox').checked = true;
		document.getElementById('send-button').style.display = 'none';
		$('#chat').height(window.innerHeight - $('nav').height() - 51);
	}

	document.getElementById('chat-size-slider').value = +localStorage.getItem('chat_size') || 180;
	document.getElementById('chat-size-display').innerHTML = +localStorage.getItem('chat_size') || 180;
	sliderChatSize(+localStorage.getItem('chat_size') || 180);

	perspective = localStorage.getItem('perspective');
	if (!perspective) {
		if (ismobile) {
			perspective = 0;
		}
		else {
			perspective = 90;
		}
	}
	perspective = +perspective;
	document.getElementById('perspective-display').innerHTML = +perspective;
	document.getElementById('perspective-slider').value = perspective;

	// load setting for hide chat time
	if (localStorage.getItem('hide-chat-time') === 'true') {
		document.getElementById('hide-chat-time').checked = true;
		$('.chattime').each(function () {
			$(this).addClass('hidden');
		});
	}

	// load the setting for automatically rotating the board, when assigned player 2.
	if (localStorage.getItem('auto_rotate') === 'false') {
		document.getElementById('auto-rotate-checkbox').checked = false;
	}
}

/**
 * Notify checkbox change for checkbox:
 * Diagonal walls
 */
// eslint-disable-next-line no-unused-vars
function checkboxDiagonalWalls() {
	if (document.getElementById('wall-orientation').checked) {
		localStorage.setItem('diagonal_walls', 'true');
		diagonalWalls = true;
	} else {
		localStorage.setItem('diagonal_walls', 'false');
		diagonalWalls = false;
	}
	board.updatepieces();
}

/**
 * Notify slider movement:
 *   Piece size
 */
// eslint-disable-next-line no-unused-vars
function sliderPieceSize(newSize) {
	localStorage.setItem('piece_size', newSize);
	document.getElementById('piece-size-display').innerHTML = newSize;
	pieceSize = parseInt(newSize, 10);
	generateCamera();
}

// eslint-disable-next-line no-unused-vars
function perspectiveChange(newPerspective) {
	localStorage.setItem('perspective', newPerspective);
	document.getElementById('perspective-display').innerHTML = newPerspective;
	perspective = +newPerspective;
	generateCamera();
}

/**
 * Notify radio button check:
 *	 Piece style - white
 */
// eslint-disable-next-line no-unused-vars
function radioPieceStyleWhite(styleName) {
	document.getElementById(`piece-style-white-${styleName}`).checked = true;
	materials.white_piece_style_name = styleName;
	materials.white_cap_style_name = styleName;
	localStorage.setItem('piece_style_white3', styleName);
	board.updatepieces();
	settingscounter = (settingscounter + 1) & 15;
}

/**
 * Notify radio button check:
 *	 Piece style - black
 */
// eslint-disable-next-line no-unused-vars
function radioPieceStyleBlack(styleName) {
	document.getElementById(`piece-style-black-${styleName}`).checked = true;
	materials.black_piece_style_name = styleName;
	materials.black_cap_style_name = styleName;
	localStorage.setItem('piece_style_black3', styleName);
	board.updatepieces();
	settingscounter = (settingscounter + 1) & 15;
}

document.getElementById('piecetexture').onchange = gotnewtexturefile;
function gotnewtexturefile() {
	const reader = new FileReader();
	if (this.files.length) {
		reader.addEventListener('load', fileloaded, false);
		reader.readAsDataURL(this.files[0]);
	}
	function fileloaded() {
		localStorage.nextpiecetexture = localStorage.nextpiecetexture || 0;
		localStorage[`piecetexture${localStorage.nextpiecetexture}`] = reader.result;
		localStorage.nextpiecetexture = 1 - (+localStorage.nextpiecetexture);
		makeStyleSelector();
	}
}

/**
 * Notify radio button check:
 *	 Board style - black
 */
// eslint-disable-next-line no-unused-vars
function radioBoardStyleBlack(styleName) {
	document.getElementById(`board-style-black-${styleName}`).checked = true;
	materials.black_sqr_style_name = styleName;
	localStorage.setItem('board_style_black2', styleName);
	board.updateboard();
	settingscounter = (settingscounter + 1) & 15;
}

/**
 * Notify radio button check:
 *	 Board style - white
 */
// eslint-disable-next-line no-unused-vars
function radioBoardStyleWhite(styleName) {
	document.getElementById(`board-style-white-${styleName}`).checked = true;
	materials.white_sqr_style_name = styleName;
	localStorage.setItem('board_style_white2', styleName);
	board.updateboard();
	settingscounter = (settingscounter + 1) & 15;
}

/**
 * Notify checkbox change for checkbox:
 *	 Antialiasing
 */
// eslint-disable-next-line no-unused-vars
function checkboxAntialiasing() {
	if (document.getElementById('antialiasing-checkbox').checked) {
		localStorage.setItem('antialiasing_mode', 'true');
	} else {
		localStorage.setItem('antialiasing_mode', 'false');
	}
}

// eslint-disable-next-line no-unused-vars
function checkboxFixCamera() {
	if (document.getElementById('fix-camera-checkbox').checked) {
		localStorage.setItem('fixedcamera', 'true');
		fixedcamera = true;
	} else {
		localStorage.setItem('fixedcamera', 'false');
		fixedcamera = false;
	}
	generateCamera();
}

// eslint-disable-next-line no-unused-vars
function checkboxClick() {
	if (document.getElementById('click-checkbox').checked) {
		localStorage.setItem('clickthrough', 'true');
		clickthrough = true;
	} else {
		localStorage.setItem('clickthrough', 'false');
		clickthrough = false;
	}
}

/**
 * Notify checkbox change for checkbox:
 *	 Hide 'Send' button
 */
// eslint-disable-next-line no-unused-vars
function checkboxHideSend() {
	if (document.getElementById('hide-send-checkbox').checked) {
		localStorage.setItem('hide-send', 'true');
		document.getElementById('send-button').style.display = 'none';
		$('#chat').height(window.innerHeight - $('nav').height() - 51);
	} else {
		localStorage.setItem('hide-send', 'false');
		document.getElementById('send-button').style.display = 'initial';
		$('#chat').height(window.innerHeight - $('nav').height() - 85);
	}
}

/**
 * Notify checkbox change for checkbox:
 *	 Rotate board when player 2
 */
// eslint-disable-next-line no-unused-vars
function checkboxAutoRotate() {
	if (document.getElementById('auto-rotate-checkbox').checked) {
		localStorage.setItem('auto_rotate', 'true');
	} else {
		localStorage.setItem('auto_rotate', 'false');
	}
}

// eslint-disable-next-line no-unused-vars
function showPrivacyPolicy() {
	$('#help-modal').modal('hide');
	$('#privacy-modal').modal('show');
}

function getHeader(key, val) {
	return `[${key} "${val}"]\r\n`;
}

function getNotation() {
	const p1 = $('.player1-name:first').html();
	const p2 = $('.player2-name:first').html();
	const now = new Date();
	const dt = `${now.getYear() - 100}.${now.getMonth() + 1}.${now.getDate()} ${now.getHours()}.${getZero(now.getMinutes())}`;

	$('#download_notation').attr('download', `${p1} vs ${p2} ${dt}.ptn`);

	let res = '';
	res += getHeader('Site', 'PlayTak.com');
	res += getHeader('Date', `20${now.getYear() - 100}.${now.getMonth() + 1}.${now.getDate()}`);
	res += getHeader('Player1', p1);
	res += getHeader('Player2', p2);
	res += getHeader('Size', board.size);
	res += getHeader('Result', board.result);
	res += '\r\n';

	let count = 1;

	$('#moveslist tr').each(function () {
		$('td', this).each(function () {
			const val = $(this).text();
			res += val;

			if (count % 3 === 0) {
				res += '\r\n';
			}
			else {
				res += ' ';
			}

			count += 1;
		});
	});

	return res;
}

// eslint-disable-next-line no-unused-vars
function downloadNotation() {
	$('#download_notation').attr('href', `data:text/plain;charset=utf-8,${encodeURIComponent(getNotation())}`);
}

// eslint-disable-next-line no-unused-vars
function copyNotationLink() {
	const link = `http://www.playtak.com/?load=${encodeURIComponent(getNotation())}`;

	const dummy = document.createElement('input');
	document.body.appendChild(dummy);

	dummy.value = link;
	dummy.select();

	try {
		const successful = document.execCommand('copy');
		if (successful) {
			alert('success', 'Copied!');
		}
		else {
			alert('danger', 'Unable to copy!');
		}
	} catch (err) {
		alert('danger', 'Unable to copy!');
	}

	document.body.removeChild(dummy);
}

function sliderChatSize(newSize) {
	chathandler.showchat();
	chathandler.adjustChatWidth(+newSize);
	localStorage.setItem('chat_size', newSize);
	generateCamera();
}

function sliderAniso(anisoin) {
	anisoLevel = [1, 4, 8, 16][anisoin];
	localStorage.aniso = anisoin;
	$('#aniso-display').html(['Off', '4x', '8x', '16x'][anisoin]);
	$('#aniso-slider').val(anisoin);
	materials.updateBoardMaterials();
	materials.updatePieceMaterials();
}

function sliderScale(scalein) {
	scalelevel = [0.5, Math.SQRT1_2, 1, Math.SQRT2, 2][scalein];
	localStorage.scale = scalein;
	$('#scale-display').html(['0.5', '0.7', '1.0', '1.4', '2.0'][scalein]);
	$('#scale-slider').val(scalein);
	onWindowResize();
}

// eslint-disable-next-line no-unused-vars
function undoButton() {
	if (board.scratch) {
		board.undo();
	}
	else {
		server.undo();
	}
}

// eslint-disable-next-line no-unused-vars
function showresetpwd() {
	$('#login').modal('hide');
	$('#resetpwd-modal').modal('show');
}

// eslint-disable-next-line no-unused-vars
function fastrewind() {
	board.showmove(board.movestart);
}

function stepback() {
	board.showmove(board.moveshown - 1);
}

function stepforward() {
	board.showmove(board.moveshown + 1);
}

// eslint-disable-next-line no-unused-vars
function fastforward() {
	board.showmove(board.movecount);
}

$(document).ready(() => {
	if (localStorage.getItem('sound') === 'false') {
		volumeChange();
	}
	if (isBreakpoint('xs') || isBreakpoint('sm')) {
		chathandler.hidechat();
		hidermenu();
	} else {
		chathandler.showchat();
		showrmenu();
	}
	chathandler.init();
	if (window.location.search.startsWith('?load=')) {
		const text = decodeURIComponent(window.location.search.split('?load=')[1]);
		$('#loadptntext').val(text.replace(/\n/g, ' '));
		document.title = 'Tak Review';
		load();
	}
	else if (localStorage.getItem('keeploggedin') === 'true') {
		server.connect();
	}
	else {
		server.connect();
		$('#login').modal('show');
	}
});
