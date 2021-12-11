package tak;

import java.net.*;
import java.io.*;
import java.nio.*;
import java.nio.charset.*;
import java.util.*;
import java.util.regex.*;
import java.security.*;
import java.util.concurrent.locks.*;

/**
 *
 * @author Nohat
 */

public class Websocket{
	public Socket socket;
	InputStream stream;
	OutputStream outstream;
	final int buffersize=0x10010;
	byte[] readbuffer;
	ByteBuffer readbufferobj;
	int readbufferused;
	int readbufferoffset;
	byte[] messagebuffer;
	ByteBuffer messagebufferobj;
	int messagebufferused;
	int currentmessage;
	
	Lock writelock;
	
	boolean recievedtoken;
	public boolean headerended;
	public boolean streamended;
	
	Pattern websocketkeyPattern;
	String wskey;
	
	Websocket(){
		
	}
	
	Websocket(Socket socket){
		this.socket = socket;
		streamended=false;
		try{
			socket.setSoTimeout(90*1000);
			stream=socket.getInputStream();
			outstream=socket.getOutputStream();
		}
		catch(Throwable t){
			kill(1);
		}
		readbuffer=new byte[buffersize*2+8];
		readbufferused=0;
		readbufferobj=ByteBuffer.wrap(readbuffer);
		readbufferoffset=0;
		messagebuffer=new byte[buffersize+8];
		messagebufferused=0;
		messagebufferobj=ByteBuffer.wrap(messagebuffer);
		recievedtoken=false;
		headerended=false;

		currentmessage=0;
		
		writelock=new ReentrantLock();
		
		websocketkeyPattern=Pattern.compile("^Sec-WebSocket-Key: *(.*)$", Pattern.CASE_INSENSITIVE);
		wskey="";

	}
	
