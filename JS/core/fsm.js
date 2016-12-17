var greekLetterNames = [ 'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta', 'Iota', 'Kappa', 'Lambda', 'Mu', 'Nu', 'Xi', 'Omicron', 'Pi', 'Rho', 'Sigma', 'Tau', 'Upsilon', 'Phi', 'Chi', 'Psi', 'Omega' ];
var initialNode = {};
var finalNodes = [];

function convertLatexShortcuts(text) {
	// html greek characters
	for(var i = 0; i < greekLetterNames.length; i++) {
		var name = greekLetterNames[i];
		text = text.replace(new RegExp('\\\\' + name, 'g'), String.fromCharCode(913 + i + (i > 16)));
		text = text.replace(new RegExp('\\\\' + name.toLowerCase(), 'g'), String.fromCharCode(945 + i + (i > 16)));
	}

	// subscripts
	for(var i = 0; i < 10; i++) {
		text = text.replace(new RegExp('_' + i, 'g'), String.fromCharCode(8320 + i));
	}

	return text;
}

function textToXML(text) {
	text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	var result = '';
	for(var i = 0; i < text.length; i++) {
		var c = text.charCodeAt(i);
		if(c >= 0x20 && c <= 0x7E) {
			result += text[i];
		} else {
			result += '&#' + c + ';';
		}
	}
	return result;
}

function drawArrow(c, x, y, angle) {
	var dx = Math.cos(angle);
	var dy = Math.sin(angle);
	c.beginPath();
	c.moveTo(x, y);
	c.lineTo(x - 8 * dx + 5 * dy, y - 8 * dy - 5 * dx);
	c.lineTo(x - 8 * dx - 5 * dy, y - 8 * dy + 5 * dx);
	c.fill();
}

function canvasHasFocus() {
	return (document.activeElement || document.body) == document.body;
}

function drawText(c, originalText, x, y, angleOrNull, isSelected) {
	text = convertLatexShortcuts(originalText);
	c.font = '20px "Times New Roman", serif';
	var width = c.measureText(text).width;

	// center the text
	x -= width / 2;

	// position the text intelligently if given an angle
	if(angleOrNull != null) {
		var cos = Math.cos(angleOrNull);
		var sin = Math.sin(angleOrNull);
		var cornerPointX = (width / 2 + 5) * (cos > 0 ? 1 : -1);
		var cornerPointY = (10 + 5) * (sin > 0 ? 1 : -1);
		var slide = sin * Math.pow(Math.abs(sin), 40) * cornerPointX - cos * Math.pow(Math.abs(cos), 10) * cornerPointY;
		x += cornerPointX - sin * slide;
		y += cornerPointY + cos * slide;
	}

	// draw text and caret (round the coordinates so the caret falls on a pixel)
	if('advancedFillText' in c) {
		c.advancedFillText(text, originalText, x + width / 2, y, angleOrNull);
	} else {
		x = Math.round(x);
		y = Math.round(y);
		c.fillText(text, x, y + 6);
		if(isSelected && caretVisible && canvasHasFocus() && document.hasFocus()) {
			x += width;
			c.beginPath();
			c.moveTo(x, y - 10);
			c.lineTo(x, y + 10);
			c.stroke();
		}
	}
}

var caretTimer;
var caretVisible = true;

function resetCaret() {
	clearInterval(caretTimer);
	caretTimer = setInterval('caretVisible = !caretVisible; draw()', 500);
	caretVisible = true;
}

var canvas;
var nodeRadius = 30;
var nodes = [];
var links = [];

var cursorVisible = true;
var snapToPadding = 6; // pixels
var hitTargetPadding = 6; // pixels
var selectedObject = null; // either a Link or a Node
var currentLink = null; // a Link
var movingObject = false;
var originalClick;

