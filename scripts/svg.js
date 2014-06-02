var s = Snap(600,400),
		aspect_ratio = 822/567,
		lake = s.image("imgs/lake-figure-color.svg", 0, 0, 600, (600/aspect_ratio)),
		current_height = 400/aspect_ratio,
		translateX = -(1.2*400-400)/2, filled,
		translateY = -(1.2*current_height-current_height)/2,
		m = new Snap.Matrix();