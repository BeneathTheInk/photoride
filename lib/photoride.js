if (typeof Tap === "undefined") require("tapjs");
var _ = require("underscore");

function Photoride(cont, options) {
	var self = this;
	this.options = options || {};

	if (cont == null) cont = document.createElement("div");
	if (typeof cont === "string") {
		cont = document.querySelector(cont);
		if (cont == null) throw new Error("Could not locate container element.");
	}

	this.container = cont;
	this.container.innerHTML = "";
	this.container.classList.add("photoride");
	this.container.addEventListener("touchstart", this._onTouchStart.bind(this));

	this.photoCount = document.createElement("div");
	var noShowCount = this.options.showCount === false || this.options.showCount === "false";
	this.photoCount.style.display = noShowCount ? "none" : "";
	this.photoCount.classList.add("photoride-count");
	this.container.appendChild(this.photoCount);

	this.scroll = document.createElement("div");
	this.scroll.classList.add("photoride-scroll");
	this.container.appendChild(this.scroll);

	this.nextBtn = document.createElement("a");
	this.nextBtn.href = "#";
	this.nextBtn.classList.add("photoride-next-btn");
	this.nextBtn.addEventListener("tap", this.next.bind(this));
	this.container.appendChild(this.nextBtn);

	this.prevBtn = document.createElement("a");
	this.prevBtn.href = "#";
	this.prevBtn.classList.add("photoride-prev-btn");
	this.prevBtn.addEventListener("tap", this.previous.bind(this));
	this.container.appendChild(this.prevBtn);

	this.current = 0;
	this.photos = [];

	this.refresh = _.debounce(this._refresh, 50);
	window.addEventListener("resize", this.refresh.bind(this));
	this.refresh();
}

module.exports = Photoride;
Photoride.Photo = Photo;

_.extend(Photoride.prototype, {
	findBySource: function(src) {
		return _.find(this.photos, function(photo) {
			return photo.source === src;
		});
	},

	_refresh: function() {
		this.width = this.container.clientWidth;
		this.height = this.container.clientHeight;
		this.scroll.style.width = (this.photos.length * this.width) + "px";

		_.each(this.photos, function(photo) {
			photo.container.style.width = this.width + "px";
			photo.refresh();
		}, this);

		var onAnimEnd;
		var left = (-1 * (this.current * this.width)) + "px";
		var eleft = this.scroll.style.left;

		if (eleft && eleft !== "auto" && eleft !== left) {
			this.scroll.classList.add("photoride-scroll-transition");
			addPrefixedEvent(this.scroll, "TransitionEnd", onAnimEnd = function(e) {
				removePrefixedEvent(this, "TransitionEnd", onAnimEnd);
				this.classList.remove("photoride-scroll-transition");
			});
		}

		this.photoCount.textContent = (this.current + 1) + " / " + this.photos.length;
		this.scroll.style.left = left;
	},

	push: function(src, options) {
		return this.add(this.photos.length, src, options);
	},

	add: function(index, src, options) {
		var photo = new Photo(src, _.extend({}, this.options, options));
		var index = this.photos.length;
		this.photos.splice(index, 0, photo);
		this.scroll.appendChild(photo.container);
		this.refresh();
		return photo;
	},

	goto: function(n) {
		if (typeof n !== "number" || isNaN(n)) n = 0;
		this.current = Math.max(0, Math.min(this.photos.length - 1, n));
		this.refresh();
		return this;
	},

	next: function() {
		return this.goto(this.current + 1);
	},

	previous: function() {
		return this.goto(this.current - 1);
	},

	_onTouchStart: function(e) {
		var touchMove, touchEnd;

		var touch = e.touches[0],
			ix = touch.pageX,
			iy = touch.pageY,
			horz = false,
			self = this,
			dx, dy, left;

		this.container.addEventListener("touchmove", touchMove = function(e) {
			if (horz) return;

			var touch = e.touches[0];
			dx = ix - touch.pageX;
			dy = iy - touch.pageY;

			if (Math.abs(dy) >= 20) {
				horz = true;
				self.goto(self.current);
			} else if (Math.abs(dx) >= 10) {
				left = (self.current * self.width) + dx;
				self.scroll.style.left = (-1 * left) + "px";
			}
		});

		this.container.addEventListener("touchend", touchEnd = function(e) {
			this.removeEventListener("touchmove", touchMove);
			this.removeEventListener("touchend", touchEnd);

			var moved, chg;

			if (!horz && dx != null && Math.abs(dx) > 10)  {
				moved = dx / self.width;
				chg = dx >= 30 ? 1 : dx <= -30 ? -1 : 0;
			} else {
				chg = 0;
			}

			self.goto(self.current + chg);
		});
	}
});

