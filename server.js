var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);

app.use(express.static('.'));

server.listen(8080, function() {
	console.log("Listening on 8080");
});

var history = []; //keeps track of all lines drawn on canvas

function LoadHistory(socket) { //loads current canvas to new user
	for (var data in history) {
		socket.emit('drawLine', {
			line: history[data].line,
			style: history[data].style
		});
	}
}

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

app.get('/', function(req, res) {
	res.sendFile(__dirname + '/draw.html');
});

app.post('/draw', function (req, res) {
	console.log("Drawing..");
});
