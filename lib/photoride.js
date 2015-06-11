if (typeof Tap === "undefined") require("tapjs");
var _ = require("underscore");
var EventEmitter = require("events").EventEmitter;
var Modernizr = require("./modernizr");

function Photoride(cont, options) {
	EventEmitter.call(this);

	var self = this;
	this.options = _.extend({
		loop: true,
		showCount: true,
		showNav: true,
		resizeEvent: true,
		enableTouch: Modernizr.touch,
		enableArrowKeys: true
	}, options || {});

	if (cont == null) cont = document.createElement("div");
	if (typeof cont === "string") {
		cont = document.querySelector(cont);
		if (cont == null) throw new Error("Could not locate container element.");
	}

	this.container = cont;
	this.container.innerHTML = "";
	this.container.classList.add("photoride");
	this.container.classList[this.option("showNav") ? "remove" : "add"]("photoride-nav-disabled");

	this.photoCount = document.createElement("div");
	this.photoCount.style.display = this.option("showCount") ? "" : "none";
	this.photoCount.classList.add("photoride-count");
	this.container.appendChild(this.photoCount);

	this.scroll = document.createElement("div");
	this.scroll.classList.add("photoride-scroll");
	this.container.appendChild(this.scroll);

	this.nextBtn = document.createElement("a");
	this.nextBtn.href = "#";
	this.nextBtn.classList.add("photoride-btn", "photoride-btn-next");
	this.nextBtn.addEventListener("tap", this.next.bind(this, null));
	this.container.appendChild(this.nextBtn);

	this.prevBtn = document.createElement("a");
	this.prevBtn.href = "#";
	this.prevBtn.classList.add("photoride-btn", "photoride-btn-previous");
	this.prevBtn.addEventListener("tap", this.previous.bind(this, null));
	this.container.appendChild(this.prevBtn);

	this.current = 0;
	this.photos = [];
	this.refresh = _.debounce(this._refresh, 50);

	this.init();
}

module.exports = Photoride;
Photoride.Photo = Photo;
Photoride.prototype = Object.create(EventEmitter.prototype);

_.extend(Photoride.prototype, {
	init: function() {
		if (Modernizr.overflowscrolling) this._scrollDetect();

		if (this.option("resizeEvent") !== false) {
			var onResize;
			window.addEventListener("resize", onResize = this.refresh.bind(this));
			this.once("destroy", function() {
				window.removeEventListener("resize", onResize);
			});
		}

		if (this.option("enableTouch") !== false) {
			var onTouch;
			this.container.addEventListener("touchstart", onTouch = this._onTouchStart.bind(this));
			this.once("destroy", function() {
				this.container.removeEventListener("touchstart", onTouch);
			});
		}

		if (this.option("enableArrowKeys") !== false) {
			var onKeypress;
			document.addEventListener("keyup", onKeypress = this._onArrowPress.bind(this));
			this.once("destroy", function() {
				document.removeEventListener("keyup", onKeypress);
			});
		}

		this.refresh();
	},

	option: function(prop) {
		var value = this.options == null ? void 0 : this.options[prop];
		var args = Array.prototype.slice.call(arguments, 1);
		return _.isFunction(value) ? value.apply(this, args) : value;
	},

	destroy: function() {
		this.scroll.innerHTML = "";
		this.photos = [];
		this.current = 0;
		this.emit("destroy");
		this.refresh();
		return this;
	},

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

		if (this.option("showNav")) {
			var enough = this.photos.length > 1;
			this.nextBtn.style.display = !enough ? "none" : "";
			this.prevBtn.style.display = !enough ? "none" : "";

			if (!this.option("loop")) {
				this.nextBtn.classList[this.current === (this.photos.length - 1) ? "add" : "remove"]("photoride-btn-disabled");
				this.prevBtn.classList[this.current === 0 ? "add" : "remove"]("photoride-btn-disabled");
			}
		}
	},

	getCurrent: function() {
		return this.photos[this.current];
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

	next: function(loop) {
		var n = this.current + 1;
		if (loop == null) loop = this.option("loop");
		if (loop && n >= this.photos.length) n = 0;
		return this.goto(n);
	},

	previous: function(loop) {
		var n = this.current - 1;
		if (loop == null) loop = this.option("loop");
		if (loop && n < 0) n = this.photos.length - 1;
		return this.goto(n);
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

			if (Math.abs(dy) >= 50) {
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

			var chg;

			if (!horz && dx != null && Math.abs(dx) > 10)  {
				chg = dx >= 40 ? 1 : dx <= -40 ? -1 : 0;
			} else {
				chg = 0;
			}

			self.goto(self.current + chg);
		});
	},

	_onArrowPress: function(e) {
		if (e.keyCode !== 37 && e.keyCode !== 39) return;
		e.preventDefault();
		this[e.keyCode === 37 ? "previous" : "next"](this.option("loop"));
	},

	_scrollDetect: function() {
		if (this._scrollFix) return this;

		this.once("destroy", function() {
			if (this._scrollFix) {
				cancelAnimationFrame(this._scrollFix);
				delete this._scrollFix;
			}
		});

		var refresh = _.bind(function() {
			var photo = this.getCurrent();
			if (photo != null) photo.refresh();
			next();
		}, this);

		function next() {
			this._scrollFix = requestAnimationFrame(refresh);
		}

		next();
		return this;
	}
});

