package tak;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.net.Socket;
import java.net.SocketException;
import java.net.SocketTimeoutException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.Iterator;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import tak.utils.ConcurrentHashSet;

/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
/**
 *
 * @author chaitu
 */
public class Client extends Thread {

	Websocket websocket;
	Player player = null;
	int clientNo;
	
	static AtomicInteger totalClients = new AtomicInteger(0);
	static AtomicInteger onlineClients = new AtomicInteger(0);

	static ConcurrentHashSet<Client> clientConnections = new ConcurrentHashSet<>();

	Seek seek = null;
	Set<Game> spectating;
	Set<String> chatRooms;

	String loginString = "^Login ([a-zA-Z][a-zA-Z0-9_]{3,15}) ([^\n\r\\s]{6,50})";
	Pattern loginPattern;
	
	String loginGuestString = "^Login Guest";
	Pattern loginGuestPattern;
	
	String registerString = "^Register ([a-zA-Z][a-zA-Z0-9_]{3,15}) ([A-Za-z.0-9_+!#$%&'*^?=-]{1,30}@[A-Za-z.0-9-]{3,30})";
	Pattern registerPattern;
	
	String wrongRegisterString = "^Register [^\n\r]{1,256}";
	Pattern wrongRegisterPattern;
	
	String clientString = "^Client ([A-Za-z-.0-9]{4,15})";
	Pattern clientPattern;
	
	String changePasswordString = "^ChangePassword ([^\n\r\\s]{6,50}) ([^\n\r\\s]{6,50})";
	Pattern changePasswordPattern;
	
	String sendResetTokenString = "^SendResetToken ([a-zA-Z][a-zA-Z0-9_]{3,15}) ([A-Za-z.0-9_+!#$%&'*^?=-]{1,30}@[A-Za-z.0-9-]{3,30})";
	Pattern sendResetTokenPattern;
	
	String resetPasswordString = "^ResetPassword ([a-zA-Z][a-zA-Z0-9_]{3,15}) ([^\n\r\\s]{6,50}) ([^\n\r\\s]{6,50})";
	Pattern resetPasswordPattern;
	
	String placeString = "^Game#(\\d+) P ([A-Z])(\\d)( C)?( W)?";
	Pattern placePattern;

	String moveString = "^Game#(\\d+) M ([A-Z])(\\d) ([A-Z])(\\d)(( \\d)+)";
	Pattern movePattern;
	
	String undoString = "^Game#(\\d+) RequestUndo";
	Pattern undoPattern;
	
	String removeUndoString = "^Game#(\\d+) RemoveUndo";
	Pattern removeUndoPattern;
	
	String drawString = "^Game#(\\d+) OfferDraw";
	Pattern drawPattern;
	
	String removeDrawString = "^Game#(\\d+) RemoveDraw";
	Pattern removeDrawPattern;
	
	String resignString = "^Game#(\\d+) Resign";
	Pattern resignPattern;

	String seekString = "^Seek (\\d) (\\d+) (\\d+) ([WBA]) (\\d+) (\\d+) (\\d+) (0|1) (0|1) ([A-Za-z0-9_]*)";
	Pattern seekPattern;

	String oldSeekString = "^Seek (\\d) (\\d+) (\\d+)( [WB])?";
	Pattern oldSeekPattern;

	String acceptSeekString = "^Accept (\\d+)";
	Pattern acceptSeekPattern;

	String listString = "^List";
	Pattern listPattern;

	String gameListString = "^GameList";
	Pattern gameListPattern;
	
	String observeString = "^Observe (\\d+)";
	Pattern observePattern;
	
	String unobserveString = "^Unobserve (\\d+)";
	Pattern unobservePattern;

	String gameString = "^Game#(\\d+) Show$";
	Pattern gamePattern;
	
	String getSqStateString = "^Game#(\\d+) Show ([A-Z])(\\d)";
	Pattern getSqStatePattern;
	
	String shoutString = "^Shout ([^\n\r]{1,256})";
	Pattern shoutPattern;
	
	String shoutRoomString = "^ShoutRoom ([^\n\r\\s]{1,64}) ([^\n\r]{1,256})";
	Pattern shoutRoomPattern;
	
	//String createRoomString = "CreateRoom ([^\n\r\\s]{4,15})";
	//Pattern createRoomPattern;
	
	String joinRoomString = "^JoinRoom ([^\n\r\\s]{1,64})";
	Pattern joinRoomPattern;
	
