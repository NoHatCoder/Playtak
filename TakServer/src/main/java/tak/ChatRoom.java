/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package tak;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import tak.utils.ConcurrentHashSet;
import java.util.concurrent.locks.*;

/**
 *
 * @author chaitu
 */
public class ChatRoom {
	static final ConcurrentHashMap<String, ChatRoom> chatRooms = new ConcurrentHashMap<>();
	static Lock roommaplock=new ReentrantLock();
	
	ConcurrentHashSet<Client> members;
	
	ChatRoom() {
		members = new ConcurrentHashSet<Client>();
	}
	
	public static ChatRoom joinRoom(String name, Client client){
		roommaplock.lock();
		try{
			ChatRoom room=chatRooms.get(name);
			if(room==null){
				room = new ChatRoom();
				chatRooms.put(name, room);
			}
			room.members.add(client);
			return room;
		}
		finally{
			roommaplock.unlock();
		}
	}
	
	public static void shout(String name, Client client, String msg) {		
		ChatRoom room=chatRooms.get(name);
		if(room!=null){
			String compiledmessage="ShoutRoom "+name+" <"+client.player.getName()+"> "+msg;
			for (Client cc : room.members) {
				cc.sendWithoutLogging(compiledmessage);
			}
		}
	}
	
	public static void leaveRoom(String name, Client client){
		roommaplock.lock();
		try{
			ChatRoom room=chatRooms.get(name);
			if(room!=null){
				room.members.remove(client);
				if(room.members.isEmpty()){
					chatRooms.remove(name);
				}
			}
		}
		finally{
			roommaplock.unlock();
		}
	}
}