function drawUsing(c) {
	c.clearRect(0, 0, canvas.width, canvas.height);
	c.save();
	c.translate(0.5, 0.5);

	for(var i = 0; i < nodes.length; i++) {
		c.lineWidth = 1;
		c.fillStyle = c.strokeStyle = (nodes[i] == selectedObject) ? 'blue' : 'black';
		nodes[i].draw(c);
	}
	for(var i = 0; i < links.length; i++) {
		c.lineWidth = 1;
		c.fillStyle = c.strokeStyle = (links[i] == selectedObject) ? 'blue' : 'black';
		links[i].draw(c);
	}
	if(currentLink != null) {
		c.lineWidth = 1;
		c.fillStyle = c.strokeStyle = 'black';
		currentLink.draw(c);
	}

	c.restore();
}

function draw() {
	drawUsing(canvas.getContext('2d'));
	//saveBackup();
}

function selectObject(x, y) {
	for(var i = 0; i < nodes.length; i++) {
		if(nodes[i].containsPoint(x, y)) {
			return nodes[i];
		}
	}
	for(var i = 0; i < links.length; i++) {
		if(links[i].containsPoint(x, y)) {
			return links[i];
		}
	}
	return null;
}

function snapNode(node) {
	for(var i = 0; i < nodes.length; i++) {
		if(nodes[i] == node) continue;

		if(Math.abs(node.x - nodes[i].x) < snapToPadding) {
			node.x = nodes[i].x;
		}

		if(Math.abs(node.y - nodes[i].y) < snapToPadding) {
			node.y = nodes[i].y;
		}
	}
}

function startCanvas() {
	canvas = document.getElementById('canvas');
	//restoreBackup();
	draw();

	canvas.onmousedown = function(e) {
		var mouse = crossBrowserRelativeMousePos(e);
		selectedObject = selectObject(mouse.x, mouse.y);
		movingObject = false;
		originalClick = mouse;

		if(selectedObject != null) {
			if(shift && selectedObject instanceof Node) {
				currentLink = new SelfLink(selectedObject, mouse);
			} else {
				movingObject = true;
				deltaMouseX = deltaMouseY = 0;
				if(selectedObject.setMouseStart) {
					selectedObject.setMouseStart(mouse.x, mouse.y);
				}
			}
			resetCaret();
		} else if(shift) {
			currentLink = new TemporaryLink(mouse, mouse);
		}

		draw();

		if(canvasHasFocus()) {
			// disable drag-and-drop only if the canvas is already focused
			return false;
		} else {
			// otherwise, let the browser switch the focus away from wherever it was
			resetCaret();
			//$("#canvas").focus();
			return true;
		}
	};

	canvas.ondblclick = function(e) {
		var mouse = crossBrowserRelativeMousePos(e);
		selectedObject = selectObject(mouse.x, mouse.y);

		if(selectedObject == null) {
			selectedObject = new Node(mouse.x, mouse.y, nodes.length);
			nodes.push(selectedObject);
			resetCaret();
			draw();
		} else if(selectedObject instanceof Node) {
			selectedObject.isAcceptState = !selectedObject.isAcceptState;
			finalNodes.push(selectedObject);
			draw();
		}
	};

	canvas.onmousemove = function(e) {
		var mouse = crossBrowserRelativeMousePos(e);

		if(currentLink != null) {
			var targetNode = selectObject(mouse.x, mouse.y);
			if(!(targetNode instanceof Node)) {
				targetNode = null;
			}

			if(selectedObject == null) {
				if(targetNode != null) {
					currentLink = new StartLink(targetNode, originalClick);
					initialNode = targetNode;
				} else {
					currentLink = new TemporaryLink(originalClick, mouse);
				}
			} else {
				if(targetNode == selectedObject) {
					currentLink = new SelfLink(selectedObject, mouse);
				} else if(targetNode != null) {
					currentLink = new Link(selectedObject, targetNode);
				} else {
					currentLink = new TemporaryLink(selectedObject.closestPointOnCircle(mouse.x, mouse.y), mouse);
				}
			}
			draw();
		}

		if(movingObject) {
			selectedObject.setAnchorPoint(mouse.x, mouse.y);
			if(selectedObject instanceof Node) {
				snapNode(selectedObject);
			}
			draw();
		}
	};

	canvas.onmouseup = function(e) {
		movingObject = false;

		if(currentLink != null) {
			if(!(currentLink instanceof TemporaryLink)) {
				selectedObject = currentLink;
				links.push(currentLink);
				resetCaret();
			}
			currentLink = null;
			draw();
		}
	};
}

