var fs=require('fs')
var crypto = require('crypto')
var bsqlite3=require('better-sqlite3')
var zlib=require("zlib")

var source=fs.readFileSync("rerate.js")
var hash = crypto.createHash('sha256')
hash.update(source)
var sourcehash=hash.digest('hex')

var previous="0 0"
try{
	previous=fs.readFileSync("previous.txt","utf8")
}
catch(e){
	
}
previousdata=previous.split(" ")

var incremental=false
var lastusedgame=0
if(sourcehash==previousdata[1]){
	incremental=true
	lastusedgame=+previousdata[0]
}

var now=Date.now()
var recentlimit=now-1000*60*60*6

var games
var players
var ratinglistpath
if(process.platform=="win32"){
	games=bsqlite3("games.db",{fileMustExist:true})
	players=bsqlite3("players.db",{fileMustExist:true})
	ratinglistpath="ratinglist.json.gz"
}
else{
	games=bsqlite3("/server/games.db",{fileMustExist:true})
	players=bsqlite3("/server/players.db",{fileMustExist:true})
	ratinglistpath="/static/ratinglist.json.gz"
}

var sameaccounts={
	"alphabot":"alphatak_bot"
	,"TakticianBotDev":"TakticianBot"
	,"sectenor":"Turing"
	,"KingSultan":"SultanPepper"
	,"PrinceSultan":"SultanPepper"
	,"SultanTheGreat":"SultanPepper"
	,"FuhrerSultan":"SultanPepper"
	,"MaerSultan":"SultanPepper"
	,"tarontos":"Tarontos"
	,"Luffy":"Ally"
	,"Archerion2":"Archerion"
	,"Manet":"Simmon"
	,"Alexc997":"Doodles"
	,"DragonTakerDG":"dylandragon"
	,"Bullet":"Abyss"
	,"Saemon":"Syme"
	,"Alpha":"Syme"
	,"pse711933":"LuKAs"
	,"rossin":"archvenison"
	,"megafauna":"archvenison"
	,"kriTakBot":"TakkenBot"
	,"robot":"TakkenBot"
}
var bots=[
	"TakticianBot"
	,"alphatak_bot"
	,"alphabot"
	,"cutak_bot"
	,"TakticianBotDev"
	,"takkybot"
	,"ShlktBot"
	,"AlphaTakBot_5x5"
	,"BeginnerBot"
	,"TakkerusBot"
	,"IntuitionBot"
	,"AaaarghBot"
	,"kriTakBot"
	,"TakkenBot"
	,"robot"
	,"TakkerBot"
	,"Geust93"
	,"CairnBot"
	,"VerekaiBot1"
	,"BloodlessBot"
	,"Tiltak_Bot"
	,"Taik"
]
var excluded=[
	"FlashBot"
	,"FriendlyBot"
	,"FPABot"
	,"cutak_bot"
	,"sTAKbot1"
	,"sTAKbot2"
	,"DoubleStackBot"
	,"antakonistbot"
	,"CairnBot"
]

function accountsettings(){
	var alias=players.prepare("update players as a set ratingbase=(select b.id from players as b where b.name=?) where a.name=?;")
	var key,a
	for(key in sameaccounts){
		alias.run(sameaccounts[key],key)
	}
	var setbot=players.prepare("update players set isbot=1 where name=?;")
	for(a=0;a<bots.length;a++){
		setbot.run(bots[a])
	}
	var setnorate=players.prepare("update players set unrated=1 where name=?;")
	for(a=0;a<excluded.length;a++){
		setnorate.run(excluded[a])
	}
}
if(!incremental){
	players.transaction(accountsettings)()
}
var a

//Rating calculation parameters:
var initialrating=1000
var bonusrating=750
var bonusfactor=60
var participationlimit=10
var participationcutoff=1500
var maxdrop=200
var ratingretention=1000*60*60*24*240

var pn={}
var pi={}
var p
var g

if(incremental){
	p=players.prepare("select id,name,ratingbase,unrated,isbot,rating,boost,ratedgames,maxrating,ratingage,fatigue from players;").all()
	//g=games.prepare("select id,date,player_white,player_black,result,unrated,size,length(notation) as notationlength from games where date>1461430800000 and id>?;").all(lastusedgame)
	
	for(a=0;a<p.length;a++){
		pn["!"+p[a].name]=p[a]
		pi[p[a].id]=p[a]
		p[a].fatigue=JSON.parse(p[a].fatigue)
		p[a].changed=false
	}
}
else{
	p=players.prepare("select id,name,ratingbase,unrated,isbot from players;").all()

	//g=games.prepare("select id,date,player_white,player_black,result,unrated,size,length(notation) as notationlength from games where date>1461430800000;").all()

	for(a=0;a<p.length;a++){
		pn["!"+p[a].name]=p[a]
		pi[p[a].id]=p[a]
		p[a].rating=initialrating
		p[a].boost=bonusrating
		p[a].ratedgames=0
		p[a].maxrating=initialrating
		p[a].ratingage=0
		p[a].fatigue={}
		p[a].changed=true
	}
}

//g.sort(function(a,b){return a.id-b.id})

//console.log(g[0])

function getplayer(name){
	var pl=pn["!"+name]
	if(pl && pl.ratingbase>0){
		pl=pi[pl.ratingbase]
	}
	if(pl && pl.unrated==1){
		return null
	}
	return pl||null
}

var updategame=games.prepare("update games set rating_white=?, rating_black=?, rating_change_white=?, rating_change_black=? where id=?;")
var updating=true
//var lastgameid=lastusedgame

