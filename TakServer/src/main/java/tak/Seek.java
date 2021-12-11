/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package tak;

import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import static tak.Game.DEFAULT_SIZE;
import tak.utils.ConcurrentHashSet;
import java.util.concurrent.locks.*;

/**
 *
 * @author chaitu
 */
public class Seek {
	Client client;
	int boardSize;
	int no;
	int time;//time in seconds for each side
	int incr;//increment in seconds
	int komi;
	int pieces;
	int capstones;
	int unrated;
	int tournament;
	String opponent;
	enum COLOR {WHITE, BLACK, ANY};
	COLOR color;
	public static Lock seekStuffLock=new ReentrantLock();
	
	static AtomicInteger seekNo = new AtomicInteger(0);
	
	static Map<Integer, Seek> seeks = new ConcurrentHashMap<>();
	static ConcurrentHashSet<Client> seekListeners = new ConcurrentHashSet<>();
	
	static Seek newSeek(Client c, int b, int t, int i, COLOR clr, int komi, int pieces, int capstones, int unrated, int tournament, String opponent) {
		seekStuffLock.lock();
		try{
			Seek sk = new Seek(c, b, t, i, clr, komi, pieces, capstones, unrated, tournament, opponent);
			addSeek(sk);
			return sk;
		}
		finally{
			seekStuffLock.unlock();
		}
	}
	
	Seek(Client c, int b, int t, int i, COLOR clr, int komi, int pieces, int capstones, int unrated, int tournament, String opponent) {
		seekStuffLock.lock();
		try{
			client = c;
			no = seekNo.incrementAndGet();
			time = t;
			incr = i;
			color = clr;
			this.komi=Math.min(komi,8);
			this.pieces=Math.max(Math.min(pieces,80),10);
			this.capstones=Math.min(capstones,5);
			this.unrated=unrated;
			this.tournament=tournament;
			this.opponent=opponent;
			
			if (b < 3 || b > 8)
				b = DEFAULT_SIZE;
			boardSize = b;
		}
		finally{
			seekStuffLock.unlock();
		}
	}

	static void removeSeek(int b) {
		seekStuffLock.lock();
		try{
			Seek sk=Seek.seeks.get(b);
			Seek.seeks.remove(b);
			updateListeners("remove "+sk.toString());
		}
		finally{
			seekStuffLock.unlock();
		}
	}
	
	static void addSeek(Seek sk) {
		seekStuffLock.lock();
		try{
			Seek.seeks.put(sk.no, sk);
			updateListeners("new "+sk.toString());
		}
		finally{
			seekStuffLock.unlock();
		}
	}
		
	static void sendListTo(Client c) {
		seekStuffLock.lock();
		try{
			for (Integer no : Seek.seeks.keySet()) {
				c.send("Seek new "+Seek.seeks.get(no));
			}
		}
		finally{
			seekStuffLock.unlock();
		}
	}
	
	static void registerListener(Client c) {
		seekStuffLock.lock();
		try{
			seekListeners.add(c);
			sendListTo(c);
		}
		finally{
			seekStuffLock.unlock();
		}
	}
	
	static void updateListeners(final String st) {
		seekStuffLock.lock();
		try{
			for (Client cc : seekListeners) {
				cc.sendWithoutLogging("Seek " + st);
			}
		}
		finally{
			seekStuffLock.unlock();
		}
	}
	
	static void unregisterListener(Client c) {
		seekStuffLock.lock();
		try{
			seekListeners.remove(c);
		}
		finally{
			seekStuffLock.unlock();
		}
	}
	@Override
	public String toString() {
		seekStuffLock.lock();
		try{
			String clr = "A";
			if(color == COLOR.WHITE)
				clr = "W";
			else if(color == COLOR.BLACK)
				clr = "B";
			
			return (no+" "+client.player.getName()+" "+boardSize+" "+time+" "+incr+" "+clr+" "+komi+" "+pieces+" "+capstones+" "+unrated+" "+tournament+" "+opponent);
		}
		finally{
			seekStuffLock.unlock();
		}
	}
}