	public String recieve(boolean blocking){
		try{
			//TakServer.Log("New recieve "+String.valueOf(readbufferused));
			if(streamended){
				return null;
			}
			int readable=stream.available();
			if(readable>0){
				int dataread=stream.read(readbuffer,readbufferused+readbufferoffset,Math.min(buffersize-readbufferused,readable));
				if(dataread<0){
					kill(2);
					return null;
				}
				readbufferused+=dataread;
				//TakServer.Log("Got data "+String.valueOf(readbufferused));
			}
			if(headerended){
				if(readbufferused>=2){
					int opcode=readbuffer[0+readbufferoffset]&15;
					boolean finalframe=(readbuffer[0+readbufferoffset]&128)==128;
					boolean usemask=(readbuffer[1+readbufferoffset]&128)==128;
					int framelength=readbuffer[1+readbufferoffset]&127;
					if(framelength==127){
						kill(3);
						return null;
					}
					int headerlength=2;
					if(framelength==126){
						headerlength+=2;
					}
					if(usemask){
						headerlength+=4;
					}
					if(readbufferused>=headerlength){
						if(framelength==126){
							framelength=(readbuffer[3+readbufferoffset]&255)+256*(readbuffer[2+readbufferoffset]&255);
						}
						if(readbufferused>=framelength+headerlength){
							int mask=0;
							if(usemask){
								mask=readbufferobj.getInt(readbufferoffset+headerlength-4);
							}
							if(currentmessage==0){
								if(opcode==0){
									kill(4);
									return null;
								}
								currentmessage=opcode;
							}
							else{
								if(opcode!=0){
									kill(5);
									return null;
								}
							}
							if(framelength>buffersize-messagebufferused){
								kill(6);
								return null;
							}
							int a;
							for(a=0;a<framelength;a+=4){
								messagebufferobj.putInt(messagebufferused+a,mask^readbufferobj.getInt(readbufferoffset+headerlength+a));
							}
							messagebufferused+=framelength;
							
							//TakServer.Log("Got frame "+new String(messagebuffer,0,messagebufferused,StandardCharsets.ISO_8859_1)+" "+String.valueOf(readbuffer[0+readbufferoffset])+" "+String.valueOf(readbuffer[1+readbufferoffset])+" "+String.valueOf(finalframe)+" "+String.valueOf(opcode));
							
							readbufferoffset+=headerlength+framelength;
							readbufferused-=headerlength+framelength;
							if(readbufferoffset>buffersize){
								readbufferobj.position(0);
								readbufferobj.put(readbuffer,readbufferoffset,readbufferused);
								readbufferoffset=0;
							}

							if(finalframe){
								if(currentmessage==1 || currentmessage==2){
									String response=new String(messagebuffer,0,messagebufferused,StandardCharsets.ISO_8859_1);
									currentmessage=0;
									messagebufferused=0;
									//TakServer.Log("Recieved message");
									//TakServer.Log(response);
									return response;
								}
								else if(currentmessage==8){
									kill(7);
									return null;
								}
								else if(currentmessage==9){
									String response=new String(messagebuffer,0,messagebufferused,StandardCharsets.ISO_8859_1);
									currentmessage=0;
									messagebufferused=0;
									send(response,10);
								}
								else if(currentmessage==10){
									currentmessage=0;
									messagebufferused=0;
								}
								else{
									kill(8);
									return null;
								}
							}
							return recieve(false);
						}
					}
				}
				if(blocking){
					int dataread=stream.read(readbuffer,readbufferused+readbufferoffset,buffersize-readbufferused);
					if(dataread<0){
						kill(9);
						return null;
					}
					readbufferused+=dataread;
					return recieve(false);
				}
				return null;
			}
			else{
				int a;
				for(a=0;a<readbufferused-1;a++){
					if(readbuffer[a+readbufferoffset]==13 && readbuffer[a+readbufferoffset+1]==10){
						if(a==0){
							if(recievedtoken){
								writelock.lock();
								try{
									sendstring("HTTP/1.1 101 Switching Protocols\r\n");
									sendstring("Upgrade: websocket\r\n");
									sendstring("Connection: Upgrade\r\n");
									sendstring("Sec-WebSocket-Protocol: binary\r\n");
									sendstring("Sec-WebSocket-Accept: ");
									sendstring(wskey);
									sendstring("\r\n\r\n");
									outstream.flush();
								}
								finally{
									writelock.unlock();
								}
								headerended=true;
							}
							else{
								kill(10);
								return null;
							}
						}
						else{
							String header=new String(readbuffer,readbufferoffset,a,StandardCharsets.ISO_8859_1);
							Matcher match = websocketkeyPattern.matcher(header);
							if(match.find()){
								wskey=Base64.getEncoder().encodeToString(MessageDigest.getInstance("SHA-1").digest((match.group(1) + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").getBytes("UTF-8")));
								recievedtoken=true;
							}
						}
						readbufferoffset+=a+2;
						readbufferused-=a+2;
						
						if(readbufferoffset>buffersize){
							readbufferobj.position(0);
							readbufferobj.put(readbuffer,readbufferoffset,readbufferused);
							readbufferoffset=0;
						}
						
						return recieve(false);
					}
				}
				if(readbufferused>=buffersize){
					kill(11);
					return null;
				}
				if(blocking){
					int dataread=stream.read(readbuffer,readbufferused+readbufferoffset,buffersize-readbufferused);
					if(dataread<0){
						kill(12);
						return null;
					}
					readbufferused+=dataread;
					return recieve(false);
				}
				return null;
			}
		}
		catch(Throwable t){
			t.printStackTrace();
			kill(13);
			return null;
		}
	}
	void sendstring(String str){
		try{
			byte[] bytes = str.getBytes( StandardCharsets.ISO_8859_1 );
			outstream.write(bytes);
		}
		catch(Throwable t){
			kill(14);
		}
	}
	void send(String msg, int opcode){
		if(!headerended || streamended){
			return;
		}
		writelock.lock();
		try{
			//int mask=rand.nextInt(32);
			byte[] bytes = msg.getBytes( StandardCharsets.ISO_8859_1 );
			outstream.write(128+opcode);
			int outlen=bytes.length+1;
			if(outlen<126){
				outstream.write(outlen);
			}
			else if(outlen<65536){
				outstream.write(126);
				outstream.write(outlen>>8);
				outstream.write(outlen);
			}
			else{
				outstream.write(127);
				outstream.write(0);
				outstream.write(0);
				outstream.write(0);
				outstream.write(0);
				outstream.write(outlen>>24);
				outstream.write(outlen>>16);
				outstream.write(outlen>>8);
				outstream.write(outlen);
			}
			outstream.write(bytes);
			outstream.write(10);
			outstream.flush();
		}
		catch(Throwable t){
			//TakServer.Log(t.getMessage());
			kill(15);
		}
		finally{
			writelock.unlock();
		}
	}
	/*
	void send(String msg, int opcode){
		try{
			//int mask=rand.nextInt(32);
			byte[] bytes = msg.getBytes( StandardCharsets.ISO_8859_1 );
			outstream.write(128+opcode);
			if(bytes.length<126){
				outstream.write(bytes.length);
			}
			else if(bytes.length<65536){
				outstream.write(126);
				outstream.write(bytes.length>>8);
				outstream.write(bytes.length);
			}
			else{
				outstream.write(127);
				outstream.write(0);
				outstream.write(0);
				outstream.write(0);
				outstream.write(0);
				outstream.write(bytes.length>>24);
				outstream.write(bytes.length>>16);
				outstream.write(bytes.length>>8);
				outstream.write(bytes.length);
			}
			outstream.write(bytes);
			outstream.flush();
		}
		catch(Throwable t){
			TakServer.Log(t.getMessage());
			kill(15);
		}
	}
	*/
	/*
	void send(String msg, int opcode){
		try{
			int mask=rand.nextInt(32);
			byte[] bytes = msg.getBytes( StandardCharsets.ISO_8859_1 );
			outstream.write(128+opcode);
			if(bytes.length<126){
				outstream.write(128+bytes.length);
			}
			else if(bytes.length<65536){
				outstream.write(254);
				outstream.write(bytes.length>>8);
				outstream.write(bytes.length);
			}
			else{
				outstream.write(255);
				outstream.write(0);
				outstream.write(0);
				outstream.write(0);
				outstream.write(0);
				outstream.write(bytes.length>>24);
				outstream.write(bytes.length>>16);
				outstream.write(bytes.length>>8);
				outstream.write(bytes.length);
			}
			outstream.write(mask);
			outstream.write(mask>>8);
			outstream.write(mask>>16);
			outstream.write(mask>>24);
			int a;
			for(a=0;a<bytes.length-3;a+=4){
				outstream.write(mask^bytes[a]);
				outstream.write((mask>>8)^bytes[a+1]);
				outstream.write((mask>>16)^bytes[a+2]);
				outstream.write((mask>>24)^bytes[a+3]);
			}
			if(a<bytes.length){
				outstream.write(mask^bytes[a]);
				a++;
			}
			if(a<bytes.length){
				outstream.write((mask>>8)^bytes[a]);
				a++;
			}
			if(a<bytes.length){
				outstream.write((mask>>16)^bytes[a]);
				a++;
			}
			outstream.flush();
		}
		catch(Throwable t){
			TakServer.Log(t.getMessage());
			kill(15);
		}
	}
	*/
	public void send(String msg){
		send(msg,2);
	}
	public void kill(int pos){
		try{
			streamended=true;
			socket.close();
			
			TakServer.Log("Stream dead "+String.valueOf(pos));
			/*
			TakServer.Log(String.valueOf(readbufferused)+" "+String.valueOf(messagebufferused));
			TakServer.Log(new String(messagebuffer,0,messagebufferused,StandardCharsets.ISO_8859_1));
			*/
		}
		catch(Throwable t){
			
		}
	}
}


