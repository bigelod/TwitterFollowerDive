// using free and open source Codebird library for Twitter access
// downloaded from https://github.com/jublonet/codebird-js
// the file codebird.js is included in the main HTML document as a script before this one

// Based on code by Dr. David Ogborn (d0kt0r0) from Avenue To Learn at McMaster University

// this function is called by the HTML body's onload handler
// note that it assumes the variables consumerKey,consumerSecret, token and tokenSecret
// contain appropriate authorization values for twitter. Edit this in the
// adjoining file tokens.js and don't share your tokens with anyone.

var maxWidth = 800; //Canvas width
var maxHeight = 600; //Canvas height
var paddingLeft = 0; //Padding
var paddingTop = 0; //Padding
var startQuery = "CausalBitGames"; //The first username to look up
var maxResultsPerCall = 20; //Twitter defaults to 20 results per call
var maxIconsPerRow = 0; //Maximum icons per row, filled later
var maxIconsPerColumn = 0; //Maximum icons per column, filled later
var totalMaxIcons = 0; //Will be filled with max icons on-screen
var imgSize = 48; //Images are 48x48px for profiles
var icons = []; //An array of icons to display
var lastIcon = -1; //The last icon we were over ( as index of icons[] )
var lastName = ""; //Last username we hovered over?
var currHover = 0; //How long have we been hovering?
var hoverTime = 30; //How many seconds to hover for?

// a function to a JavaScript object into pretty-printed, complete JSON
// so we can, for example, print everything in an object to the log window
// for copying and pasting data back to a text editor
function prettyPrint(x) {
  return JSON.stringify(x,null,2);
}

function boundCheck(chkx, chky, x, y, width, height) {
	//Check if an X and Y co-ordinate is within any shape of box
	if (chkx > x - width/2 && chkx < x + width/2) {
		if (chky > y - height/2 && chky < y + height/2) {
			return true;
		}
	}
	
	return false;
}

function clamp(min, max, val) {
	if (val < min) return min;
	if (val > max) return max;
	return val;
}

function respondToMouseDown(ev) {
	mouseDown = true;
	updateMouse(ev);
}

function respondToMouseMove(ev) {
	updateMouse(ev);
}

function respondToMouseUp(ev) {
	mouseDown = false;
	updateMouse(ev);
}

function updateMouse(ev) {
	//Update mouse position variables
	mouseX = ev.clientX - canvas.offsetLeft;
	mouseY = ev.clientY - canvas.offsetTop;
}

//Based on: http://stackoverflow.com/a/27169022
function drawImgOnCtx(url, x, y) {
	var img = new window.Image();
	img.addEventListener("load", function () {
		ctx.drawImage(img, x, y);
	});
	img.setAttribute("src", url);
}

function setup() {
	AudioContext = window.AudioContext || window.webkitAudioContext; // the line above sometimes help with browser-compatibility issues
	ac = new AudioContext();
	
	canvas = document.getElementById("myCanvas"); // find the canvas we already included via HTML below
	ctx = canvas.getContext("2d"); // get the drawing context for that canvas

	//Mouse variables
	mouseX = 0;
	mouseY = 0;
	mouseDown = false;
	
	canvas.onmousedown = respondToMouseDown;
	canvas.onmousemove = respondToMouseMove;
	canvas.onmouseup = respondToMouseUp;
	
	//Do some calculations quick
	maxIconsPerRow = Math.floor(maxWidth / imgSize);
	maxIconsPerColumn = Math.floor(maxHeight / imgSize) - 1; //Extra gap added at bottom for text
	totalMaxIcons = maxIconsPerColumn * maxIconsPerRow;
	
	paddingLeft = (maxWidth - (maxIconsPerRow * imgSize)) / 2;
	paddingTop = (maxHeight - (maxIconsPerColumn * imgSize)) / 2;
	
	cb = new Codebird;
	cb.setConsumerKey(consumerKey,consumerSecret);
	cb.setToken(token,tokenSecret);
	console.log("setup finished.");
	
	myInterval = setInterval(function() { checkMouse(); }, 100); //Check the mouse every .1 seconds
	myInterval2 = setInterval(function() { updateDisplay(); }, 50); //Check for data updates every .05 seconds
	
	getPicAndNameOfFollowers(startQuery); //Get data for the user with screen_name = startQuery
}