	String leaveRoomString = "^LeaveRoom ([^\n\r\\s]{1,64})";
	Pattern leaveRoomPattern;
	
	String tellString = "^Tell ([a-zA-Z][a-zA-Z0-9_]{3,15}) ([^\n\r]{1,256})";
	Pattern tellPattern;
	
	String pingString = "^PING$";
	Pattern pingPattern;
	
	String sudoString = "sudo ([^\n\r]{1,256})";
	Pattern sudoPattern;
	
	/* Mod commands start with sudoString */
	String gagString = "sudo gag ([a-zA-Z][a-zA-Z0-9_]{3,15})";
	Pattern gagPattern;
	
	String unGagString = "sudo ungag ([a-zA-Z][a-zA-Z0-9_]{3,15})";
	Pattern unGagPattern;
	
	String kickString = "sudo kick ([a-zA-Z][a-zA-Z0-9_]{3,15})";
	Pattern kickPattern;
	
	String listCmdString = "sudo list ([a-zA-Z]{3,15})";
	Pattern listCmdPattern;
	
	//set param user value
	String setString = "sudo set ([a-zA-Z]{3,15}) ([a-zA-Z][a-zA-Z0-9_]{3,15}) ([^\n\r\\s]{6,100})";
	Pattern setPattern;
	
	String modString = "sudo mod ([a-zA-Z][a-zA-Z0-9_]{3,15})";
	Pattern modPattern;
	
	String unModString = "sudo unmod ([a-zA-Z][a-zA-Z0-9_]{3,15})";
	Pattern unModPattern;
	
	String broadcastString = "sudo broadcast ([^\n\r]{1,256})";
	Pattern broadcastPattern;

	Client(Websocket socket) {
		websocket = socket;
		this.clientNo = totalClients.incrementAndGet();

		loginPattern = Pattern.compile(loginString);
		registerPattern = Pattern.compile(registerString);
		clientPattern = Pattern.compile(clientString);
		changePasswordPattern = Pattern.compile(changePasswordString);
		sendResetTokenPattern = Pattern.compile(sendResetTokenString);
		resetPasswordPattern = Pattern.compile(resetPasswordString);
		placePattern = Pattern.compile(placeString);
		movePattern = Pattern.compile(moveString);
		undoPattern = Pattern.compile(undoString);
		removeUndoPattern = Pattern.compile(removeUndoString);
		drawPattern = Pattern.compile(drawString);
		removeDrawPattern = Pattern.compile(removeDrawString);
		resignPattern = Pattern.compile(resignString);
		wrongRegisterPattern = Pattern.compile(wrongRegisterString);
		seekPattern = Pattern.compile(seekString);
		oldSeekPattern = Pattern.compile(oldSeekString);
		acceptSeekPattern = Pattern.compile(acceptSeekString);
		listPattern = Pattern.compile(listString);
		gameListPattern = Pattern.compile(gameListString);
		gamePattern = Pattern.compile(gameString);
		observePattern = Pattern.compile(observeString);
		unobservePattern = Pattern.compile(unobserveString);
		getSqStatePattern = Pattern.compile(getSqStateString);
		shoutPattern = Pattern.compile(shoutString);
		shoutRoomPattern = Pattern.compile(shoutRoomString);
		//createRoomPattern = Pattern.compile(createRoomString);
		joinRoomPattern = Pattern.compile(joinRoomString);
		leaveRoomPattern = Pattern.compile(leaveRoomString);
		tellPattern = Pattern.compile(tellString);
		pingPattern = Pattern.compile(pingString);
		loginGuestPattern = Pattern.compile(loginGuestString);
		
		sudoPattern = Pattern.compile(sudoString);
		gagPattern = Pattern.compile(gagString);
		unGagPattern = Pattern.compile(unGagString);
		kickPattern = Pattern.compile(kickString);
		listCmdPattern = Pattern.compile(listCmdString);
		setPattern = Pattern.compile(setString);
		modPattern = Pattern.compile(modString);
		unModPattern = Pattern.compile(unModString);
		broadcastPattern = Pattern.compile(broadcastString);

		clientConnections.add(this);
		spectating = new HashSet<>();
		chatRooms = new HashSet<>();
		/*
		try{
			Log("Connected "+websocket.socket.getInetAddress());
		}
		catch(Throwable t){
			
		}
		*/
	}

