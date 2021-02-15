/*
window.fetch('/ratinglist.json')
	.then((response) => {
		response.json()
			.then(makeratinglist)
			.catch((err) => console.error('Failed to parse JSON from ratings',err))
	})
	.catch((err) => console.error('Failed to get ratings',err))
*/
var xhttp = new XMLHttpRequest()
xhttp.onreadystatechange = function(){
	if(this.readyState == 4 && this.status == 200){
		makeratinglist(JSON.parse(xhttp.responseText))
	}
}
xhttp.open("GET",'/ratinglist.json',true)
xhttp.send()

function makeratinglist(data){
	let a
	const rows = []
	let rank = 1
	for(a = 0;a < data.length;a += 1){
		const datarow = data[a]
		if(datarow[1] !== 0){
			rows.push(TR(
				{id:datarow[0].replace(/ [\s\S]*$/,'')},
				TD({className:'numbercell'},datarow[4]?IMG({src:'images/bot.png',className:'bot'}):(rank++)+"."),
				TD({className:'textcell'},formatnames(datarow[0])),
				TD({className:'numbercell'},datarow[1]),
				TD({className:'fullrating numbercell'},datarow[2]),
				TD({className:'numbercell'},datarow[3])
			))
		}
	}
	document.getElementById('|content').appendChild(DIV({style:{display:'inline-block'}},TABLE(
		THEAD(TR({style:{textAlign:'left'}},TH('Rank'),TH('Player'),TH('Rating'),TH('Active rating'),TH('Games'))),
		TBODY(rows)
	)))
	if(window.location.hash){
		window.location.hash = window.location.hash
	}
}

function formatnames(names){
	names = names.split(' ')
	const outarray = []
	let a
	for(a = 0;a < names.length;a++){
		if(a === 0){
			outarray.push(A({className:'firstname',href:"/games/search?playerw="+names[a]+"&mirror=on",target:'_blank'},names[a]))
		}
		else{
			outarray.push(' ')
			outarray.push(A({
				className:'secondname'
				,href:"/games/search?playerw="+names[a]+"&mirror=on"
				,target:'_blank'
				,id:names[a]
			},names[a]))
		}
	}
	return FRAGMENT(outarray)
}
