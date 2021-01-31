let pieceStyles;
const whiteSquareStyles = ['sand-velvet', 'sand-velvet-diamonds', 'sand-velvet-diamonds2', 'ornate', 'white-velvet', 'simple'];
const blackSquareStyles = ['sand-velvet', 'sand-velvet-diamonds', 'sand-velvet-diamonds2', 'ornate', 'blue-velvet', 'simple'];

function makeBoardSelector(color)
{
  const form = $(`#${color}_squares_form`);

  let call;
  let arr;
  if (color === 'white') {
    arr = whiteSquareStyles;
    call = 'radioBoardStyleWhite';
    form.html('White squares<br>');
  } else {
    arr = blackSquareStyles;
    call = 'radioBoardStyleBlack';
    form.html('Black squares<br>');
  }

  for (let i = 0; i < arr.length; i += 1) {
    const style = arr[i];
    const div = $('<div/>').addClass('radio-list-item');
    const inp = $('<input/>')
      .attr('id', `board-style-${color}-${style}`)
      .attr('type', 'radio')
      .attr('name', 'board-style');
    if (localStorage[`board_style_${color}2`] === style) {
      inp.prop('checked', true);
    }
    const img = $('<img/>')
      .attr('src', `images/board/preview/${color}_${style}.png`)
      .addClass('radio-list-img')
      .height(50)
      .width(50)
      .attr('onClick', `${call}('${style}')`);
    div.append(inp).append(img);
    form.append(div);
  }
}

function makePieceSelector(color)
{
  const form = $(`#${color}_pieces_form`);

  let call;
  if (color === 'white') {
    call = 'radioPieceStyleWhite';
    form.html('White pieces<br>');
  }
  else {
    call = 'radioPieceStyleBlack';
    form.html('Black pieces<br>');
  }

  Object.keys(pieceStyles).forEach((key) => {
    const div = $('<div/>').addClass('radio-list-item');
    const inp = $('<input/>')
      .attr('id', `piece-style-${color}-${key}`)
      .attr('type', 'radio')
      .attr('name', 'piece-style');
    if (localStorage[`piece_style_${color}3`] === key) {
      inp.prop('checked', true);
    }
    let img;
    if (pieceStyles[key] === 0) {
      img = $('<div/>')
        .css('background-image', `url('images/pieces/${key}_pieces.png')`)
        .css('background-size', '48px')
        .addClass('radio-list-img')
        .height(52)
        .width(52)
        .attr('onClick', `${call}('${key}')`);
    }
    else {
      img = $('<div/>')
        .css('background-image', `url('${pieceStyles[key] === 2 ? localStorage[key] : `images/pieces/${key}.png`}')`)
        .height(52).width(52)
        .css('background-size', '128px')
        .css('background-position', '-72px -76px')
        .addClass('radio-list-img')
        .attr('onClick', `${call}('${key}')`);
    }
    div.append(inp).append(img);
    form.append(div);
  });
}

function makeStyleSelector()
{
  pieceStyles = {
    white_coral: 0,
    white_simple: 0,
    white_marble: 1,
    red_marble: 1,
    black_pietersite: 0,
    black_simple: 0,
    black_marble: 1,
  };
  if (localStorage.piecetexture0) {
    pieceStyles.piecetexture0 = 2;
  }
  if (localStorage.piecetexture1) {
    pieceStyles.piecetexture1 = 2;
  }
  makeBoardSelector('white');
  makeBoardSelector('black');
  makePieceSelector('white');
  makePieceSelector('black');
}