function checkMouse() {
	//Check if the mouse is over an icon
	var lastHoverVal = currHover;
	
	for (var n = 0; n < icons.length; n++) {
		var column = n % maxIconsPerRow;
		var row = Math.floor(n / maxIconsPerRow);
		
		if (boundCheck(mouseX, mouseY, (column * imgSize) + paddingLeft + imgSize/2, (row * imgSize) + paddingTop + imgSize/2, imgSize, imgSize)) {
			//If the mouse is overlapping an icon
			if (lastIcon == n) {
				//This is the icon we were on!
				currHover += 1;
			} else {
				//First time here, reset timer
				currHover = 0;
				lastIcon = n;
				lastName = icons[n].screen_name;
			}
		}
	}
	
	if (currHover == lastHoverVal && currHover > 0) {
		//We actually aren't overlapping at all!
		lastIcon = -1;
		lastName = "";
		mouseX = 0; //Assume no longer overlapping
		mouseY = 0; //Assume no longer overlapping
		currHover = 0; //Assume no longer overlapping
	}
	
	if (lastIcon != -1 && currHover == hoverTime) {
		//We've hovered here long enough, trigger it!
		getPicAndNameOfFollowers(icons[lastIcon].screen_name); //Get data for the user hovered over
		lastIcon = -1; //Reset last icon hovered over
		lastName = "";
		mouseX = 0; //Assume no longer overlapping
		mouseY = 0; //Assume no longer overlapping
		currHover = 0; //Assume no longer overlapping
	}
	
	if (lastIcon == -1) currHover = 0; //Reset timer after we're done
}

function updateDisplay() {
	//Check if we got new data and update the display
	var dataUpdate = false;
	
	if (ans != null && ans.length > 0) {
		
		if (icons.length + ans.length < totalMaxIcons) {
			//Easy addition
			icons = icons.concat(ans);
		}
		else {
			if (icons.length < totalMaxIcons) {
				//Fill in the last few
				var start = icons.length; //The point we are adding from
				var gap = totalMaxIcons - start; //The amount we can grab from ans
				
				//Add in the ones that will fit
				for (var x = 0; x < gap; x++) {
					icons[start + x] = ans[x]; //Add in our new results
				}
			}
			else {
				//Say goodbye to the old faces :(
				icons = ans;
			}
		}
		
		dataUpdate = true; //We have new data!
		ans = []; //Clear ans for the next request
	}
	
	//Finally, draw the icons if we have new data
	if (dataUpdate) {
		ctx.clearRect(0, 0, maxWidth, maxHeight);
		
		for (var n = 0; n < icons.length; n++) {	
			var column = n % maxIconsPerRow;
			var row = Math.floor(n / maxIconsPerRow);
			
			drawImgOnCtx(icons[n].profile_image_url,(column * imgSize) + paddingLeft, (row * imgSize) + paddingTop);
		}
	}
	
	//And draw the text at the bottom
	ctx.clearRect(0, maxHeight - 32, maxWidth, 32);
	
	if (lastName != "") {
		ctx.fillStyle = "black";
		ctx.font = "bold 18px Arial";
		ctx.fillText(lastName + ", Finding Followers In: " + Math.ceil((hoverTime - currHover)/10), 16, maxHeight - 16);
		
		//Quick input check to open their twitter
		if (mouseDown) {
			var url = "https://twitter.com/" + lastName + "/";
			
			mouseX = 0; //Assume no longer overlapping
			mouseY = 0; //Assume no longer overlapping
			lastName = ""; //Assume no longer overlapping
			currHover = 0; //Assume no longer overlapping
			lastIcon = -1; //Assume no longer overlapping
			mouseDown = false; //Assume no longer down
			
			window.open(url, '_blank');
		}
	}
}

function getPicAndNameOfFollowers(name) {
	ans = new Array; //Set the array to store the data into
	
	cb.__call("followers_list", {screen_name:name}, function(reply) {
		console.log("received followers list: " + reply);
		var loopTo = 0;
		if (reply.users != null) loopTo = reply.users.length;
		for (var n = 0; n < loopTo; n++) {
			var u = { screen_name : reply.users[n].screen_name, profile_image_url : reply.users[n].profile_image_url }; //Get their screen name and profile pic
			ans.push(u); //Add it to array
		}
	});
}

// note that the function above may produce duplicate entries
// (we could avoid this by checking whether it was already there before
// appending/pushing a new entry, but this is left as an "exercise for the reader" if desired

// an example of the scraping functions above in use:

// getFollowersListStage1();
// getFollowersListStage2();
// document.body.innerHTML = prettyPrint(followers2); // show in browser window for complete copying and pasting

// The tutorial exercise:
// setup a twitter account if you don't already have one
// at apps.twitter.com add a test app and get the consumer key and secret for it
// and the access tokens and secret for it
// paste all 4 into tokens.js
// now develop functions to scrape some data of interest into a usable format
// and store it in a separate .js file as JSON
// submit your modified code, and a new .js file containing your scraped JSON data

// some extra "lines of flight":
// more things you can ask Twitter about: https://dev.twitter.com/rest/reference