function Photo(src, options) {
	this.options = _.extend({
		backgroundSize: "cover",
		backgroundColor: "black",
		scrollDuration: 300,
		maxFade: 0.75,
		gradientSize: 0.3
	}, options || {});

	this.container = document.createElement("div");
	this.container.classList.add("photoride-image", "photoride-image-loading");

	this.view = document.createElement("div");
	this.view.classList.add("photoride-image-view");
	this.view.style.backgroundSize = this.option("backgroundSize");
	this.view.style.backgroundColor = this.option("backgroundColor");
	this.container.appendChild(this.view);

	this.content = document.createElement("div");
	this.content.classList.add("photoride-image-content");
	this.content.addEventListener("scroll", _.throttle(this.refresh.bind(this), 16));
	this.container.appendChild(this.content);

	this.inner = document.createElement("div");
	this.inner.classList.add("photoride-image-inner");
	this.content.appendChild(this.inner);

	this.paddingBox = document.createElement("div");
	this.paddingBox.classList.add("photoride-image-padding");
	this.inner.appendChild(this.paddingBox);

	this.title = document.createElement("div");
	this.title.classList.add("photoride-image-title");
	this.inner.appendChild(this.title);

	this.caption = document.createElement("div");
	this.caption.classList.add("photoride-image-caption");
	this.inner.appendChild(this.caption);

	this.moreBtn = document.createElement("a");
	this.moreBtn.href = "#";
	this.moreBtn.classList.add("photoride-btn", "photoride-btn-more");
	this.moreBtn.addEventListener("tap", _.bind(function(e) {
		var contentHeight = this.getContentHeight() - this.title.offsetHeight;
		this.scrollTo(this.content.scrollTop > 20 ? 0 : Math.min(contentHeight, this.content.scrollHeight - contentHeight));
	}, this));
	this.container.appendChild(this.moreBtn);

	this.setSource(src);
	this.setTitle(this.option("title"));
	this.setCaption(this.option("caption"));
}

_.extend(Photo.prototype, {
	option: Photoride.prototype.option,

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
		var duration = this.option("scrollDuration");

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
		var fade = this.option("maxFade");
		var lead = fade * perc;
		var css = this.content.style.cssText;
		var gradientSize = Math.min(100, Math.max(0, Math.round((1 - this.option("gradientSize")) * 100)));

		this.moreBtn.style.display = hasCaption ? "" : "none";
		this.moreBtn.classList[!hasCaption || scrollTop < 20 ? "remove" : "add"]("photoride-btn-more-flipped");
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
		this.container.classList.remove("photoride-image-loading");
	}
});

require("domready")(function() {
	_.each(document.querySelectorAll("[data-photoride]"), function(cont) {
		var options = autoCoerce(cont.dataset);

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
				backgroundSize: options.backgroundSize || (
					biggerWidth && biggerHeight ? "cover" :
					biggerWidth || biggerHeight ? "contain" :
					"auto" )
			}, autoCoerce(img.dataset), {
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

var numex = /^-?[0-9]*(?:\.[0-9]+)?$/,
	boolex = /^true|false$/i;

function autoCoerce(v) {
	if (typeof v === "string") {
		var trimmed = v.trim();
		if (numex.test(trimmed)) return parseFloat(v, 10);
		if (boolex.test(trimmed)) return trimmed === "true";
	}

	if (typeof v === "object") {
		v = _.clone(v);
		_.each(v, function(val, key) {
			v[key] = autoCoerce(val);
		});
	}

	return v;
}
