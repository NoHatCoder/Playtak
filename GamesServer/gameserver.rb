require 'active_record'
require 'webrick'

ActiveRecord::Base.establish_connection(adapter: 'sqlite3', database: '/server/games.db')

class Game < ActiveRecord::Base
	#attr_accessible :id, :date, :size, :player_white, :player_black, :notation, :result, :timertime, :timerinc
end

class GamesController
	def index
	#	@games = Game.all
		params[:game] = {}
	end

	def search(params)

		queryf = ["1=1"]
		querys = []
		join = ' and '
		offset = 0
		
		mirror=params.has_key?("mirror")
		
		mirror_search="((1=1"

		if params.has_key?("playerw") && params["playerw"].length > 0
			mirror_search += " and player_white like ?"
			querys[querys.count] = params["playerw"]
			player_search = true
		end

		if params.has_key?("playerb") && params["playerb"].length > 0
			mirror_search += " and player_black like ?"
			querys[querys.count] = params["playerb"]
			player_search = true
		end

		if params.has_key?("result") && params["result"].length > 0
			if params["result"]=="X-0"
				mirror_search += " and (result=? or result=? or result=?)"
				querys[querys.count]="R-0"
				querys[querys.count]="F-0"
				querys[querys.count]="1-0"
			elsif params["result"]=="0-X"
				mirror_search += " and (result=? or result=? or result=?)"
				querys[querys.count]="0-R"
				querys[querys.count]="0-F"
				querys[querys.count]="0-1"
			else
				mirror_search += " and result = ?"
				querys[querys.count] = params["result"]
			end
		end
		
		if mirror
			mirror_search+=") or (1=1"

			if params.has_key?("playerw") && params["playerw"].length > 0
				mirror_search += " and player_black like ?"
				querys[querys.count] = params["playerw"]
				player_search = true
			end

			if params.has_key?("playerb") && params["playerb"].length > 0
				mirror_search += " and player_white like ?"
				querys[querys.count] = params["playerb"]
				player_search = true
			end

			if params.has_key?("result") && params["result"].length > 2
				if params["result"]=="0-X"
					mirror_search += " and (result=? or result=? or result=?)"
					querys[querys.count]="R-0"
					querys[querys.count]="F-0"
					querys[querys.count]="1-0"
				elsif params["result"]=="X-0"
					mirror_search += " and (result=? or result=? or result=?)"
					querys[querys.count]="0-R"
					querys[querys.count]="0-F"
					querys[querys.count]="0-1"
				elsif params["result"]=="1/2-1/2"
					mirror_search += " and result = ?"
					querys[querys.count] = params["result"]
				else
					mirror_search += " and result = ?"
					querys[querys.count] = params["result"].reverse
				end
			end
		end
		mirror_search+="))"
		queryf[queryf.count]=mirror_search

		if params.has_key?("size") && params["size"].length > 0
			queryf[queryf.count] = "size = ?"
			querys[querys.count] = params["size"]
		end

		if params.has_key?("offset") && params["offset"].length > 0
			offset = params["offset"].to_i
		end

		if player_search
			queryf[queryf.count] = "date > ?"
			querys[querys.count] = "1461430800000"
		end


		queryfinalf=''
		queryf.each do |i| queryfinalf += i + join end
		queryfinalf = queryfinalf[0..-(join.length)]

		queryfinal=[queryfinalf]
		queryfinal+=querys
		return Game.where(queryfinal).order('id DESC').limit(101).offset(offset)

=begin
		p queryfinal
		
		gamelist=Game.where(queryfinal).order('id DESC').limit(100).offset(offset)
		puts gamelist.length
		p gamelist
		
		@games = Game.where(queryfinal).order('id DESC').limit(100).offset(offset)

		if @games != nil
			@next_offset = offset + 100 if @games.size == 100
			@prev_offset = offset - 100 if offset >= 100
		end
