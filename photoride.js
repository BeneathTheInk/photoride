var _ = require("underscore");

function Photoride(cont, options) {
	if (cont == null) cont = document.createElement("div");
	if (typeof cont === "string") {
		cont = document.querySelector(cont);
		if (cont == null) throw new Error("Could not locate container element.");
	}

	this.container = cont;
	this.container.innerHTML = "";
	this.container.classList.add("photoride");

	this.scroll = document.createElement("div");
	this.scroll.classList.add("photoride-scroll");
	this.container.appendChild(this.scroll);

	this.current = 0;
	this.photos = [];

	this.refresh = _.debounce(this._refresh, 200);
	window.addEventListener("resize", this.refresh.bind(this));
	this.refresh();
}

module.exports = Photoride;

_.extend(Photoride.prototype, {
	_init: function() {

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
			photo.title.style.paddingTop = "";
			// photo.caption.style.minHeight = "";
			photo.content.scrollTop = 0;

			var height = photo.getContentHeight() - photo.title.offsetHeight;
			photo.title.style.paddingTop = height + "px";
			// photo.caption.style.minHeight = height + "px";
			photo.updateGradient();
		}, this);

		this.scroll.style.left = (-1 * (this.current * this.width)) + "px";
	},

	add: function(src, title, caption) {
		var photo = new Photo(src);
		var index = this.photos.length;
		this.photos.push(photo);
		this.scroll.appendChild(photo.container);
		photo.setTitle(title);
		photo.setCaption(caption);
		this.refresh();
		return photo;
	},

	next: function() {
		this.current = Math.min(this.photos.length - 1, this.current + 1);
		this.refresh();
		return this;
	},

	previous: function() {
		this.current = Math.max(0, this.current - 1);
		this.refresh();
		return this;
	}
});

function Photo(src) {
	this.container = document.createElement("div");
	this.container.classList.add("photoride-image");

	this.view = document.createElement("div");
	this.view.classList.add("photoride-image-view");
	this.container.appendChild(this.view);

	this.content = document.createElement("div");
	this.content.classList.add("photoride-image-content");
	this.content.addEventListener("scroll", _.throttle(this.updateGradient.bind(this), 16));
	this.container.appendChild(this.content);

	this.title = document.createElement("div");
	this.title.classList.add("photoride-image-title");
	this.content.appendChild(this.title);

	this.caption = document.createElement("div");
	this.caption.classList.add("photoride-image-caption");
	this.content.appendChild(this.caption);

	this.setSource(src);
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

	getContentHeight: function() {
		var height = this.content.clientHeight;
		var contentStyle = getComputedStyle(this.content);
		var paddingTop = parseInt(contentStyle.paddingTop, 10);
		if (isNaN(paddingTop)) paddingTop = 0;
		var paddingBottom = parseInt(contentStyle.paddingBottom, 10);
		if (isNaN(paddingBottom)) paddingBottom = 0;
		return height - paddingTop - paddingBottom;
	},

	updateGradient: function() {
		var hasCaption = this.caption.hasChildNodes();
		var hasTitle = this.title.textContent !== "";
		var clientHeight = this.content.clientHeight;
		var height = Math.min(this.content.scrollHeight - clientHeight, clientHeight * 0.6);
		var perc = this.content.scrollTop / height;
		perc = isNaN(perc) ? 0 : Math.min(1, perc);
		var fade = 0.75;
		var lead = fade * perc;

		this.content.style.backgroundColor = "";
		this.content.style.backgroundImage = "";
		var css = this.content.style.cssText;

		if (hasCaption || hasTitle) {
			if (fade !== lead) {
				var gradient = "rgba(0, 0, 0, " + lead + ") 0%, rgba(0, 0, 0, " + lead + ") 70%, rgba(0, 0, 0, " + fade + ") 100%";

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
		var imgs = _.map(cont.querySelectorAll("img"), function(img) {
			var captionQuery = img.dataset.caption;
			var caption, captionel;
			if (captionQuery) {
				captionel = cont.querySelector(captionQuery);
				if (captionel != null) caption = _.toArray(captionel.childNodes);
			}

			return [ img.src, img.getAttribute("title"), caption ];
		});

		var photoride = cont.photoride = new Photoride(cont, cont.dataset);

		imgs.forEach(function(args) {
			photoride.add.apply(photoride, args);
		});
	});
});
