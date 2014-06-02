var Game = function(size1,size2,target) {
	var b1Element = document.getElementById("b1"), 
			b2Element = document.getElementById("b2"),
			targetSpan = document.getElementById("target").firstElementChild,
			show_hints = document.getElementById("show_hints"),
			nodes = Array.prototype.slice.call(document.getElementsByClassName("move")),
			historyElems = document.getElementsByClassName("history"),
			changeSizesButton = document.getElementById("changeSizes"),
			uls = document.getElementsByTagName("ul"),
			buckets = { 
				"b1": {"size": size1, "elem": b1Element }, 
			  "b2": {"size": size2,  "elem": b2Element },
			  "requiredGallons": target
			},
			b1CurrentHeight = b2CurrentHeight = 0, 
			hintmode = false, hintSteps, lakeFull = true,
			section = null, currentStep = 0,
			animation_one_in_progress = 0, currentTickb1,
			animation_two_in_progress = 0, currentTickb2,
			step = {
				"count": 0,
				"check": function(h1, h2) {
					this.count += 1;
					return h1 == buckets.requiredGallons
							|| h2 == buckets.requiredGallons
							|| h2 + h1 == buckets.requiredGallons;
				}
			};

function Game() {
	// I believe in the Revealing Prototype Pattern, properties on this Game are public while variables are private 
	// so called "priviledged method";
	var that = this;
	this.updateBuckets = function(n) {
		var split = this.elem.firstElementChild.innerHTML.split("/");
		split[n] = n == 0 ? this.currentHeight : this.size;
		this.elem.firstElementChild.innerHTML = split.join("/");
	};
	this.setup(buckets.b1.size, buckets.b2.size);
	Object.defineProperty(buckets.b1, "currentHeight", {
		get: function() { return b1CurrentHeight; },
		set: function(newVal) { 
			b1CurrentHeight = newVal;
			that.updateBuckets.call(this, 0);
		}
	});
	Object.defineProperty(buckets.b2, "currentHeight", {
		get: function() { return b2CurrentHeight; },
		set: function(newVal) { 
			b2CurrentHeight = newVal;
			that.updateBuckets.call(this, 0);
		}
	});
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
		g.updateBuckets.call(buckets.b1, 1);
		g.updateBuckets.call(buckets.b2, 1);
		console.log(b1Element, b2Element);
		b1Element.style.backgroundSize = "200px " + 5 + "px";
		b2Element.style.backgroundSize = "200px " + 5 + "px";
		if (newHeight < 30) {
			b2Element.style.height = "30px";
			b2Element.style.marginTop = "75px";
		} else {
			b2Element.style.height = newHeight + "px";
			b2Element.style.marginTop = 105 - smaller/larger*100 + "px";
		}
		step.count = 0;
		unsetActiveElem();
	},
	// *=*=*=*=*=*=*=*=*=*=*=*=  Everything related to managing states of the game =*=*=*=*=*=*=*=*=*=*=*=*
	
	// when the currentHeight's change, the numerator of the buckets changes, 
	// and when we change the size of the buckets, the denominator changes.
	
	hideOrShowAll = function(n) {
		nodes.forEach(function(node) { node.style.opacity = n;});
	},
	newActiveElem = function() {
		unsetActiveElem();
		hideActiveElem();
		setNewActiveElem(currentElem());
	},
	unsetActiveElem = function() {
		var elem = document.getElementsByClassName("active")[0];
		if (elem) { 
			elem.className = elem.className.replace(" active", "");
		}
	},
	hideElem = function() {
		var elem = document.getElementsByClassName("active")[0];
		elem.style.opacity = 0;
	},
	setNewActiveElem = function(elem) {
		elem.style.opacity = 1;
		elem.className = elem.className + " active";
	},
	correctMove = function() {
		return hintSteps[currentStep].state[0] == buckets.b1.currentHeight 
				&& hintSteps[currentStep].state[1] == buckets.b2.currentHeight;
	},
	changeSizes = function() {
		var rand1 = Math.random()*50|0,
				rand2 = Math.random()*50|0;
		var newTarget = (rand1 + rand2-1)*Math.random()|0;
		targetSpan.innerHTML = newTarget;
		buckets.requiredGallons = newTarget;
		historyElems[0].innerHTML = "";
		historyElems[1].innerHTML = "";
		hintSteps = null;
		if (hintmode) { hideOrShowAll(1); hintmode = false; };
		setup(rand1, rand2, g);
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
			stepHistory();
			if (step.check(buckets.b1.currentHeight, buckets.b2.currentHeight)) { 
				alert("You did it in " + step.count + " steps!"); 
			} else {
				if (hintSteps && correctMove()) { ++currentStep; }

				if (hintmode) { 
					newActiveElem(); 
				}
			}
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
	stepHistory = function() {
		var p1 = document.createElement("p");
		var p2 = document.createElement("p");
		p1.innerHTML = buckets.b1.currentHeight;
		p2.innerHTML = buckets.b2.currentHeight;
		historyElems[0].appendChild(p1);
		historyElems[1].appendChild(p2);
	}
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
			currentTickb1 = tick();
			// order matters here. despite it not being intuitive currentTick has to be defined, then after the timeout runs, anim is defined
			anim = currentTickb1, animation_in_progress = animation_one_in_progress;
		} else {
			if (animation_two_in_progress) {
				clearTimeout(currentTickb2);
				setFrom();
			} else { 
				++animation_two_in_progress; 
			}
			currentTickb2 = tick();
			anim = currentTickb2, animation_in_progress = animation_two_in_progress;
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
	},
	// *=*=*=*=*=*=*=*=*=*=*=*=  Show Hints =*=*=*=*=*=*=*=*=*=*=*=*
	hintMode = function() {
		var steps, emptying, currentInd;
		if (hintmode) {
			unsetActiveElem();
			hideOrShowAll(1);
		} else {
			if (!hintSteps) {
				var startWithOne = trial(buckets.b1.size, buckets.b2.size, buckets.requiredGallons);
				var startWithTwo = trial(buckets.b2.size, buckets.b1.size, buckets.requiredGallons);
				var indexOne = currentIndex(startWithOne.steps, 0, 1);
				var indexTwo = currentIndex(startWithTwo.steps, 1, 0);
				var remainingSteps1 = startWithOne.count - indexOne;
				var remainingSteps2 = startWithTwo.count - indexTwo;
				if (remainingSteps1 <= remainingSteps2) {
					console.log("true");
						currentInd = indexOne;
						steps = startWithOne.steps;
						section = "b1Wrapper";
					} else {
						currentInd = indexTwo;
						steps = startWithTwo.steps;
						section = 'b2Wrapper';
				}
				hintSteps = steps.slice(0);
				console.log(currentInd);
				setCurrentStep(currentInd, steps);
				hideOrShowAll(0);
				setNewActiveElem(currentElem());
			} else {
				// we know the fastest path, we just have to see where we are at on that path.
				if (section == 'b1Wrapper') {
					setCurrentStep(currentIndex(hintSteps, 0, 1));
					hideOrShowAll(0);
					setNewActiveElem(currentElem());
				} else {
					setCurrentStep(currentIndex(hintSteps, 1, 0));
					hideOrShowAll(0);
					setNewActiveElem(currentElem());
				}
			}
		}
		toggleHintMode();
	},
	setCurrentStep = function(currentInd) {
		if (currentInd < 0) { 
			currentStep = 0;
			hintSteps.unshift({"step": "empty", "state": [0,0]});
		} else {
			currentStep = currentInd;
		}
	},
	trial = function(h1, h2, target) {
		var hght1 = hght2 = 0, change, alotted;
		var newStep = clone(step);
		newStep.count = 0;
		var stepArr = [];
		while (!newStep.check(hght1, hght2) && newStep.count < 50) {
			if (hght1 == 0) {
				hght1 = h1;
				stepArr.push({"step": "fill", "state": [hght1, hght2]});
			} else if (hght1 == h1
				|| hght2 == 0) {
				alotted = h2 - hght2;
				change =  hght1 > alotted ? alotted : hght1;
				hght2 += change;
				hght1 -= change;
				stepArr.push({"step": "transfer", "state": [hght1, hght2]});
			} else if (hght2 == h2) {
				hght2 = 0;
				stepArr.push({"step": "empty", "state": [hght1, hght2]});
			}
		}
		return { "count": newStep.count - 1, "steps": stepArr};
	},

	// *=*=*=*=*=*=*=*=*=*=*=*=  helpers =*=*=*=*=*=*=*=*=*=*=*=*
	whichElement = function(id) {
		return id == "b1" ? b1Element : b2Element;
	},
	toggleHintMode = function() {
		hintmode = hintmode == false ? true : false;
	},
	currentIndex = function(steps, n, n2) {
		// current index is called when a user clicks on Show Hints, 
		// and we need to figure out what step we are currently on in order to find out 
		// what the quickest way of finishing is. 
		for (var i = steps.length - 1; i >= 0; i--) {
			if (steps[i].state[n] == buckets.b1.currentHeight 
			 && steps[i].state[n2] == buckets.b2.currentHeight) {
				return i+1;
			}
		}
		return buckets.b1.currentHeight == 0 && buckets.b2.currentHeight == 0 ? 0 : -1;
	},
	swapSection = function(section) {
		return section == "b1Wrapper" ? "b2Wrapper" : "b1Wrapper";
	},
	emptying = function() {
		console.log(hintSteps, currentStep);
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
  	for (var i = 0; i < 2; i++) {
  		uls[i].addEventListener("click", makeMove, false);
  	}
  	changeSizesButton.addEventListener("click", changeSizes, false);
  	show_hints.addEventListener("click", function() {
			var greatestCF = gcd(buckets.b1.size, buckets.b2.size);
			if (buckets.requiredGallons % greatestCF != 0) {
				alert("This is not possible because " + greatestCF + " is the highest common factor of both " + buckets.b1.size + " and " + buckets.b2.size + ", but " + greatestCF + " is not a factor of " + buckets.requiredGallons + "!");
			} else { hintMode(); }
  	}, false);
  };
  return {
  	'setup': setup,
  	'hintMode': hintMode,
  	'makeMove': makeMove,
  	'addListeners': addListeners
  }
}();
	var g = new Game();			
	return g;
}
	