=end
	end

	def get_header(key, val)
		return '['+key+' "'+val.to_s+'"]'+"\n";
	end

	def convert_move(move)
		spl = move.split(' ')

		if spl[0] == 'P'
			#P A4 (C|W)
			sq = spl[1]
			stone = ''
			if spl.length == 3
				stone = (spl[2]=='C') ? 'C':'S'
			end
			return stone + sq.downcase
		elsif spl[0] == 'M'
			#M A2 A5 2 1
			fl1 = spl[1][0]
			rw1 = spl[1][1]
			fl2 = spl[2][0]
			rw2 = spl[2][1]

			#sq1 = spl[1]
			#sq2 = spl[2]
			dir = ''
			if fl2 == fl1
				dir = (rw2 > rw1) ? '+':'-'
			else
				dir = (fl2 > fl1) ? '>':'<'
			end

			lst = ''
			liftsize = 0
			for i in (3..spl.length-1).to_a
				lst += spl[i]
				liftsize += spl[i].to_i
			end

			return liftsize.to_s + spl[1].downcase + dir + lst
		end

		return ''
	end

	def get_moves(notation)
		moves = ''
		count = 0
		notation.split(',').each do |move|
			if count%2 == 0
				moves += "\n" + ((count/2)+1).to_s + '.'
			end

			moves += ' '
			moves += convert_move(move)

			count += 1
		end
		return moves
	end

	def get_timer_info(timertime, timerinc)
		secs = timertime%60
		timertime = timertime/60

		mins = timertime%60
		hrs = timertime/60

		val = ''
		force = false

		val += hrs.to_s+':' and force = true if hrs != 0
		val += mins.to_s+':' and force = true if mins != 0 or force
		val += secs.to_s+'' if secs != 0 or force
		val += ' +'+timerinc.to_s if timerinc != 0

		return val
	end

	def get_ptn(game)
		ptn = ''

		wn = (game.date < 1461430800000) ? 'Anon':game.player_white
		bn = (game.date < 1461430800000) ? 'Anon':game.player_black

		ptn += get_header('Site', 'PlayTak.com')
		ptn += get_header('Event', 'Online Play')

		dt = DateTime.strptime((game.date/1000).to_s, '%s').to_s
		dt = (dt.gsub 'T', ' ').gsub '+00:00', ''

		ptn += get_header('Date', dt.split(' ')[0].gsub('-', '.'))
		ptn += get_header('Time', dt.split(' ')[1])

		ptn += get_header('Player1', wn)
		ptn += get_header('Player2', bn)
		ptn += get_header('Clock', get_timer_info(game.timertime, game.timerinc))
		ptn += get_header('Result', game.result)
		ptn += get_header('Size', game.size)
		ptn += get_header('Komi', (game.komi/2).to_s)
		
		stdpieces=[0,0,0,10,15,21,30,40,50][game.size]
		stdcaps=[0,0,0,0,0,1,1,2,2][game.size]
		gpieces=game.pieces==-1 ? stdpieces : game.pieces
		gcaps=game.capstones==-1 ? stdcaps : game.capstones
		
		ptn += get_header('Flats', gpieces)
		ptn += get_header('Caps', gcaps)

		ptn += get_moves("\n" + game.notation)
		ptn+="\n"+game.result+"\n"
		return ptn
	end
=begin
	def show
		id = params[:id]
		games = Game.where('id = ?', id)

		if(games.length == 1)
			game = games[0]
			ptn = get_ptn(game)

			wn = (game.date < 1461430800000) ? 'Anon':game.player_white
			bn = (game.date < 1461430800000) ? 'Anon':game.player_black
			dt = DateTime.strptime((game.date/1000).to_s, '%s').to_s
			dt = (dt.gsub 'T', ' ').gsub '+00:00', ''

			send_data ptn, :filename => wn + ' vs ' + bn + ' ' + dt.split(' ')[0].gsub('-', '.') + '.ptn'
		end
	end

	def view
		id = params[:id]
		games = Game.where('id = ?', id)

		if(games.length == 1)
			game = games[0]
			ptn = get_ptn(game)

			wn = (game.date < 1461430800000) ? 'Anon':game.player_white
			bn = (game.date < 1461430800000) ? 'Anon':game.player_black
			dt = DateTime.strptime((game.date/1000).to_s, '%s').to_s
			dt = (dt.gsub 'T', ' ').gsub '+00:00', ''

			send_data ptn, :type => 'text', :disposition => 'inline'
		end
	end
=end
	def gamestring(id)
		games = Game.where('id = ?', id)

		if(games.length == 1)
			game = games[0]
			ptn = get_ptn(game)

			wn = (game.date < 1461430800000) ? 'Anon':game.player_white
			bn = (game.date < 1461430800000) ? 'Anon':game.player_black
			dt = DateTime.strptime((game.date/1000).to_s, '%s').to_s
			dt = (dt.gsub 'T', ' ').gsub '+00:00', ''

			return ptn, wn + ' vs ' + bn + ' ' + dt.split(' ')[0].gsub('-', '.') + '.ptn'
		end
	end

	def ptnviewer(id)
		games = Game.where('id = ?', id)

		if(games.length == 1)
			game = games[0]
			ptn = get_ptn(game)
			return 'https://jsfiddle.net/bwochinski/043hpzwu/embedded/result/?ptn=' + URI.encode_www_form_component(ptn).gsub("+","%20")
		end
		return ''
	end

	def ninjaviewer(id)
		games = Game.where('id = ?', id)

		if(games.length == 1)
			game = games[0]
			ptn = get_ptn(game)
			return 'http://ptn.ninja/' + URI.encode_www_form_component(ptn).gsub("+","%20").gsub("%0A","%20")#.gsub("[","%5B").gsub("]","%5D")
		end
		return ''
	end

	def playtakviewer(id)
		games = Game.where('id = ?', id)

		if(games.length == 1)
			game = games[0]
			ptn = get_ptn(game)
			return '/?load=' + URI.encode_www_form_component(ptn).gsub("+","%20")
		end
		return ''
	end
