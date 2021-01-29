#!/bin/sh

sudo cp /server/games.db /tmp/games_anon.db
echo "UPDATE games SET player_black=\"Anon\", player_white=\"Anon\" WHERE date < 1461430800000;" | sudo sqlite3 /tmp/games_anon.db

# size_in_bytes=`stat -c "%s" /tmp/games_anon.db`
echo `stat -c "%s" /tmp/games_anon.db` | sudo tee /gameserver/size.txt
sudo gzip -N -f -9 /tmp/games_anon.db
sudo mv /tmp/games_anon.db.gz /static/

# Update Size

# size_in_MB=$((size_in_bytes / 1048576))
# sed -i "s/(.*MB)/($size_in_MB MB)/g" /TakGames/app/views/games/_search_form.html.haml

# Update Date
# date_formatted=`date +%B\ %d,\ %Y`
# sed -i "s/(updated on .*)/(updated on $date_formatted)/g" /TakGames/app/views/games/_search_form.html.haml