var shift = false;

document.onkeydown = function(e) {
	var key = crossBrowserKey(e);

	if(key == 16) {
		shift = true;
	} else if(!canvasHasFocus()) {
		// don't read keystrokes when other things have focus
		return true;
	} else if(key == 8) { // backspace key
		if(selectedObject != null && 'text' in selectedObject) {
			selectedObject.text = selectedObject.text.substr(0, selectedObject.text.length - 1);
			resetCaret();
			draw();
		}

		// backspace is a shortcut for the back button, but do NOT want to change pages
		return false;
	} else if(key == 46) { // delete key
		if(selectedObject != null) {
			for(var i = 0; i < nodes.length; i++) {
				if(nodes[i] == selectedObject) {
					if(selectedObject.isAcceptState){
						for(var k = 0; k < finalNodes.length; k++){
							if(finalNodes[k] === selectedObject){
								finalNodes.splice(k,1);
							}
						}
					}
					nodes.splice(i--, 1);
				}
			}
			for(var i = 0; i < links.length; i++) {
				if(links[i] == selectedObject || links[i].node == selectedObject || links[i].nodeA == selectedObject || links[i].nodeB == selectedObject) {
					if (selectedObject instanceof StartLink) {
						initialNode = {};
					}
					links.splice(i--, 1);
				}
			}
			selectedObject = null;
			draw();
		}
	}
};

document.onkeyup = function(e) {
	var key = crossBrowserKey(e);

	if(key == 16) {
		shift = false;
	}
};

document.onkeypress = function(e) {
	// don't read keystrokes when other things have focus
	var key = crossBrowserKey(e);
	if(!canvasHasFocus()) {
		// don't read keystrokes when other things have focus
		return true;
	} else if(key >= 0x20 && key <= 0x7E && !e.metaKey && !e.altKey && !e.ctrlKey && selectedObject != null && 'text' in selectedObject) {
		selectedObject.text += String.fromCharCode(key);
		resetCaret();
		draw();

		// don't let keys do their actions (like space scrolls down the page)
		return false;
	} else if(key == 8) {
		// backspace is a shortcut for the back button, but do NOT want to change pages
		return false;
	}
};

function crossBrowserKey(e) {
	e = e || window.event;
	return e.which || e.keyCode;
}

/*function crossBrowserElementPos(e) {
	e = e || window.event;
	var obj = e.target || e.srcElement;
	var x = 0, y = 0;
	while(obj.offsetParent) {
		x += obj.offsetLeft;
		y += obj.offsetTop;
		obj = obj.offsetParent;
	}
	return { 'x': x, 'y': y };
}*/

function crossBrowserMousePos(e) {
	e = e || window.event;
	return {
		'x': e.pageX || e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft,
		'y': e.pageY || e.clientY + document.body.scrollTop + document.documentElement.scrollTop,
	};
}

function crossBrowserRelativeMousePos(e) {
	//var element = crossBrowserElementPos(e);
	var mouse = crossBrowserMousePos(e);
	return {
		'x': mouse.x - $('#canvas').offset().left,
		'y': mouse.y - $('#canvas').offset().top
	};
}

function output(text) {
	var element = document.getElementById('output');
	element.style.display = 'block';
	element.value = text;
}

function saveAsPNG() {
	var oldSelectedObject = selectedObject;
	selectedObject = null;
	drawUsing(canvas.getContext('2d'));
	selectedObject = oldSelectedObject;
	var pngData = canvas.toDataURL('image/png');
	document.location.href = pngData;
}