	void sendNOK() {
		send("NOK");
	}

	void send(String st) {
		Log("Send:"+st);
		sendWithoutLogging(st);
	}
	
	void sendCmdReply(String st) {
		sendWithoutLogging("CmdReply "+st);
	}
	
	void sendWithoutLogging(String st) {
		websocket.send(st);
	}
	

	void removeSeeks() {
		if (seek != null) {
			Seek.removeSeek(seek.no);
			seek = null;
		}
	}
	
	void unspectateAll() {
		for(Game g: spectating)
			g.unSpectate(player);
		spectating.clear();
	}
	
	static void sendAll(final String msg) {
		for(Client c: clientConnections){
			c.sendWithoutLogging(msg);
		}
		/*
		new Thread() {
			@Override
			public void run() {

			}
		}.start();
		*/
	}
	
	static void sendAllOnline(final String msg) {
		for(Client c: clientConnections){
			if(c.player!=null){
				c.sendWithoutLogging(msg);
			}
		}
		/*
		new Thread() {
			@Override
			public void run() {

			}
		}.start();
		*/
	}

	void clientQuit() throws IOException {
		clientConnections.remove(this);

		if (player != null) {
			Game game = player.getGame();
			if(game!=null){
				game.playerDisconnected(player);
			}

			Seek.unregisterListener(this);
			Game.unregisterGameListListener(player);
			removeSeeks();
			removeFromAllRooms();
			unspectateAll();
	//		if(game!=null)
	//			Game.removeGame(game);

			player.loggedOut();
			sendAllOnline("Online "+onlineClients.decrementAndGet());
		}

		websocket.kill(201);
		Log("disconnected");
	}
	
	void Log(Object obj) {
		TakServer.Log(clientNo+":"+((player!=null)?player.getName():"")+":"+obj);
	}
	
	void disconnect() {
		websocket.kill(202);
		/*
		try {
			//clientReader.close();
			
			socket.close();
		} catch (IOException ex) {
			Logger.getLogger(Client.class.getName()).log(Level.SEVERE, null, ex);
		}
		*/
	}

