package tak;

import java.net.*;
import java.io.*;
import java.nio.*;
import java.nio.charset.*;
import java.util.*;
import java.security.*;
import java.util.concurrent.locks.*;

/**
 *
 * @author Nohat
 */



public class Telnet extends Websocket{
	//public Socket socket;
	InputStream stream;
	OutputStream outstream;
	final int buffersize=0x10010;
	byte[] readbuffer;
	ByteBuffer readbufferobj;
	int readbufferused;
	int readbufferoffset;
	
	Lock writelock;
	
	//public boolean headerended;
	//public boolean streamended;
	
	Telnet(Socket socket){
		this.socket = socket;
		streamended=false;
		try{
			socket.setSoTimeout(60*1000);
			stream=socket.getInputStream();
			outstream=socket.getOutputStream();
		}
		catch(Throwable t){
			kill(101);
		}
		readbuffer=new byte[buffersize*2+8];
		readbufferused=0;
		readbufferobj=ByteBuffer.wrap(readbuffer);
		readbufferoffset=0;
		headerended=true;
		
		writelock=new ReentrantLock();
	}
	
	public String recieve(boolean blocking){
		try{
			if(streamended){
				return null;
			}
			int readable=stream.available();
			if(readable>0){
				readbufferused+=stream.read(readbuffer,readbufferused+readbufferoffset,Math.min(buffersize-readbufferused,readable));
			}
			
			int a;
			for(a=0;a<readbufferused;a++){
				if(readbuffer[a+readbufferoffset]==10){
					String msg=new String(readbuffer,readbufferoffset,a,StandardCharsets.ISO_8859_1);
					readbufferoffset+=a+1;
					readbufferused-=a+1;
					
					if(readbufferoffset>buffersize){
						readbufferobj.position(0);
						readbufferobj.put(readbuffer,readbufferoffset,readbufferused);
						readbufferoffset=0;
					}
					/*
					if(msg.equals("PING")){
						send("OK");
						return recieve(false);
					}
					*/
					return msg;
				}
			}
			if(readbufferused>=buffersize){
				kill(102);
				return null;
			}
			if(blocking){
				int dataread=stream.read(readbuffer,readbufferused+readbufferoffset,buffersize-readbufferused);
				if(dataread<0){
					kill(103);
					return null;
				}
				readbufferused+=dataread;
				return recieve(false);
			}
			return null;
		}
		catch(Throwable t){
			kill(104);
			return null;
		}
	}
	public void send(String msg){
		if(streamended){
			return;
		}
		writelock.lock();
		try{
			byte[] bytes = msg.getBytes( StandardCharsets.ISO_8859_1 );
			outstream.write(bytes);
			outstream.write(10);
			outstream.flush();
		}
		catch(Throwable t){
			kill(105);
		}
		finally{
			writelock.unlock();
		}
	}
	public void kill(int pos){
		try{
			streamended=true;
			socket.close();
		}
		catch(Throwable t){
			
		}
	}
}