function saveAsSVG() {
	var exporter = new ExportAsSVG();
	var oldSelectedObject = selectedObject;
	selectedObject = null;
	drawUsing(exporter);
	selectedObject = oldSelectedObject;
	var svgData = exporter.toSVG();
	output(svgData);
	// Chrome isn't ready for this yet, the 'Save As' menu item is disabled
	// document.location.href = 'data:image/svg+xml;base64,' + btoa(svgData);
}

function saveAsLaTeX() {
	var exporter = new ExportAsLaTeX();
	var oldSelectedObject = selectedObject;
	selectedObject = null;
	drawUsing(exporter);
	selectedObject = oldSelectedObject;
	var texData = exporter.toLaTeX();
	output(texData);
}

function getNodes(){
	return nodes;
}

function getLinks(){
	return links;
}

function getInitialNode(){
	return initialNode;
}

function getFinalNodes(){
	return finalNodes;
}

function getTransition(){
	var transitions = new Array;
	for(var i = 0; i < nodes.length; i++){
		transitions.push({
			'node': nodes[i],
			'links': []
		})
	}
	for(var i = 0; i < transitions.length; i++){
		for(var j = 0; j < links.length; j++){
			if(links[j] instanceof Link){
				if(transitions[i].node === links[j].nodeA){
					var tmp = links[j].text.split(",");
					for(var k = 0; k < tmp.length; k++){
						transitions[i].links.push({
							'symbol': tmp[k],
							'node': links[j].nodeB
						})
					}
				}
			}else if(links[j] instanceof SelfLink){
				if(transitions[i].node === links[j].node){
					var tmp = links[j].text.split(",");
					for(var k = 0; k < tmp.length; k++){
						transitions[i].links.push({
							'symbol': tmp[k],
							'node': links[j].node
						})
					}
				}
			}else if(links[j] instanceof StartLink){
				initialNode = links[j].node
			}
		}
	}
    for(var i = 0; i < transitions.length; i++){
		for(var j = 0; j < transitions[i].links.length; j++){
			for(var k = 0; k < transitions.length; k++){
				if(transitions[i].links[j].node.idNext == transitions[k].node.idNext){
					transitions[i].links[j].node.idNext = k;
				}
			}
		}	
	}
	return transitions
}

function drawGraph(InitialNode, Transitions, FinalNodes){
	var vizText = "digraph g {node [shape=\"circle\"]; start [shape=Msquare]; start -> \"{" + InitialNode.text + "}\";";
	for(var i = 0; i < FinalNodes.length; i++){
		vizText += "\"{" + FinalNodes[i].text + "}\" [peripheries=2]; ";
	}	
	 for(var i = 0; i < Transitions.length; i++){
		for(var j = 0; j < Transitions[i].links.length; j++){
			vizText += "\"{" + Transitions[i].node.text  + "}\" -> \"{" + Transitions[i].links[j].node.text + "}\" [ label=\""+  Transitions[i].links[j].symbol +"\" ];";
		}
	 }
	vizText += "}";;
	return Viz(vizText, { format: "svg" });
}

function drawGraphDFA(InitialNode, Transitions, FinalNodes){
	var vizText = "digraph g {node [shape=\"circle\"]; start [shape=Msquare]; start -> \"" + InitialNode.text + "\";";
	for(var i = 0; i < FinalNodes.length; i++){
		vizText += "\"" + FinalNodes[i].text + "\" [peripheries=2]; ";
	}	
	 for(var i = 0; i < Transitions.length; i++){
		for(var j = 0; j < Transitions[i].links.length; j++){
			vizText += "\"" + Transitions[i].node.text  + "\" -> \"" + Transitions[i].links[j].node.text + "\" [ label=\""+  Transitions[i].links[j].symbol +"\" ];";
		}
	 }
	vizText += "}";
	return Viz(vizText, { format: "svg" });
}