function Photo(src, options) {
	this.options = _.extend({
		backgroundSize: "cover",
		backgroundColor: "black"
	}, options || {});

	this.container = document.createElement("div");
	this.container.classList.add("photoride-image");

	this.view = document.createElement("div");
	this.view.classList.add("photoride-image-view");
	this.view.style.backgroundSize = this.options.backgroundSize;
	this.view.style.backgroundColor = this.options.backgroundColor;
	this.container.appendChild(this.view);

	this.content = document.createElement("div");
	this.content.classList.add("photoride-image-content");
	this.content.addEventListener("scroll", _.throttle(this.refresh.bind(this), 16));
	this.container.appendChild(this.content);

	this.paddingBox = document.createElement("div");
	this.paddingBox.classList.add("photoride-image-padding");
	this.content.appendChild(this.paddingBox);

	this.title = document.createElement("div");
	this.title.classList.add("photoride-image-title");
	this.content.appendChild(this.title);

	this.caption = document.createElement("div");
	this.caption.classList.add("photoride-image-caption");
	this.content.appendChild(this.caption);

	this.moreBtn = document.createElement("a");
	this.moreBtn.href = "#";
	this.moreBtn.classList.add("photoride-image-more");
	this.moreBtn.addEventListener("tap", _.bind(function(e) {
		this.scrollTo(this.getContentHeight() - this.title.offsetHeight);
	}, this));
	this.container.appendChild(this.moreBtn);

	this.toTopBtn = document.createElement("a");
	this.toTopBtn.href = "#";
	this.toTopBtn.classList.add("photoride-image-top");
	this.toTopBtn.addEventListener("tap", _.bind(function(e) {
		this.scrollTo(0);
	}, this));
	this.container.appendChild(this.toTopBtn);

	this.setSource(src);
	this.setTitle(this.options.title);
	this.setCaption(this.options.caption);
}

