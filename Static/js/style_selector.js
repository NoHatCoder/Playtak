var piece_styles
var white_square_styles = ["sand-velvet","sand-velvet-diamonds","sand-velvet-diamonds2","ornate","white-velvet","simple"]
var black_square_styles = ["sand-velvet","sand-velvet-diamonds","sand-velvet-diamonds2","ornate","blue-velvet","simple"]

function make_board_selector(color){
	var form = $('#'+color+'_squares_form')

	var call
	if(color === 'white'){
		arr = white_square_styles
		call = 'radioBoardStyleWhite'
		form.html("White squares<br>")
	}
	else{
		arr = black_square_styles
		call = 'radioBoardStyleBlack'
		form.html("Black squares<br>")
	}

	for(var i=0;i<arr.length;i++){
		var style = arr[i]
		var div = $('<div/>').addClass('radio-list-item')
		var inp = $('<input/>')
			.attr('id','board-style-'+color+'-' + style)
			.attr('type','radio')
			.attr('name','board-style')
		if(localStorage['board_style_'+color+'2']==style){
			inp.prop('checked',true)
		}
		var img = $('<img/>')
			.attr('src','images/board/preview/'+color+'_' + style + '.png')
			.addClass('radio-list-img')
			.height(50).width(50)
			.attr('onClick',call+'(\''+style+'\')')
		div.append(inp).append(img)
		form.append(div)
	}
}

function make_piece_selector(color){
	var form = $('#'+color+'_pieces_form')

	var arr=piece_styles
	var call
	if(color === 'white'){
		call="radioPieceStyleWhite"
		form.html("White pieces<br>")
	}
	else{
		call="radioPieceStyleBlack"
		form.html("Black pieces<br>")
	}

	for(var i in piece_styles){
		var div = $('<div/>').addClass('radio-list-item')
		var inp = $('<input/>')
			.attr('id','piece-style-'+color+"-"+i)
			.attr('type','radio')
			.attr('name','piece-style')
		if(localStorage['piece_style_'+color+'3']==i){
			inp.prop('checked',true)
		}
		if(piece_styles[i]==0){
			var img = $('<div/>')
				.css("background-image","url('"+'images/pieces/'+ i + '_pieces.png'+"')")
				.css("background-size","48px")
				.addClass('radio-list-img')
				.height(52).width(52)
				.attr('onClick',call+'(\''+i+'\')')
		}
		else{
			var img = $('<div/>')
				.css("background-image","url('"+(piece_styles[i]==2?localStorage[i]:'images/pieces/'+ i + '.png')+"')")
				.height(52).width(52)
				.css("background-size","128px")
				.css("background-position","-72px -76px")
				.addClass('radio-list-img')
				.attr('onClick',call+'(\''+i+'\')')
		}
		div.append(inp).append(img)
		form.append(div)
	}
}

function make_style_selector(){
	piece_styles={"white_coral":0,"white_simple":0,"white_marble":1,"red_marble":1,"black_pietersite":0,"black_simple":0,"black_marble":1}
	if(localStorage.piecetexture0){
		piece_styles.piecetexture0=2
	}
	if(localStorage.piecetexture1){
		piece_styles.piecetexture1=2
	}
	make_board_selector('white')
	make_board_selector('black')
	make_piece_selector('white')
	make_piece_selector('black')
}