	@Override
	public void run() {
		String temp=null;
		try {
			while(!websocket.headerended && !websocket.streamended){
				temp=websocket.recieve(true);
			}
			websocket.send("Welcome!");
			websocket.send("Login or Register");
			Log("Welcome sent");
			mainloop:
			while (!websocket.streamended) {
				while(temp==null){
					temp=websocket.recieve(true);
					if(websocket.streamended){
						break mainloop;
					}
				}
				temp = temp.replaceAll("[\\n\\r]+$","");
				
				if(temp.equals("quit")){
					break;
				}
				
				if((pingPattern.matcher(temp)).find()) {
					sendWithoutLogging("OK");
					temp=null;
					continue;
				}
				
				Matcher m;

				if (player == null) {
					//Client name set
					if((m = clientPattern.matcher(temp)).find()){
						String clientversion=m.group(1);
						Log("Client !"+clientversion+"!");
						if(clientversion.equals("TreffnonX-08.09.16") || clientversion.equals("TakWeb-16.05.26")){
							sendWithoutLogging("Shout <Server> Your Playtak client is unfortunately no longer compatible. Please go to https://www.playtak.com in order to play.");
						}
					}
					//Login Guest
					else if ((loginGuestPattern.matcher(temp)).find()) {
						player = new Player();
						player.login(this);

						send("Welcome "+player.getName()+"!");
						Log("Player logged in");
						
						Seek.registerListener(this);
						Game.registerGameListListener(player);
						
						sendAllOnline("Online "+onlineClients.incrementAndGet());
					}
					//Login
					else if ((m = loginPattern.matcher(temp)).find()) {
						String tname = m.group(1).trim();
						synchronized(Player.players) {
							if (Player.players.containsKey(tname)) {
								Player tplayer = Player.players.get(tname);
								String pass = m.group(2).trim();

								if(!tplayer.authenticate(pass)) {
									send("Authentication failure");
//								} else if(tplayer.isLoggedIn()) {
//									send("You're already logged in");
								} else {
									if(tplayer.isLoggedIn()) {
										Client oldClient = tplayer.getClient();
										tplayer.send("Message You've logged in from another window. Disconnecting");
										tplayer.logout();
										//Wait for other connection to close before logging in
										try {
											oldClient.join();
										} catch (InterruptedException ex) {
											Logger.getLogger(Client.class.getName()).log(Level.SEVERE, null, ex);
										}
									}
									
									player = tplayer;

									send("Welcome "+player.getName()+"!");
									
									player.login(this);
									Log("Player logged in");
									
									Seek.registerListener(this);
									Game.registerGameListListener(player);
									
									sendAllOnline("Online "+onlineClients.incrementAndGet());
								}
							} else
								send("Authentication failure");
						}
					}
					//Registration
					else if ((m = registerPattern.matcher(temp)).find()) {
						String tname = m.group(1).trim();
						if(tname.toLowerCase().contains("guest")) {
							send("Can't register with guest in the name");
						} else {
							synchronized(Player.players) {
								if (Player.isNameTaken(tname)) {
									send("Name already taken");
								}
								else {
									String email = m.group(2).trim();
									Player tplayer = Player.createPlayer(tname, email);
									send("Registered "+tplayer.getName()+". Check your email for password");
								}
							}
						}
					}
					//Wrong registration chars
					else if ((wrongRegisterPattern.matcher(temp)).find()) {
						send("Unknown format for username/email. Only [a-z][A-Z][0-9][_] allowed for username, it should be 4-16 characters and should start with letter");
					}
					//SendResetToken
					else if ((m = sendResetTokenPattern.matcher(temp)).find()) {
						String tname = m.group(1).trim();
						String email = m.group(2).trim();
						if(Player.players.containsKey(tname)) {
							Player tplayer = Player.players.get(tname);
							if(email.equals(tplayer.getEmail())) {
								tplayer.sendResetToken();
								send("Reset token sent");
							} else {
								send("Email address does not match");
							}
						} else {
							send("No such player");
						}
					}
					//ResetPassword
					else if ((m = resetPasswordPattern.matcher(temp)).find()) {
						String tname = m.group(1);
						String token = m.group(2);
						String pass = m.group(3);
						if(Player.players.containsKey(tname)) {
							Player tplayer = Player.players.get(tname);
							if(tplayer.resetPassword(token, pass)) {
								send("Password is changed");
							} else {
								send("Wrong token");
							}
						} else {
							send("No such player");
						}
					}
					else
						send("Login or Register");
				} else {
					Log("Read:"+temp);
					
					Game game = player.getGame();
					//List all seeks
					if ((m = listPattern.matcher(temp)).find()) {
						Seek.sendListTo(this);

					}
					//Seek a game
					else if (game==null && (m = seekPattern.matcher(temp)).find()) {
						if (seek != null) {
							Seek.removeSeek(seek.no);
						}
						int no = Integer.parseInt(m.group(1));
						if(no == 0) {
							Log("Seek remove");
							seek = null;
						} else {
							Seek.COLOR clr = Seek.COLOR.ANY;
							
							if("W".equals(m.group(4)))
								clr = Seek.COLOR.WHITE;
							else if("B".equals(m.group(4)))
								clr = Seek.COLOR.BLACK;
							seek = Seek.newSeek(
								this
								,Integer.parseInt(m.group(1))
								,Integer.parseInt(m.group(2))
								,Integer.parseInt(m.group(3))
								,clr
								,Integer.parseInt(m.group(5))
								,Integer.parseInt(m.group(6))
								,Integer.parseInt(m.group(7))
								,Integer.parseInt(m.group(8))
								,Integer.parseInt(m.group(9))
								,m.group(10)
							);
							Log("Seek "+seek.boardSize);
						}
					}
					//Seek a game
					else if (game==null && (m = oldSeekPattern.matcher(temp)).find()) {
						if (seek != null) {
							Seek.removeSeek(seek.no);
						}
						int no = Integer.parseInt(m.group(1));
						if(no == 0) {
							Log("Seek remove");
							seek = null;
						} else {
							Seek.COLOR clr = Seek.COLOR.ANY;
							
							if(" W".equals(m.group(4)))
								clr = Seek.COLOR.WHITE;
							else if(" B".equals(m.group(4)))
								clr = Seek.COLOR.BLACK;
								
							int capstonesCount=0;
							int tilesCount=0;
							switch(Integer.parseInt(m.group(1))) {
								case 3: capstonesCount = 0; tilesCount = 10; break;
								case 4: capstonesCount = 0; tilesCount = 15; break;
								case 5: capstonesCount = 1; tilesCount = 21; break;
								case 6: capstonesCount = 1; tilesCount = 30; break;
								case 7: capstonesCount = 2; tilesCount = 40; break;
								case 8: capstonesCount = 2; tilesCount = 50; break;
							}
								
							seek = Seek.newSeek(
								this
								,Integer.parseInt(m.group(1))
								,Integer.parseInt(m.group(2))
								,Integer.parseInt(m.group(3))
								,clr
								,0
								,tilesCount
								,capstonesCount
								,0
								,0
								,""
							);
							Log("Seek "+seek.boardSize);
						}
					}
					//Accept a seek
					else if (game==null && (m = acceptSeekPattern.matcher(temp)).find()) {
						Seek sk = Seek.seeks.get(Integer.parseInt(m.group(1)));

						if (sk != null && game == null && sk.client.player.getGame() == null && sk!=seek && (sk.opponent.toLowerCase().equals(player.getName().toLowerCase()) || sk.opponent.equals(""))) {
							removeSeeks();

							Client otherClient = sk.client;
							int sz = sk.boardSize;
							int time = sk.time;
							otherClient.removeSeeks();

							unspectateAll();
							otherClient.unspectateAll();
							
							game = new Game(player, otherClient.player, sz, time, sk.incr, sk.color, sk.komi, sk.pieces, sk.capstones, sk.unrated, sk.tournament);
							Game.addGame(game);
							
							player.setGame(game);
							otherClient.player.setGame(game);
							
							String msg = "Game Start " + game.no +" "+sz+" "+game.white.getName()+" vs "+game.black.getName();
							String msg2=time+" "+sk.komi+" "+sk.pieces+" "+sk.capstones;
							send(msg+" "+((game.white==player)?"white":"black")+" "+msg2);
							otherClient.send(msg+" "+((game.white==otherClient.player)?"white":"black")+" "+msg2);
						} else {
							sendNOK();
						}
					}
					//Handle place move
					else if (game != null && (m = placePattern.matcher(temp)).find() && game.no == Integer.parseInt(m.group(1))) {
						Status st = game.placeMove(player, m.group(2).charAt(0), Integer.parseInt(m.group(3)), m.group(4) != null, m.group(5)!=null);
						if(st.isOk()){

							if(game.gameState!=Game.gameS.NONE){
								Player otherPlayer = (game.white==player)?game.black:game.white;
								Game.removeGame(game);
								player.removeGame();
								otherPlayer.removeGame();
							}
						} else {
							sendNOK();
							send("Error:"+st.msg());
						}
					}
					//Handle move move
					else if (game!=null && (m = movePattern.matcher(temp)).find() && game.no == Integer.parseInt(m.group(1))) {
						String args[] = m.group(6).split(" ");
						int argsint[] = new int[args.length-1];
						for(int i=1;i<args.length;i++)
							argsint[i-1] = Integer.parseInt(args[i]);
						Status st = game.moveMove(player, m.group(2).charAt(0), Integer.parseInt(m.group(3)), m.group(4).charAt(0), Integer.parseInt(m.group(5)), argsint);
						if(st.isOk()){

							if(game.gameState!=Game.gameS.NONE){
								Player otherPlayer = (game.white==player)?game.black:game.white;
								Game.removeGame(game);
								player.removeGame();
								otherPlayer.removeGame();
							}
						} else {
							sendNOK();
							send("Error:"+st.msg());
						}
					}
					//Handle undo offer
					else if (game!=null && (m = undoPattern.matcher(temp)).find() && game.no == Integer.parseInt(m.group(1))) {
						game.undo(player);
					}
					//Handle removing undo offer
					else if (game!=null && (m = removeUndoPattern.matcher(temp)).find() && game.no == Integer.parseInt(m.group(1))) {
						game.removeUndo(player);
					}
					//Handle draw offer
					else if (game!=null && (m = drawPattern.matcher(temp)).find() && game.no == Integer.parseInt(m.group(1))) {
						game.draw(player);
						Player otherPlayer = (game.white==player)?game.black:game.white;

						if(game.gameState!=Game.gameS.NONE){
							Game.removeGame(game);
							player.removeGame();
							otherPlayer.removeGame();
						}
					}
					//Handle removing draw offer
					else if (game!=null && (m = removeDrawPattern.matcher(temp)).find() && game.no == Integer.parseInt(m.group(1))) {
						game.removeDraw(player);
					}
					//Handle resignation
					else if (game!=null && (m = resignPattern.matcher(temp)).find() && game.no == Integer.parseInt(m.group(1))) {
						game.resign(player);
						Player otherPlayer = (game.white==player)?game.black:game.white;
						
						Game.removeGame(game);
						player.removeGame();
						otherPlayer.removeGame();
					}
					//Show game state
					else if (game != null && (m=gamePattern.matcher(temp)).find() && game.no == Integer.parseInt(m.group(1))) {
						send(game.toString());
					}
					//Show sq state for a game
					else if (game != null && (m=getSqStatePattern.matcher(temp)).find() && game.no == Integer.parseInt(m.group(1))) {
						send("Game#"+game.no+" Show Sq "+game.sqState(m.group(2).charAt(0), Integer.parseInt(m.group(3))));
					}
					//GameList
					else if ((m=gameListPattern.matcher(temp)).find()){
						Game.sendGameListTo(player);
					}
					//ObserveGame
					else if ((m=observePattern.matcher(temp)).find()){
						game = Game.games.get(Integer.parseInt(m.group(1)));
						if(game!=null){
							spectating.add(game);
							game.newSpectator(player);
							/*
							if(spectating.contains(game)) {
								send("Message you're already observing this game");
							} else {
								spectating.add(game);
								game.newSpectator(player);
								
								ChatRoom room = ChatRoom.get("Game"+game.no);
								if(room == null) {
									room = ChatRoom.addRoom("Game"+game.no);
								}
								addToRoom(room);
							}
							*/
						} else
							sendNOK();
					}
					//UnobserveGame
					else if ((m=unobservePattern.matcher(temp)).find()){
						game = Game.games.get(Integer.parseInt(m.group(1)));
						if(game!=null){
							spectating.remove(game);
							game.unSpectate(player);
						} else
							sendNOK();
					}
					//Shout
					else if ((m=shoutPattern.matcher(temp)).find()){
						String msg = "<"+player.getName()+"> "+m.group(1);
						
						if(!player.isGagged()) {
							sendAllOnline("Shout "+msg);
							IRCBridge.send(msg);
						} else//send to only gagged player
							sendWithoutLogging("Shout "+msg);
					}
					//JoinRoom
					else if((m=joinRoomPattern.matcher(temp)).find()) {
						addToRoom(m.group(1));
					}
					//LeaveRoom
					else if((m=leaveRoomPattern.matcher(temp)).find()) {
						removeFromRoom(m.group(1));
					}
					//ShoutRoom
					else if ((m=shoutRoomPattern.matcher(temp)).find()) {
						ChatRoom.shout(m.group(1),this,m.group(2));
					}
					//Tell
					else if ((m=tellPattern.matcher(temp)).find()) {
						if(Player.players.containsKey(m.group(1))) {
							Player tplayer = Player.players.get(m.group(1));
							tplayer.send("Tell "+"<"+player.getName()+"> "+
												m.group(2));
							send("Told "+"<"+tplayer.getName()+"> "+
												m.group(2));
						} else {
							send("No such player");
						}
					}
					//ChangePassword old new
					else if ((m=changePasswordPattern.matcher(temp)).find()) {
						String curPass = m.group(1);
						String newPass = m.group(2);
						
						if(player.authenticate(curPass)) {
							player.setPassword(newPass);
							send("Password changed");
						} else {
							send("Wrong password");
						}
					}
					//sudo
					else if ((m=sudoPattern.matcher(temp)).find()){
						sudoHandler(temp);
					}
					//Undefined
					else {
						sendNOK();
					}
				}
				temp=websocket.recieve(true);
			}
		} finally {
			try {
				clientQuit();
			} catch (IOException ex) {
				Logger.getLogger(Client.class.getName()).log(Level.SEVERE, null, ex);
			}
		}
	}
	
