var mysql = require('mysql');
var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
app.use(express.static("."));
app.use(session({
	secret:'DASD',
	resave: true,
	saveUninitialized: true	
}));
var ssn ;
app.use(bodyParser.urlencoded({extended : true}));
app.use(bodyParser.json());

var history = []; //keeps track of all lines drawn on canvas
function LoadHistory(socket) { //loads current canvas to new user
	for (var data in history) {
		socket.emit('drawLine', {
			line: history[data].line,
			style: history[data].style
		});
	}
}

var con = mysql.createConnection({
	host: 'localhost',
	user: 'root',
	password: 'Wiz;Ap1;EZdd1',
	database: 'draw_stuff_db'
	});
con.connect(function(err) {
	if (err) {
		console.log(err)
	}
	else {
		console.log("Connected")
	}
});
io.on('connection', function(socket) {
	LoadHistory(socket);
	console.log('A user connected');
	socket.on('disconnect', function(){
		console.log('user disconnected');
	});
	socket.on('msgToServer', function(message){
		console.log('Got message '+message);
		io.emit('msgAppendToClient', {message: message, username: ssn.username});
	});
});
io.on('connection', function (socket) {
	LoadHistory(socket);
	
	socket.on('drawLine', function (data) {
		history.push(data);
		io.emit('drawLine', {
			line: data.line,
			style: data.style
		});
	});
	
	socket.on('move', function (data) {
		io.emit('draw', data);
	});
	
});
app.post('/draw', function (req, res) {
	console.log("Drawing..");
});
app.post('/login', function (req, res) {
	ssn = req.session;
	ssn.loggedin = false;
	var username = req.body.username;
	var password = req.body.password;
	console.log(username);
	console.log(password);
	con.query('Select username, password from users WHERE username = "'+username+'" && password = "'+password+'"', function(err, results, fields) {
		if (results.length == 0) {
			console.log('Invalid User');
			ssn.msg = 'Incorrect Username or Password';
			return res.redirect('/login.html');
		} 
		else {
			console.log('Found User');
			ssn.loggedin = true;
			ssn.username = username;
			res.redirect('./pagelist');
		}
		res.end();
	});		
});
app.get('/sendMsg', function (req, res) {
	var chatlog = req.query.key;
	res.send(chatlog);
});
app.get('/pagelist', function (req, res) {
	if (!ssn.loggedin) {
		console.log('Not logged in, redirected');
		ssn.msg = 'You need to login to view this page';
		return res.redirect('/login.html');
	} else {
		res.redirect('./pagelist.html');
	}
});
// CHECKS IF ROOMS HAVE THE SAME NAME, IF NOT, POST IT ON THE DATABASE AND POPULATE HTML.
app.post('/onload', function(req, res) {
	con.query('SELECT * FROM rooms', function(err, rows, fields) {
		var htmlstr = '<div>';
		for(var i=0; i<rows.length; i++) {
			roomnameSQL = rows[i].ROOMNAME;
			console.log(roomnameSQL);
			htmlstr += "<ul><li><a id='"+roomnameSQL+"'href='http://localhost:8080/draw.html'>"+roomnameSQL+"</a></li></ul>";
		}
		htmlstr += '</div>';
		console.log('Added Room(s)');
		res.send(htmlstr);
	});
});
app.post('/createroom', function(req, res) {
	var roomname = req.body.n;
	console.log(roomname);
	
	con.query('SELECT ROOMNAME FROM rooms WHERE ROOMNAME = "'+ roomname +'"', function(err, rows, fields) {
		if (err) {
			console.log('Error checking rooms');
			console.log(err);
			res.send('Cannot add room to database');
		}
		else if (rows.length > 0) {
			console.log('Cannot add, roomname already exists');
			res.send('Roomname already exists');
		}
		else {
			
			con.query('INSERT INTO rooms(ROOMNAME)VALUES("' + roomname + '")', function(err, rows, fields) {
				if (err) {
					console.log('Error adding roomname');
					console.log(err);
					res.send('Error adding roomname');
				}
				else {
					con.query('SELECT * FROM rooms', function(err, rows, fields) {
						var htmlstr = '<div>';
						for(var i=0; i<rows.length; i++) {
							roomnameSQL = rows[i].ROOMNAME;
							console.log(roomnameSQL);
							htmlstr += "<ul><li><a id='"+roomnameSQL+"'href='http://localhost:8080/draw.html'>"+roomnameSQL+"</a></li></ul>";
						}
						htmlstr += '</div>';
						console.log('Added Room(s)');
						res.send(htmlstr);
					});
				}
			});
		}
	});
});

app.post('/delroom', function(req, res) {
	var roomname = req.body.d;
	con.query('DELETE FROM rooms WHERE ROOMNAME="'+roomname+'"', function(err,rows,fields) {
		if (err) {
			console.log("Room name doesn't exist");
			console.log(err);
			res.send('Cannot delete room from database');
		}
		else {
			con.query('SELECT * FROM rooms', function(err, rows, fields) {
				var htmlstr = '<div>';
				for(var i=0; i<rows.length; i++) {
					roomnameSQL = rows[i].ROOMNAME;
					htmlstr += "<ul><li><a id='"+roomnameSQL+"'href='http://localhost:8080/draw.html'>"+roomnameSQL+"</a></li></ul>";
					}
				htmlstr += '</div>';
				console.log("Deleted room: "+roomname);
				res.send(htmlstr);
			});
		}
	});
});
http.listen(8080, function() {
	console.log('listening on *:8080');
});