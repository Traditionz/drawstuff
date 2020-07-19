function hsvToRgb(h, s, v) {
	var r, g, b;
	var i;
	var f, p, q, t;
 
	s /= 100;
	v /= 100;
 
	if(s == 0) {
		// Achromatic (grey)
		r = g = b = v;
		return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
	}
 
	h /= 60; // sector 0 to 5
	i = Math.floor(h);
	f = h - i; // factorial part of h
	p = v*(1 - s);
	q = v*(1 - s*f);
	t = v*(1 - s*(1 - f));
 
	switch(i) {
		case 0:
			r = v;
			g = t;
			b = p;
			break;
 
		case 1:
			r = q;
			g = v;
			b = p;
			break;
 
		case 2:
			r = p;
			g = v;
			b = t;
			break;
 
		case 3:
			r = p;
			g = q;
			b = v;
			break;
 
		case 4:
			r = t;
			g = p;
			b = v;
			break;
 
		default: // case 5:
			r = v;
			g = p;
			b = q;
	}
 
	return [Math.round(r*255), Math.round(g*255), Math.round(b*255)];
}

function Initialize() {
	console.log("Loaded drawing script");
	
	var mouse = {
		down: false,
		moving: false,
		lastPos: false,
		pos: {
			x: 0,
			y: 0
		},
	}
	
	var color = { //data for colorwheel
		down: false,
		angle: 0, //for wheel
		pos: { //for box
			x: 75,
			y: 190
		},
		style: ''
	}
	
	var Tool = "Draw";
	
	var canvas = document.getElementById("Canvas");
	var colorWheel = document.getElementById("ColorWheel");
	
	var width = canvas.width;
	var height = canvas.height;
	
	var context = canvas.getContext("2d");
	var socket = io.connect();
	
	function ChangeTool(t) {
		Tool = t;
		console.log(t);
	}
	
	function InsideBox(x, y, originX, originY, size) {
		if (Math.abs(x - originX) <= size*0.5 && Math.abs(y - originY) <= size*0.5)
			return true;
		else
			return false;
	}
	
	function InsideCircle(x, y, originX, originY, radius, size) {
		var val = Math.pow(x - originX, 2) + Math.pow(y - originY, 2);
		var r2 = Math.pow(radius, 2);
		var r3 = Math.pow(radius + size, 2);
		
		if (val >= r2 && val <= r3)
			return true;
		else
			return false;
	}
	
	function UpdateColor(e) {
		var canvas = colorWheel;
		var rect = canvas.getBoundingClientRect();
		
		var originX = canvas.width*0.5
		var originY = canvas.height*0.5
		var x = e.clientX - rect.left;
		var y = e.clientY - rect.top;
		
		if (InsideBox(x, y, originX, originY, 100)) { //box
			color.pos.x = Math.min(x, 175 - 10);
			color.pos.y = Math.min(y, 190);
		}
		else if (InsideCircle(x, y, originX, originY, 80, 20)) {
			color.angle = Math.atan2(y - originY, x - originX);
		}
		if (color.angle < 0) { //wheel
			color.angle += Math.PI*2;
		}
		
		DrawColorWheel();
	}
	
	function DrawColorWheel() {
		//images to be used
		var wheel = document.getElementById("Wheel");
		var box = document.getElementById("Box");
		//color wheel canvas
		var cw = document.getElementById("ColorWheel");
		var ctx = cw.getContext("2d");
		//background
		ctx.fillStyle = "#293d3d";
		ctx.fillRect(0, 0, cw.width, cw.height);
		//color wheel
		ctx.drawImage(wheel, (cw.width - 200)*0.5, 50, 200, 200);
		ctx.beginPath();
		ctx.arc(cw.width*0.5, 150, 80, 0, 2*Math.PI);
		ctx.fill();
		//gradient box
		ctx.drawImage(box, (cw.width - 100)*0.5, 100, 100, 100);
		
		var grd = ctx.createLinearGradient(0, 0, 0, 200);
		grd.addColorStop(0, "rgb(0, 0, 255, 0.5)");
		grd.addColorStop(1, "rgb(0, 0, 0, 0.5)");
		
		ctx.fillStyle = grd;
		ctx.fillRect((cw.width - 100)*0.5, 100, 100, 100);
		ctx.drawImage(box, (cw.width - 100)*0.5, 100, 100, 100);
		ctx.fillStyle = "#ffffff";
		ctx.fillRect(color.pos.x, color.pos.y, 10, 10);
		
		ctx.beginPath();
		ctx.arc(cw.width*0.5 + Math.cos(color.angle)*90, cw.height*0.5 + Math.sin(color.angle)*90, 10, 0, 2*Math.PI);
		ctx.stroke();
		//ctx.fillStyle = 'hsb(0,' + (color.pos.x - 75)/90*100 + ',' + (color.pos.y - 75)/90*100 + ')';
		
		var angle = Math.PI/2 - color.angle - Math.PI/6 - Math.PI/2;
		if (angle < 0) { //wheel
			angle += Math.PI*2;
		}
		
		var h = (angle)/(2*Math.PI)*360;
		var s = ((color.pos.x - 75)/90)*100;
		var v = (1 - (color.pos.y - 100)/90)*100;
		var rgb = hsvToRgb(h, s, v);
		var style = 'rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')';
		color.style = style;
		ctx.fillStyle = style;
		ctx.fillRect(10, cw.height - 10 - 30, 30, 30);
	}
	
	function Update() {
		if (mouse.down && mouse.moving && mouse.lastPos && Tool == "Draw") {
			socket.emit('drawLine', {
				line: [mouse.lastPos, mouse.pos ],
				style:  color.style
			});
			mouse.moving = false;
		}
		
		mouse.lastPos = {
			x: mouse.pos.x,
			y: mouse.pos.y
		}
		setTimeout(Update, 10);
	}
	
	socket.on('drawLine', function (data) {
		var line = data.line;
		
		context.beginPath();//scale to canvas size and offset to tip of mouse pointer
		context.moveTo(line[0].x*width - 16, line[0].y*height - 24);
		context.lineTo(line[1].x*width - 16, line[1].y*height - 24);
		context.strokeStyle = data.style;
		context.stroke();
	});
	
	canvas.onmousemove = function (e) {
		mouse.pos.x = e.clientX/width; //normalize
		mouse.pos.y = e.clientY/height;
		mouse.moving = true;
	}
	
	canvas.onmousedown = function (e) {
		mouse.down = true;
	}
	
	canvas.onmouseup = function (e) {
		mouse.down = false;
	}
	
	colorWheel.onmousedown = function (e) {
		color.down = true;
		UpdateColor(e);
	}
	
	colorWheel.onmouseup = function (e) {
		color.down = false;
	}
	
	colorWheel.onmousemove = function (e) {
		if (color.down) {
			UpdateColor(e)
		}
	}
	
	document.getElementsByClassName("active3").onclick = function () {
		Tool = "Draw";
	}
	
	document.getElementsByClassName("active4").onclick = function () {
		Tool = "Erase";
		console.log("ERASE");
	}
	
	Update();
	UpdateColor(event);
}