end

$dbsizestring="0"
$dbtimestring=""
$dbstringupdate=0

def getgamesdbsize()
	currenttime=Time.now.to_i
	if $dbstringupdate+300<currenttime
		$dbstringupdate=currenttime
		mtime=File.mtime("size.txt")
		if mtime
			mtimeutc=gametime=Time.at(mtime.to_i).utc
			$dbtimestring=mtimeutc.strftime("%b %d %Y")
		end
		sizefile=templatefile=File.open("size.txt")
		if sizefile
			$dbsizestring=(sizefile.read().to_i/1048576).to_s
			sizefile.close()
		end
	end
end

def minuteseconds(time)
	outstr=''
	minutes=(time/60).floor
	seconds=time%60
	if(minutes>0)
		outstr<<minutes.to_s
	end
	outstr<<':'
	if(seconds<10)
		outstr<<'0'
	end
	outstr<<seconds.to_s
	return outstr
end

def ratingchangeformat(change)
	sign="+"
	if change<0
		sign="-"
		change=-change
	end
	return sign+(change/10).floor.to_s+"."+(change%10).to_s
end

def komiformat(komi)
	return (komi/2).floor.to_s+"."+((komi%2)*5).to_s
end

templatefile=File.open("games.html")
template=templatefile.read().split("%")
templatefile.close()

templatefile=File.open("gamerow.html")
rowtemplate=templatefile.read().split("%")
templatefile.close()


server = WEBrick::HTTPServer.new :Port => 9000

gamesController=GamesController.new

server.mount_proc '/' do |req, res|
	path=req.path_info.gsub(/(^\/)|(\/$)/,"").split("/")
	dir=path[path.length-1]
	gameid=0
	if path.length>=2
		gameid=path[path.length-2].to_i
	end
	response=''
	if dir=="view"
		ptn,name=gamesController.gamestring(gameid)
		res.content_type="text/plain; charset=UTF-8"
		res.body=ptn
	elsif dir=="playtakviewer"
		url=gamesController.playtakviewer(gameid)
		res.set_redirect(WEBrick::HTTPStatus::Found,url)
	elsif dir=="ptnviewer"
		url=gamesController.ptnviewer(gameid)
		res.set_redirect(WEBrick::HTTPStatus::Found,url)
	elsif dir=="ninjaviewer"
		url=gamesController.ninjaviewer(gameid)
		res.set_redirect(WEBrick::HTTPStatus::Found,url)
	elsif dir=~/^\d+$/
		gameid=path[path.length-1].to_i
		ptn,name=gamesController.gamestring(gameid)
		res.content_type="application/octet-stream"
		res["content-disposition"]='attachment; filename="'+name+'"'
		res.body=ptn
	else
		params=WEBrick::HTTPUtils.parse_query(req.query_string)
		getgamesdbsize()
		searchvalues={}
		searchvalues["offset"]="0"
		searchvalues["playerw"]=""
		searchvalues["playerb"]=""
		searchvalues["size"]=""
		searchvalues["result"]=""
		searchvalues["dbsize"]=$dbsizestring
		searchvalues["dbdate"]=$dbtimestring
		if(params.has_key?("mirror"))
			searchvalues["mirror"]="checked='checked'"
		end
		if(params.has_key?("playerw"))
			searchvalues["playerw"]=params["playerw"].gsub(/[^A-Za-z0-9_]/,"")
		else
			searchvalues["mirror"]="checked='checked'" #Mirror is on by default, set if request is not originating from form submission.
		end
		if(params.has_key?("playerb"))
			searchvalues["playerb"]=params["playerb"].gsub(/[^A-Za-z0-9_]/,"")
		end
		if(params.has_key?("offset"))
			searchvalues["offset"]=params["offset"].gsub(/[^0-9]/,"")
		end
		if(params.has_key?("size"))
			searchvalues["size"]=params["size"].gsub(/[^0-9]/,"")
			searchvalues["s"+searchvalues["size"]]='selected'
		end
		if(params.has_key?("result"))
			searchvalues["result"]=params["result"].gsub(/[^RFX\-0\/12]/,"")
			searchvalues["s"+searchvalues["result"]]='selected'
		end
		games=gamesController.search(searchvalues)
		offset=searchvalues["offset"].to_i
		if offset>=100
			searchvalues["back"]='<a href="/games/search?offset='+(offset-100).to_s+'&playerw='+searchvalues["playerw"]+'&playerb='+searchvalues["playerb"]+'&size='+searchvalues["size"]+'&result='+searchvalues["result"]+(params.has_key?("mirror") ? '&mirror=on':'')+'">&lt;</a>'
		else
			searchvalues["back"]='&lt;'
		end
		if games.length>100
			searchvalues["forward"]='<a href="/games/search?offset='+(offset+100).to_s+'&playerw='+searchvalues["playerw"]+'&playerb='+searchvalues["playerb"]+'&size='+searchvalues["size"]+'&result='+searchvalues["result"]+(params.has_key?("mirror") ? '&mirror=on':'')+'">&gt;</a>'
		else
			searchvalues["forward"]='&gt;'
		end