function validateAutomataEstructure(){
    if(typeof getInitialNode().idNext=='undefined'){
        $('#str_validate').text('No se ha definido un estado inicial');
    }else if (getFinalNodes().length <= 0){
        $('#str_validate').text('No se ha definido un estado final');       
    }else if(EmptiesStatesNames()){
        $('#str_validate').text('Los nombres de los estados no pueden estar vacíos');
    }else if(IncompleteTransitionValue()){
    	 $('#str_validate').text('Los valores de las transiciones no pueden ser : Vacías o incompletas (, o A,)...');
    }else if(SameStatesNames()){
    	$('#str_validate').text('Los nombres de los estados deben ser únicos'); 
    }else if(!searchTransitions()){
    	$('#str_validate').text('No se han hecho las transiciones correspondientes entre estados'); 
    }else{
        return true;
    }
    return false;

};

function sendMessage(){



};

function searchTransitions(){
    var Transitions = getTransition();
    var Nodes = getNodes().length;
    var TempNodes= new Array;
    var includeFather=false;
    var finalCounter=0;
    for (var j =0; j < Transitions.length; j++) {
        if(Transitions[j].node.idNext===0){
            includeFather=true;
        }
        for (var i =0; i <Transitions[j].links.length; i++) { 
            if(!arrayContains(Transitions[j].links[i].node.text,TempNodes)){
                TempNodes.push(Transitions[j].links[i].node.text);
            }
        }
    }
    finalCounter=TempNodes.length;
    if(includeFather && !(finalCounter===Nodes)){
        finalCounter++;
    }

    if(finalCounter===Nodes){
        return true;
    }


    return false;

};   
    
 function EmptiesStatesNames(){
 	var States = getNodes();
 	for(var i=0; i<States.length;i++){

 		if(States[i].text==""){
 			return true;
 		}
 	}

 	return false;
 };  

 function SameStatesNames(){
 	var States = getNodes();
 	for(var i=0; i<States.length;i++){
		for(var j=i+1; j<States.length;j++){
			if(States[i].text==States[j].text){
				return true;
			}
		 		
		}
			
	 		
 	}

 	return false;
 };  


 function IncompleteTransitionValue(){

 	var Transitions = getTransition();
 	for(var i =0; i< Transitions.length; i++){
		for(var j =0; j< Transitions[i].links.length; j++){
			var spliter=Transitions[i].links[j].symbol.split(","); 

			if(spliter.length>0){
				for(var k =0; k<spliter.length; k++){
					if(spliter[k]==""){
						return true;
					}
				}

	 		}else{
	 			if(spliter==""){
	 				return true;
	 			}
	 		}	
		}
 	}
 	return false;
 };

function arrayContains(node, nodes)
{
    return (nodes.indexOf(node) > -1);
}

function NoDuplicates(Array){
    var tmp = [];
    for(var i = 0; i < Array.length; i++){
        if(tmp.indexOf(Array[i]) == -1){
        	tmp.push(Array[i]);
        }
    }
    return tmp;
}


function getTransitionPDA(){
	var transitions = new Array;
	for(var i = 0; i < nodes.length; i++){
		transitions.push({
			'node': nodes[i],
			'links': []
		})
	}
	for(var i = 0; i < transitions.length; i++){
		for(var j = 0; j < links.length; j++){
			if(links[j] instanceof Link ){
				if(transitions[i].node === links[j].nodeA){
					var tmp = links[j].text.split(",");
					var tmp2 = tmp[1].split("->");
					transitions[i].links.push({
						'node': links[j].nodeB,
						'input': tmp[0],
						'popElement': tmp2[0],
						'pushElement': tmp2[1]
					})
				}
			}else if(links[j] instanceof SelfLink){
				if(transitions[i].node === links[j].node){
					var tmp = links[j].text.split(",");
					var tmp2 = tmp[1].split("->");
					transitions[i].links.push({
						'node': links[j].node,
						'input': tmp[0],
						'popElement': tmp2[0],
						'pushElement': tmp2[1]
					})
				}
			}else if(links[j] instanceof StartLink){
				initialNode = links[j].node
			}
		}
	}
    for(var i = 0; i < transitions.length; i++){
		for(var j = 0; j < transitions[i].links.length; j++){
			for(var k = 0; k < transitions.length; k++){
				if(transitions[i].links[j].node.idNext == transitions[k].node.idNext){
					transitions[i].links[j].node.idNext = k;
				}
			}
			transitions[i].links[j].node.idFather = i;
		}	
	}
	return transitions
}