	public void addToRoom(String room) {
		chatRooms.add(room);
		ChatRoom.joinRoom(room,this);
		send("Joined room "+room);
	}
	
	public void removeFromRoom(String room) {
		chatRooms.remove(room);
		ChatRoom.leaveRoom(room,this);
	}
	
	public void removeFromAllRooms() {
		for(String room : chatRooms){
			ChatRoom.leaveRoom(room,this);
		}
		chatRooms.clear();
	}
	
	//this has more rights than p
	boolean moreRights(Player p) {
		//no one has rights over me, not even me
		if(p.getName().equals("kakaburra"))
			return false;
		
		//i have all the rights
		if(player.getName().equals("kakaburra"))
			return true;
		
		//if i am mod and other is not mod
		if(player.isMod() && !p.isMod())
			return true;
		
		return false;
	}
	
	void sudoHandler(String msg) {
		if(!player.isMod() && !player.getName().equals("kakaburra")) {
			sendNOK();
			return;
		}
		
		sendCmdReply("> "+msg);
		
		Matcher m;
		
		if((m=unGagPattern.matcher(msg)).find()) {
			String name = m.group(1);
			Player p = Player.players.get(name);
			if(p == null) {
				sendCmdReply("No such player");
				return;
			}
			
			if(!moreRights(p)) {
				sendCmdReply("You dont have rights");
				return;
			}
			
			p.unGag();
			sendCmdReply(p.getName()+" ungagged");
		}
		else if((m=gagPattern.matcher(msg)).find()) {
			String name = m.group(1);
			Player p = Player.players.get(name);
			if(p == null) {
				sendCmdReply("No such player");
				return;
			}
			
			if(!moreRights(p)) {
				sendCmdReply("You dont have rights");
				return;
			}
			
			p.gag();
			sendCmdReply(p.getName()+" gagged");
		}
		else if((m=kickPattern.matcher(msg)).find()) {
			String name = m.group(1);
			Player p = Player.players.get(name);
			if(p == null) {
				sendCmdReply("No such player");
				return;
			}
			
			if(!moreRights(p)) {
				sendCmdReply("You dont have rights");
				return;
			}
			
			Client c = p.getClient();
			if(c == null) {
				sendCmdReply("Player not logged in");
				return;
			}
			
			c.disconnect();
			sendCmdReply(p.getName()+" kicked");
			
		}
		else if((m=listCmdPattern.matcher(msg)).find()) {
			String var = m.group(1);
			if("gag".equals(var)) {
				String res="[";
				for(Player p: Player.gagList)
					res += p.getName()+", ";
				
				sendCmdReply(res+"]");
			}
			else if ("mod".equals(var)) {
				String res = "[";
				for(Player p: Player.modList)
					res += p.getName()+", ";
				
				sendCmdReply(res+"]");
			}
			else {
				//previliged commands - only for me
				if(!player.getName().equals("kakaburra")) {
					sendCmdReply("command not found");
					return;
				}
				
				if("online".equals(var)) {
					String res = "[";
					for(Client c: clientConnections) {
						if(c.player != null)
							res += c.player.getName()+", ";
					}
					sendCmdReply(res+"]");
				}
			}
		}
		else {
			//previliged commands - only for me
			if(!player.getName().equals("kakaburra")) {
				sendCmdReply("command not found");
				return;
			}

			if((m=modPattern.matcher(msg)).find()) {
				String name = m.group(1);
				System.out.println("here "+name+" "+msg);
				Player p = Player.players.get(name);
				if(p == null) {
					sendCmdReply("No such player");
					return;
				}
				p.setMod();
				sendCmdReply("Added "+p.getName()+" as moderator");
			}
			else if((m=unModPattern.matcher(msg)).find()) {
				String name = m.group(1);
				Player p = Player.players.get(name);
				if(p == null) {
					sendCmdReply("No such player");
					return;
				}
				p.unMod();
				sendCmdReply("Removed "+p.getName()+" as moderator");
			}
			else if((m=setPattern.matcher(msg)).find()) {
				String param = m.group(1);
				String name = m.group(2);
				String value = m.group(3);
				
				Player p = Player.players.get(name);
				if(p == null) {
					sendCmdReply("No such player");
					return;
				}
				if(param.equals("password")) {
					p.setPassword(value);
					sendCmdReply("Password set");
				}
			}
			else if((m=broadcastPattern.matcher(msg)).find()) {
				String bmsg = m.group(1);
				Client.sendAllOnline(bmsg);
			}
		}
	}
	
	static void sigterm() {
		TakServer.Log("Sigterm!");
		try {
			BufferedReader br = new BufferedReader(new FileReader(new File("message")));
			String msg = br.readLine();
			sendAll("Message "+msg);
			
			int sleep=Integer.parseInt(br.readLine());
			TakServer.Log("sleeping "+sleep+" milliseconds");
			Thread.sleep(sleep);
			sendAll("Message "+br.readLine());
			
			TakServer.Log("Exiting");
		} catch (IOException | NumberFormatException | InterruptedException ex) {
			TakServer.Log(ex);
		}
		
	}
}