=begin
		params.each do |key, value|
		
		end
=end
		literal=true
		for part in template
			if(literal)
				response<<part
			else
				if(searchvalues.has_key?(part))
					response<<searchvalues[part]
				end
				if(part=="rows")
					abandonedtime=Time.now.utc-3600*6
					gamecount=0
					games.each do |game|
						gamecount+=1
						if gamecount<=100
							searchvalues2={}
							searchvalues2['size']=game.size.to_s+"x"+game.size.to_s
							searchvalues2['id']=game.id.to_s
							searchvalues2['rules']=""
							if game.komi>0
								searchvalues2['rules']="Komi: "+komiformat(game.komi)
							end
							stdpieces=[0,0,0,10,15,21,30,40,50][game.size]
							stdcaps=[0,0,0,0,0,1,1,2,2][game.size]
							gpieces=game.pieces==-1 ? stdpieces : game.pieces
							gcaps=game.capstones==-1 ? stdcaps : game.capstones
							if gpieces!=stdpieces || gcaps!=stdcaps
								if game.komi>0
									searchvalues2['rules']+="<br>"
								end
								searchvalues2['rules']+="Pieces: "+gpieces.to_s+"/"+gcaps.to_s
							end
							#gametime=Time.at(game.date/1000,in:"UTC")
							gametime=Time.at(game.date/1000).utc
							searchvalues2['date']=gametime.strftime("%Y-%m-%d %H:%M:%S")
							if(game.timertime>0)
								searchvalues2['timecontrol']=minuteseconds(game.timertime)+" +"+minuteseconds(game.timerinc)
							end
							searchvalues2['result']=game.result
							if(game.date<1461430800000)
								searchvalues2['playerw']="Anon"
								searchvalues2['playerb']="Anon"
							else
								searchvalues2['playerw']=game.player_white
								searchvalues2['playerb']=game.player_black
							end
							if game.size<5 || game.unrated==1 || game.rating_white==0 || game.rating_black==0 || (game.result!="0-0" && game.notation.length<6) || (game.result=="0-0" && gametime<abandonedtime) || (game.rating_change_white==-2000 && game.rating_change_black==-2000)
								if game.rating_white>=100
									searchvalues2['playerwrt']=game.rating_white.to_s
								end
								if game.rating_black>=100
									searchvalues2['playerbrt']=game.rating_black.to_s
								end
							elsif game.rating_change_white<0 && game.rating_change_black<0
								if game.rating_white>=100
									searchvalues2['playerwrt']=game.rating_white.to_s+" +?"
								end
								if game.rating_black>=100
									searchvalues2['playerbrt']=game.rating_black.to_s+" +?"
								end
							else
								if game.rating_white>=100
									searchvalues2['playerwrt']=game.rating_white.to_s+" "+ratingchangeformat(game.rating_change_white)
								end
								if game.rating_black>=100
									searchvalues2['playerbrt']=game.rating_black.to_s+" "+ratingchangeformat(game.rating_change_black)
								end
							end
							literal2=true
							for part2 in rowtemplate
								if(literal2)
									response<<part2
								else
									if(searchvalues2.has_key?(part2))
										response<<searchvalues2[part2]
									end
								end
								literal2=!literal2
							end
						end
					end
				end
			end
			literal=!literal
		end
=begin
		Game.columns.each { |column|
			puts column.name
			puts column.type
			response+= column.name.to_s+':'+ column.type.to_s+'; '
		}
		reults= gamesController.search({game:{}})
=end
		res.content_type="text/html; charset=UTF-8"
		res.body = response
	end
end

trap 'INT' do server.shutdown end
server.start