function getTransitionTM(){
	
}














//<----SAVE---->
function clear(){
	console.log('asd')
	nodes = [];
	links = [];
	draw();
}

function restoreBackup(exampleName) {
	try {
		$.ajax({
            url : "Json/"+exampleName+".txt",
            dataType: "text",
            success : function (data) {
                var backup = JSON.parse(data);
				nodes = [];
				links = [];
				for(var i = 0; i < backup.nodes.length; i++) {
					var backupNode = backup.nodes[i];
					var node = new Node(backupNode.x, backupNode.y);
					node.isAcceptState = backupNode.isAcceptState;
					node.text = backupNode.text;
					nodes.push(node);
				}
				for(var i = 0; i < backup.links.length; i++) {
					var backupLink = backup.links[i];
					var link = null;
					if(backupLink.type == 'SelfLink') {
						link = new SelfLink(nodes[backupLink.node]);
						link.anchorAngle = backupLink.anchorAngle;
						link.text = backupLink.text;
					} else if(backupLink.type == 'StartLink') {
						link = new StartLink(nodes[backupLink.node]);
						link.deltaX = backupLink.deltaX;
						link.deltaY = backupLink.deltaY;
						link.text = backupLink.text;
					} else if(backupLink.type == 'Link') {
						link = new Link(nodes[backupLink.nodeA], nodes[backupLink.nodeB]);
						link.parallelPart = backupLink.parallelPart;
						link.perpendicularPart = backupLink.perpendicularPart;
						link.text = backupLink.text;
						link.lineAngleAdjust = backupLink.lineAngleAdjust;
					}
					if(link != null) {
						links.push(link);
					}
				}
				draw();
            }
        });
		 
	} catch(e) {
		localStorage['fsm'] = '';
	}
}

function saveBackup() {
	if(!localStorage || !JSON) {
		return;
	}

	var backup = {
		'nodes': [],
		'links': [],
	};
	for(var i = 0; i < nodes.length; i++) {
		var node = nodes[i];
		var backupNode = {
			'x': node.x,
			'y': node.y,
			'text': node.text,
			'isAcceptState': node.isAcceptState,
		};
		backup.nodes.push(backupNode);
	}
	for(var i = 0; i < links.length; i++) {
		var link = links[i];
		var backupLink = null;
		if(link instanceof SelfLink) {
			backupLink = {
				'type': 'SelfLink',
				'node': nodes.indexOf(link.node),
				'text': link.text,
				'anchorAngle': link.anchorAngle,
			};
		} else if(link instanceof StartLink) {
			backupLink = {
				'type': 'StartLink',
				'node': nodes.indexOf(link.node),
				'text': link.text,
				'deltaX': link.deltaX,
				'deltaY': link.deltaY,
			};
		} else if(link instanceof Link) {
			backupLink = {
				'type': 'Link',
				'nodeA': nodes.indexOf(link.nodeA),
				'nodeB': nodes.indexOf(link.nodeB),
				'text': link.text,
				'lineAngleAdjust': link.lineAngleAdjust,
				'parallelPart': link.parallelPart,
				'perpendicularPart': link.perpendicularPart,
			};
		}
		if(backupLink != null) {
			backup.links.push(backupLink);
		}
	}
	console.log(JSON.stringify(backup))
	
	//localStorage['fsm'] = JSON.stringify(backup);
}
