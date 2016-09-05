var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mongoose = require('mongoose');
var users= {};

http.listen(3000,function(){
	console.log('listening on *:3000');
});

app.get('/',function(req,res){
	res.sendFile(__dirname + '/view/index.html');
	});

app.use(express.static(__dirname));

mongoose.connect('mongodb://localhost/chatRoom', function(err){
	if(err){
		console.log(err);
	} else{
		console.log("MongoDB connection successful!!");
	}
});

var chatRoomSchema = mongoose.Schema({
	user: String,
	msg: String,
	created: String
});

var ChatRoomModel = mongoose.model('Message',chatRoomSchema);


io.on('connection', function (socket) {
	var query = ChatRoomModel.find({});
	query.sort('-created').limit(11).exec(function(error,docs){
		if(error) throw error;
		socket.emit('message_to_client_old_messages', docs);
	});
	
	socket.on('new user', function(data, callback){
		if(data in users){
			callback(false);
		} else{
			callback(true);
			socket.userName = data;
			users[socket.userName]=socket;
			updateUserNames();
		}
	});
	
	socket.on('message_to_server', function(msg, date, callback){
		var message =msg.trim();
		if (message.substr(0,3) ==='/w '){
			message =message.substr(3);
			var index =message.indexOf(' ');
			if (index !== -1){
				var name =message.substring(0,index);
				message =message.substring(index+1);
				if(name in users){
					users[name].emit('message_to_client_whisper',{msg:message, user:socket.userName});
				} else{
					callback('ERROR! please enter a valid user.');
				}
			} else{
				callback('ERROR! Please add a private message.');
			}
		} else{
			var newMsg = new ChatRoomModel({msg:message, user:socket.userName, created:date});
			newMsg.save(function(error){
				if(error) throw error;
				io.emit('message_to_client', {msg:message, user:socket.userName, created:date});
//		socket.bradcast.emit('message_to_client', msg);  //to broadcast the message to everyone except the sender
			});
		}
	}); 
	
	socket.on('disconnect',function(data){
	if(!socket.userName){
		return;
	}
	delete users[socket.userName];
	updateUserNames();
	});
	
	function updateUserNames(){
		io.emit('usernames', Object.keys(users));
	}
	
	
});