_.extend(Photo.prototype, {
	setSource: function(src) {
		this.source = src;
		this.view.style.backgroundImage = "url('" + src + "')";
		return this;
	},

	setTitle: function(title) {
		if (!title) {
			this.title.textContent = "";
			this.title.classList.add("photoride-image-title-empty");
		}

		else {
			this.title.textContent = title;
			this.title.classList.remove("photoride-image-title-empty");
		}

		return this;
	},

	setCaption: function(content) {
		if (content == null) content = "";
		if (typeof content === "string") {
			if (!content) this.caption.style.display = "none";
			else {
				this.caption.style.display = "";
				this.caption.innerHTML = content;
			}
			return this;
		}

		this.caption.innerHTML = "";
		if (typeof content.nodeType === "number") {
			this.caption.appendChild(el);
		} else if (content.length) {
			_.each(content, function(el) {
				this.caption.appendChild(el);
			}, this);
		}

		return this;
	},

	scrollTo: function(to) {
		if (this._scrollFrame) {
			cancelAnimationFrame(this._scrollFrame);
			delete this._scrollFrame;
		}

		var self = this;
		var scrollTop = this.content.scrollTop;
		var duration = this.options.scrollDuration || 300;

		// find difference between current scroll position(relative to document.body) and the bink element to which we are scrolling to
		var difference = to - scrollTop;

		// if target bink is within the upper part of window's view then don't scroll
		if (duration < 0 || !difference) return;

		// variable for holding time count
		var start;

		function runScroll() {
			// use time stamp to calculate time
			var t = new Date();
			if (start == null) start = t;

			// difference in time
			var tDiff = t - start;

			// if difference in time is greater than our initially set duration, animation is complete
			if (tDiff >= duration){
				self.content.scrollTop = to;
				delete self._scrollFrame;
				return;
			}

			// increment the scrollTop position
			self.content.scrollTop = scrollTop + ((tDiff/duration) * difference);

			// rerun function until animation is complete
			self._scrollFrame = requestAnimationFrame(runScroll);
		};

		this._scrollFrame = requestAnimationFrame(runScroll);
		return this;
	},

	getContentHeight: function() {
		var height = this.content.clientHeight;
		var contentStyle = getComputedStyle(this.content);
		var paddingTop = parseInt(contentStyle.paddingTop, 10);
		if (isNaN(paddingTop)) paddingTop = 0;
		var paddingBottom = parseInt(contentStyle.paddingBottom, 10);
		if (isNaN(paddingBottom)) paddingBottom = 0;
		return height - paddingTop - paddingBottom;
	},

	refresh: function() {
		this.content.style.backgroundColor = "";
		this.content.style.backgroundImage = "";

		var hasCaption = this.caption.hasChildNodes();
		var hasTitle = this.title.textContent !== "";
		var contentHeight = this.getContentHeight();
		var clientHeight = this.content.clientHeight;
		var scrollTop = this.content.scrollTop;
		var height = Math.min(this.content.scrollHeight - clientHeight, clientHeight * 0.6);
		var perc = scrollTop / height;
		perc = isNaN(perc) ? 0 : Math.min(1, perc);
		var fade = parseFloat(this.options.maxFade, 10);
		fade = isNaN(fade) ? 0.75 : fade;
		var lead = fade * perc;
		var css = this.content.style.cssText;
		var gradientSize = parseFloat(this.options.gradientSize, 10);
		gradientSize = isNaN(gradientSize) ? 0.3 : gradientSize;
		gradientSize = Math.min(100, Math.max(0, Math.round((1 - gradientSize) * 100)));

		this.toTopBtn.style.display = hasCaption && scrollTop >= 20 ? "" : "none";
		this.moreBtn.style.display = hasCaption && scrollTop < 20 ? "" : "none";
		this.paddingBox.style.height = (contentHeight - this.title.offsetHeight) + "px";

		if (hasCaption || hasTitle) {
			if (fade !== lead) {
				var gradient = [
					"rgba(0, 0, 0, " + lead + ") 0%",
					"rgba(0, 0, 0, " + lead + ") " + gradientSize + "%",
					"rgba(0, 0, 0, " + fade + ") 100%"
				].join(", ");

				[
					"-webkit-linear-gradient(top, ",
					"-moz-linear-gradient(top, ",
					"-o-linear-gradient(top, ",
					"linear-gradient(to bottom, "
				].forEach(function(s) {
					css += " background-image: " + s + gradient + ");";
				});
			} else {
				css += " background-color: rgba(0, 0, 0, " + fade + ");";
			}
		}

		this.content.style.cssText = css;
	}
});

require("domready")(function() {
	_.each(document.querySelectorAll("[data-photoride]"), function(cont) {
		var options = cont.dataset;

		var imgs = _.map(cont.querySelectorAll("img"), function(img) {
			var captionQuery = img.dataset.caption;
			var caption, captionel;
			if (captionQuery) {
				captionel = cont.querySelector(captionQuery);
				if (captionel != null) caption = _.toArray(captionel.childNodes);
			}

			var biggerWidth = img.naturalWidth >= cont.clientWidth;
			var biggerHeight = img.naturalHeight >= cont.clientHeight;
			var opts = _.extend({
				backgroundSize:  options.backgroundSize || (
					biggerWidth && biggerHeight ? "cover" :
					biggerWidth || biggerHeight ? "contain" :
					"auto" )
			}, img.dataset, {
				title: img.getAttribute("title"),
				caption: caption
			});

			return [ img.src, opts ];
		});

		var photoride = cont.photoride = new Photoride(cont, options);

		imgs.forEach(function(args) {
			photoride.push.apply(photoride, args);
		});
	});
});

var requestAnimationFrame =
	window.requestAnimationFrame ||
	window.mozRequestAnimationFrame ||
	window.webkitRequestAnimationFrame ||
	window.oRequestAnimationFrame ||
	function (f) { return setTimeout(f, 16); };

var cancelAnimationFrame =
	window.cancelAnimationFrame ||
	window.mozCancelAnimationFrame ||
	window.webkitCancelAnimationFrame ||
	window.oCancelAnimationFrame ||
	function (t) { return clearTimeout(t); };

var pfx = ["webkit", "moz", "MS", "o", ""];

function addPrefixedEvent(element, type, callback) {
	for (var p = 0; p < pfx.length; p++) {
		if (!pfx[p]) type = type.toLowerCase();
		element.addEventListener(pfx[p]+type, callback, false);
	}
}

function removePrefixedEvent(element, type, callback) {
	for (var p = 0; p < pfx.length; p++) {
		if (!pfx[p]) type = type.toLowerCase();
		element.removeEventListener(pfx[p]+type, callback, false);
	}
}
