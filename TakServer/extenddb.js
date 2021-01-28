var bsqlite3=require('better-sqlite3')

var games=bsqlite3("/server/games.db",{fileMustExist:true})
var players=bsqlite3("/server/players.db",{fileMustExist:true})

console.log(games.prepare("select * from games").get())
console.log(players.prepare("select * from players").get())


players.prepare("alter table players add rating real default 1000;").run()
players.prepare("alter table players add boost real default 750;").run()
players.prepare("alter table players add ratedgames int default 0;").run()
players.prepare("alter table players add maxrating real default 1000;").run()
players.prepare("alter table players add ratingage real default 0;").run()
players.prepare("alter table players add ratingbase int default 0;").run()
players.prepare("alter table players add unrated int default 0;").run()
players.prepare("alter table players add isbot int default 0;").run()

players.prepare("alter table players add fatigue text default '{}';").run()


games.prepare("alter table games add rating_white int default 1000;").run()
games.prepare("alter table games add rating_black int default 1000;").run()
games.prepare("alter table games add unrated int default 0;").run()
games.prepare("alter table games add tournament int default 0;").run()
games.prepare("alter table games add komi int default 0;").run()
games.prepare("alter table games add pieces int default -1;").run()
games.prepare("alter table games add capstones int default -1;").run()

games.prepare("alter table games add rating_change_white int default 0;").run()
games.prepare("alter table games add rating_change_black int default 0;").run()

console.log(games.prepare("select * from games").get())
console.log(players.prepare("select * from players").get())