function handlegames(){
	for(a=0;a<g.length;a++){
		var gm=g[a]
		var plw=getplayer(gm.player_white)
		var plb=getplayer(gm.player_black)
		var rtw=initialrating
		var rtb=initialrating
		var artw=initialrating
		var artb=initialrating
		if(plw){
			rtw=plw.rating
			artw=adjustedrating(plw,gm.date)
		}
		if(plb){
			rtb=plb.rating
			artb=adjustedrating(plb,gm.date)
		}
		var artw2=artw
		var artb2=artb
		var quickresult={"R-0":1,"F-0":1,"1-0":1,"0-R":0,"0-F":0,"0-1":0,"1/2-1/2":0.5}[gm.result]
		
		if(plw && plb && gm.size>=5 && gm.unrated==0 && updating && plw!=plb && gm.notationlength>6){
			if(quickresult===undefined && gm.date>recentlimit){
				updating=false
			}
			else if(quickresult!==undefined){
				//lastgameid=gm.id
				lastusedgame=gm.id
				var sw=Math.pow(10,rtw/400)
				var sb=Math.pow(10,rtb/400)
				var expected=sw/(sw+sb)
				var fairness=expected*(1-expected)
				var fatiguefactor=(1-(plw.fatigue[plb.id]||0)*0.4)*(1-(plb.fatigue[plw.id]||0)*0.4)
				adjustplayer(plw,plb,quickresult-expected,fairness,fatiguefactor,gm.date)
				adjustplayer(plb,plw,expected-quickresult,fairness,fatiguefactor,gm.date)
				updatefatigue(plw,plb.id,fairness*fatiguefactor)
				updatefatigue(plb,plw.id,fairness*fatiguefactor)
				artw2=adjustedrating(plw,gm.date)
				artb2=adjustedrating(plb,gm.date)
			}
		}
		else{
			lastusedgame=gm.id
		}
		updategame.run(Math.floor(artw),Math.floor(artb),Math.round((artw2-artw)*10),Math.round((artb2-artb)*10),gm.id)
	}
}
var count
do{
	g=games.prepare("select id,date,player_white,player_black,result,unrated,size,length(notation) as notationlength from games where date>1461430800000 and id>? order by id asc limit 50000;").all(lastusedgame)
	games.transaction(handlegames)()
	count=g.length
	g=null
	if(global.gc){
		global.gc()
	}

	Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500)
}while(count && updating)

var updateplayer=players.prepare("update players set rating=?, boost=?, ratedgames=?, maxrating=?, ratingage=?, fatigue=? where id=?;")

var alternames={}

function handleplayers(){
	for(a=0;a<p.length;a++){
		if(p[a].changed){ 
			updateplayer.run(p[a].rating,p[a].boost,p[a].ratedgames,p[a].maxrating,p[a].ratingage,JSON.stringify(p[a].fatigue),p[a].id)
		}
		if(p[a].ratingbase){
			if(alternames.hasOwnProperty(p[a].ratingbase)){
				alternames[p[a].ratingbase]+=" "+p[a].name
			}
			else{
				alternames[p[a].ratingbase]=" "+p[a].name
			}
		}
	}
}
players.transaction(handleplayers)()

//fs.writeFileSync("previous.txt",lastgameid+" "+sourcehash)
fs.writeFileSync("previous.txt",lastusedgame+" "+sourcehash)

var playerlist=[]
for(a=0;a<p.length;a++){
	var pl=p[a]
	if(pl.rating>initialrating){
		playerlist.push([pl.name+(alternames.hasOwnProperty(pl.id)?alternames[pl.id]:""),adjustedrating(pl,now),Math.floor(pl.rating),pl.ratedgames,pl.isbot?1:0])
	}
}
playerlist.sort(function(b,a){return a[1]-b[1]})
for(a=0;a<playerlist.length;a++){
	playerlist[a][1]=Math.floor(playerlist[a][1])
}
var jsonratinglist=JSON.stringify(playerlist)
var gzratinglist=zlib.gzipSync(jsonratinglist,{level:9})
fs.writeFileSync(ratinglistpath,gzratinglist)

function adjustplayer(pl,op,amount,fairness,fatiguefactor,date){
	var bonus=Math.min(Math.max(0,fatiguefactor*amount*Math.max(pl.boost,1)*bonusfactor/bonusrating),pl.boost)
	pl.boost-=bonus
	var k=10+15*Math.pow(.5,pl.ratedgames/200)+15*Math.pow(.5,(pl.maxrating-initialrating)/300)
	pl.rating+=fatiguefactor*amount*k+bonus
	if(pl.ratingage==0){
		pl.ratingage=date-ratingretention
	}
	var participation=20*Math.pow(0.5,(date-pl.ratingage)/ratingretention)
	participation+=fairness*fatiguefactor
	participation=Math.min(20,participation)
	pl.ratingage=Math.log2(participation/20)*ratingretention+date
	pl.ratedgames++
	pl.maxrating=Math.max(pl.maxrating,pl.rating)
	pl.changed=true
}

function updatefatigue(pl,opid,gamefactor){
	var a
	var multiplier=1-gamefactor*0.4
	for(a in pl.fatigue){
		pl.fatigue[a]*=multiplier
		if(a!=opid && pl.fatigue[a]<0.01){
			delete pl.fatigue[a]
		}
	}
	pl.fatigue[opid]=(pl.fatigue[opid]||0)+gamefactor
}

function adjustedrating(pl,date){
	if(pl.rating<participationcutoff){
		return pl.rating
	}
	var participation=20*Math.pow(0.5,(date-pl.ratingage)/ratingretention)
	if(pl.rating<participationcutoff+maxdrop){
		return Math.min(pl.rating,participationcutoff+maxdrop*participation/participationlimit)
	}
	else{
		return Math.min(pl.rating,pl.rating-(maxdrop*(1-participation/participationlimit)))
	}
}