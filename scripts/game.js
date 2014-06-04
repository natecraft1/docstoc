var Game = function(size1,size2,target) {
	// these are our Game variables that will be accessible to all of the functions within game
	// DOM ELEMENTS
	var b1Element = document.getElementById("b1"), 
			b2Element = document.getElementById("b2"),
			targetSpan = document.getElementById("target").firstElementChild,
			show_hints = document.getElementById("show_hints"),
			nodes = Array.prototype.slice.call(document.getElementsByClassName("move")),
			historyElems = document.getElementsByClassName("history"),
			changeSizesButton = document.getElementById("changeSizes"),
			uls = document.getElementsByTagName("ul"),
	// BUCKETS
			buckets = { 
				"b1": {"size": size1, "elem": b1Element }, 
			  "b2": {"size": size2,  "elem": b2Element },
			  "requiredGallons": target
			},
			b1CurrentHeight = b2CurrentHeight = 0, 
			// tracks how many moves or steps the user has made, and checks whether they've reached the target amount
			step = {
				"count": 0,
				"check": function(h1, h2) {
					this.count += 1;
					return h1 == buckets.requiredGallons
							|| h2 == buckets.requiredGallons
							|| h2 + h1 == buckets.requiredGallons;
				}
			},
	// HINT MODE VARIABLES
			// tracks whether the user is in "hint mode", meaning the best "path" to solving the puzzle is displayed
			hintmode = false,
			// this array will keep track of the steps the user must take to solve the puzzle 
			// with objects containing the next 'state' (bucket heights) and action "fill, transfer or empty"
			hintSteps = [], 
			// currentStep is the index in the hintSteps array of the next step the user needs to take
			currentStep = 0,
			// section stores whether it is quicker to start by filling the first bucket or the second
			section = null,  
			// it's necessary to calculate the shortest path of completing the puzzle if 
			// A. we haven't yet   B. the user makes a wrong move and goes "off" the path   C. we resize the buckets  
			needToCalculateShortestPath = true,
			// we if we've already calculated the shortest path for given bucket sizes and their current heights
			// we can store it in a cache to avoid recalculating it.
			shortestPathMemo = {}, 

	// ANIMATIONS
			animation_one_in_progress = 0, currentTickb1,
			animation_two_in_progress = 0, currentTickb2,
			lakeFull = true;
			

function Game() {

	var that = this;
	this.updateBuckets = function(n) {
		var split = this.elem.firstElementChild.innerHTML.split("/");
		if (n == "numerator") {
			split[0] = this.currentHeight;
		} else {
			split[1] = this.size;
		}
		this.elem.firstElementChild.innerHTML = split.join("/");
	};
	// I used Object.defineProperty here mainly to learn how it works, but it's appropriate because 
	// every time we set the currentHeights of the buckets, we need to change some things in the UI
	// so instead of writing that every time we set the currentHeight value, we can just write it once in here.
	Object.defineProperty(buckets.b1, "currentHeight", {
		get: function() { return b1CurrentHeight; },
		set: function(newVal) { 
			b1CurrentHeight = newVal;
			that.updateBuckets.call(this, "numerator");
		}
	});
	Object.defineProperty(buckets.b2, "currentHeight", {
		get: function() { return b2CurrentHeight; },
		set: function(newVal) { 
			b2CurrentHeight = newVal;
			that.updateBuckets.call(this, "numerator");
		}
	});
	this.setup(buckets.b1.size, buckets.b2.size);
}
Game.prototype = function() {
	var setup = function(size1, size2, g) {
		var g = g || this; 
		section = null;
		var larger = Math.max(size1, size2),
		smaller = size1 == larger ? size2 : size1,
		newHeight = smaller/larger*100;
		buckets.b1.size = larger;
		buckets.b2.size = smaller;
		buckets.maxBucketHeight = larger;
		buckets.b1.currentHeight = 0;
		buckets.b2.currentHeight = 0;
		g.updateBuckets.call(buckets.b1, "denominator");
		g.updateBuckets.call(buckets.b2, "denominator");
		b1Element.style.backgroundSize = "200px 5px";
		b2Element.style.backgroundSize = "200px 5px";
		if (newHeight < 30) {
			b2Element.style.height = "30px";
			b2Element.style.marginTop = "75px";
		} else {
			b2Element.style.height = newHeight + "px";
			b2Element.style.marginTop = 105 - smaller/larger*100 + "px";
		}
		step.count = 0;
		clearActiveElem();
	},
	// *=*=*=*=*=*=*=*=*=*=*=*=  Everything related to managing states of the game =*=*=*=*=*=*=*=*=*=*=*=*
	
	hideOrShowAll = function(n) {
		nodes.forEach(function(node) { node.style.opacity = n; });
	},
	newActiveElem = function() {
		hideActiveElem();
		clearActiveElem();
		setNewActiveElem(currentElem());
	},
	clearActiveElem = function() {
		var elem = document.getElementsByClassName("active")[0];
		if (elem) { 
			elem.className = elem.className.replace(" active", "");
		}
	},
	hideActiveElem = function() {
		var elem = document.getElementsByClassName("active")[0];
		if (elem) elem.style.opacity = 0;
	},
	setNewActiveElem = function(elem) {
		elem.style.opacity = 1;
		elem.className = elem.className + " active";
	},
	correctMove = function() {
		if (!hintSteps.length) return false;
		return hintSteps[currentStep].state[0] == buckets.b1.currentHeight 
				&& hintSteps[currentStep].state[1] == buckets.b2.currentHeight;
	},
	changeBucketSizes = function(n1,n2,target) {
		var n1, n2, target;
		historyElems[0].innerHTML = "";
		historyElems[1].innerHTML = "";
		hintSteps = [];
		currentStep = 0;
		needToCalculateShortestPath = true;
		shortestPathMemo = {};
		if (hintmode) { hideOrShowAll(1); hintmode = false; };
		setup(n1, n2, g);
		targetSpan.innerHTML = target;
		buckets.requiredGallons = target;
  },
// *=*=*=*=*=*=*=*=*=*=*=*=  everything related to making a move =*=*=*=*=*=*=*=*=*=*=*=*
	makeMove = function(e) {
		if (e.target.tagName == "BUTTON") {
			var bucket = e.target.parentNode.parentNode.parentNode.children[0].id;
			var action = e.target.className.split(" ")[0];
			// if our functions were not in window, and we didn't want to use eval we'd do this with a switch statement.  
			switch (action) {
				case "fill": 
					fill(buckets[bucket], bucket);
					break;
				case "transfer":
					transfer(buckets[bucket], buckets[bucket === "b1" ? "b2" : "b1"], bucket);
					break;
				case "empty":
					empty(buckets[bucket], bucket);
					break;
			}
			// check if we completed the puzzle
			if (step.check(buckets.b1.currentHeight, buckets.b2.currentHeight)) { 
				alert("You did it in " + step.count + " steps!"); 
				changeBucketSizes(5,3,4);
				return;
			} 
			completedMove();
		}
	},
	fill = function(bucket, id) {
		animateBucket(whichElement(id), heightScale(bucket.currentHeight), heightScale(bucket.size));
		animateLake("shrink");
		bucket.currentHeight = bucket.size;
	},
	transfer = function(from, to, id) {
		var alotted = to.size - to.currentHeight;
		var desired = from.currentHeight;
		var transfer_amount = desired > alotted ? alotted : desired;
		animateBucket(whichElement(id), heightScale(from.currentHeight), heightScale(from.currentHeight - transfer_amount));
		animateBucket(whichElement(id == "b1" ? "b2" : "b1"), heightScale(to.currentHeight), heightScale(to.currentHeight + transfer_amount));
		from.currentHeight -= transfer_amount;
		to.currentHeight += transfer_amount;
	},
	empty = function(bucket, id) {
		animateBucket(whichElement(id), heightScale(bucket.currentHeight), 5);
		animateLake("grow");
		bucket.currentHeight = 0;
	},
	addStepHistoryElements = function() {
		var p1 = document.createElement("p");
		var p2 = document.createElement("p");
		p1.innerHTML = buckets.b1.currentHeight;
		p2.innerHTML = buckets.b2.currentHeight;
		historyElems[0].appendChild(p1);
		historyElems[1].appendChild(p2);
	},
	completedMove = function() {
		addStepHistoryElements();		
		// if the user made a correct move, increment currentSteps so that the next step is the correct move
		var goodMove = correctMove();
		if (hintSteps.length && goodMove) { ++currentStep; }
		if (!goodMove) { needToCalculateShortestPath = true; }	
		// order matters here, because the currentStep needs to be updated before we know which button to show next
		if (hintmode) {
			newActiveElem(); 
		}
	},
	
	// *=*=*=*=*=*=*=*=*=*=*=*=  Show Hints =*=*=*=*=*=*=*=*=*=*=*=*
	hintMode = function() {
		var steps, currentInd;
		if (hintmode) {
			clearActiveElem();
			hideOrShowAll(1);
			toggleHintMode();
			return;
		}
// if we've already figured out the shortest path for the given bucket sizes and current height, it's in the memo
		var	currentHeights = JSON.stringify([buckets.b1.currentHeight, buckets.b2.currentHeight]);
		if (shortestPathMemo[currentHeights]) { 
			needToCalculateShortestPath = false; 
			setBestPath(shortestPathMemo[currentHeights]);
		}
// we need to recalculate the shortest path whenever we haven't clicked "Show Hints yet"
// or when we have clicked it, and somewhere along the way we made a sadly horrible move && life decision
		if (needToCalculateShortestPath) {
			needToCalculateShortestPath = false;
			var startWithOne = trial(buckets.b1.size, buckets.b2.size, buckets.requiredGallons, true)
					,startWithTwo = trial(buckets.b2.size, buckets.b1.size, buckets.requiredGallons, false)
					,indexOne = currentIndex(startWithOne.steps)
					,indexTwo = currentIndex(startWithTwo.steps)
					,remainingSteps1 = startWithOne.count - indexOne
					,remainingSteps2 = startWithTwo.count - indexTwo;

			var pathOptions = bestPath(remainingSteps1, remainingSteps2, indexOne, indexTwo, startWithOne, startWithTwo);
			setBestPath(pathOptions);
			cachePath(pathOptions);
		}

		hideOrShowAll(0);
		setNewActiveElem(currentElem());
		toggleHintMode();
	},
	cachePath = function(pathOptions) {
		var bucketHeights = [buckets.b1.currentHeight, buckets.b2.currentHeight];
		shortestPathMemo[JSON.stringify(bucketHeights)] = pathOptions;
	},
	bestPath = function(remaining1, remaining2, indexOne, indexTwo, startWithOne, startWithTwo) {
		if (remaining1 <= remaining2) {
			return {"section": "b1Wrapper", "ind": indexOne, "steps": startWithOne.steps };
		} else {
			return {"section": "b2Wrapper", "ind": indexTwo, "steps": startWithTwo.steps };
		}
	},
	setBestPath = function(opts) {
		section = opts.section;
		hintSteps = opts.steps.slice(0);
		setCurrentStep(opts.ind, section);
	},
	setCurrentStep = function(currentInd, sect) {
		if (currentInd == -1) { 
			// wrong bucket is full, so empty it and get on the right path
			currentStep = 0;
			hintSteps.unshift({"step": "empty", "state": [0,0]});
		} else if (currentInd == -2) {
			// both buckets are full, so empty the one that leads us to the shortest path
			currentStep = 0;
			if (sect == "b1Wrapper") {
				hintSteps[0] = {"step": "empty", "state": [buckets.b1.size, 0]};
			} else {
				hintSteps[0] = {"step": "empty", "state": [0, buckets.b2.size]};
			}
		} else if (currentInd == 0) {
			currentStep = 0;
		} else {
			currentStep = currentInd;
		}
	},
	trial = function(h1, h2, target, bucketOne) {
		var hght1 = hght2 = 0, change, alotted, action;
		var newStep = clone(step);
		newStep.count = 0;
		var stepArr = [];
		while (!newStep.check(hght1, hght2) && newStep.count < 50) {
			if (hght1 == 0) {
				hght1 = h1;
				action = "fill";
			} else if (hght1 == h1
				|| hght2 == 0) {
				action = "transfer";
				alotted = h2 - hght2;
				change =  hght1 > alotted ? alotted : hght1;
				hght2 += change;
				hght1 -= change;
			} else if (hght2 == h2) {
				action = "empty";
				hght2 = 0;
			}
			if (bucketOne) {
				stepArr.push({"step": action, "state": [hght1, hght2]});
			} else {
				stepArr.push({"step": action, "state": [hght2, hght1] });
			}
		}
		return { "count": newStep.count - 1, "steps": stepArr };
	},
// *=*=*=*=*=*=*=*=*=*=*=*=  helpers =*=*=*=*=*=*=*=*=*=*=*=*
	whichElement = function(id) {
		return id == "b1" ? b1Element : b2Element;
	},
	toggleHintMode = function() {
		hintmode = hintmode == false ? true : false;
	},
	currentIndex = function(steps, n, n2) {
		var b1h = buckets.b1.currentHeight, b2h = buckets.b2.currentHeight;
		// current index is called when a user clicks on Show Hints, 
		// and we need to figure out what step we are currently on in order to find out 
		// what the quickest way of finishing is. 
		for (var i = steps.length - 1; i >= 0; i--) {
			if (steps[i].state[0] == b1h 
			 && steps[i].state[1] == b2h) {
				return i+1;
			}
		}
		if (b1h + b2h == 0) { 
			return 0; 
		} else if (b1h == buckets.b1.size && b2h == buckets.b2.size) {
			return -2;
		} else { return -1 };
	},
	swapSection = function(section) {
		return section == "b1Wrapper" ? "b2Wrapper" : "b1Wrapper";
	},
	emptying = function() {
		return hintSteps[currentStep].step == "empty";
	},
	currentElem = function() {
		var sect = section;
		if (emptying()) sect = swapSection(section); 
		return document.getElementById(sect).getElementsByClassName(hintSteps[currentStep].step)[0];
	},
	gcd = function(a, b) {
	    if (!b) return a; 
	    return gcd(b, a % b);
	},
	clone = function(obj) {
   var target = {};
   for (var i in obj) {
    if (obj.hasOwnProperty(i)) {
     target[i] = obj[i];
    }
   }
   return target;
  },
  heightScale = function(Height) {
  	return ~~((Height/buckets.maxBucketHeight)*135);
  },
  addListeners = function() {
  	var n1, n2;
  	// for buttons fill, transfer, and empty
  	for (var i = 0; i < 2; i++) {
  		uls[i].addEventListener("click", makeMove, false);
  	}
  	// if you want to reset the game with different bucket sizes
  	changeSizesButton.addEventListener("click", function () { 

  		n1 = Math.random()*50|0, n2 = Math.random()*50|0;
  		changeBucketSizes(n1, n2, (n1 + n2-2)*Math.random()|0 + 1); 
  		
  	}, false);
  	// hint mode
  	show_hints.addEventListener("click", function() {
			var greatestCF = gcd(buckets.b1.size, buckets.b2.size);
			if (buckets.requiredGallons % greatestCF != 0) {
				alert("This is not possible because " + greatestCF + " is the highest common factor of both " + buckets.b1.size + " and " + buckets.b2.size + ", but " + greatestCF + " is not a factor of " + buckets.requiredGallons + "!");
			} else { hintMode(); }
  	}, false);
  },
// *=*=*=*=*=*=*=*=*=*=*=*=  animations =*=*=*=*=*=*=*=*=*=*=*=*
  animateLake = function(resize) {
  	if (resize == "shrink" && lakeFull) {
  		lakeFull = false;
  		m.scale(1/1.2, 1/1.2, 0, 0);
  		m.translate(-translateX, -translateY);
  	} else if (resize == "grow" && !lakeFull) {
  		lakeFull = true;
  		m.scale(1.2, 1.2, 0, 0);
  		m.translate(translateX, translateY);
  	}
  	lake.animate({ "transform": m }, 1500);
  },
  animateBucket = function(elem, from, to) {
  	var anim, animation_in_progress;
  	var tick = function() {
  		return setInterval(function() { move(anim, animation_in_progress) }, 30);
  	};
  	if (elem.id == "b1") {
  		if (animation_one_in_progress) {
  			clearTimeout(currentTickb1);
  			setFrom();
  		} else { 
  			++animation_one_in_progress; 
  		}
  		// order matters here. despite it not being intuitive currentTick has to be defined, then after the timeout runs, anim is defined
  		anim = currentTickb1 = tick(), animation_in_progress = animation_one_in_progress;
  	} else {
  		if (animation_two_in_progress) {
  			clearTimeout(currentTickb2);
  			setFrom();
  		} else { 
  			++animation_two_in_progress; 
  		}
  		// currentTickb2 = tick();
  		anim = currentTickb2 = tick(), animation_in_progress = animation_two_in_progress;
  	}
  	if (to == 0) to = 5; 
  	var increment = (to-from)/50; 
  	var tickCount = 0;
  	function setFrom() {
  		from = +getComputedStyle(elem, null).backgroundSize.split(" ")[1].replace("px", "");
  	}
  	function move(anim, anim_in_prog) {
  		++tickCount;
  		var tickCrement = increment * tickCount;
  		elem.style.backgroundSize = "200px " + (from + tickCrement) + "px";
  		if (Math.abs(tickCrement) >= Math.abs(to-from)) { 
  			--anim_in_prog; 
  			clearTimeout(anim); 
  		}
  	}	
  };
  return {
  	'setup': setup,
  	// 'hintMode': hintMode,
  	// 'makeMove': makeMove,
  	'addListeners': addListeners
  }
}();
	var g = new Game();			
	return g;
}
	
