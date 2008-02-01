/**
 * @overview rank
 * @version 1.0
 * @author zara
*/   

/**
 * @class Hodnotici widget
 * @param {Object || String} container id nebo reference na kontejner - prvek obsahujici hodnotici odkazy
 * @param {Object} pole s parametry:
 * <ul>
 *  <li>ajax true/false hodnota, urcujici, ma-li se pouzit na odeslani hodnoceni AJAX</li>
 *  <li>post true/false hodnota, urcujici, ma-li se pouzit na odeslani POST (jinak GET)</li>
 *  <li>selectedClass nazev css tridy vybrane ikonky</li>
 * </ul>
 * @constructor
 */

 SZN.Rank = SZN.ClassMaker.makeClass({
	NAME:"Rank",
	VERSION:"1.0",
	CLASS:"class"
});

SZN.Rank.prototype.destructor = function() {
	this._removeEvents();
	for (var p in this) { this[p] = null; }
}

SZN.Rank.prototype.$constructor = function(container, options) {
	this.ec = [];
	this.dom = {
		container:SZN.gEl(container)
	}
	this.items = [];
	
	this.options = {
		ajax:false,
		post:false,
		selectedClass:"selected"
	}
	for (var p in options) { this.options[p] = options[p]; }
	
	
	var children = [];
	for (var i=0;i<this.dom.container.childNodes.length;i++) {
		children.push(this.dom.container.childNodes[i]);
	}
	for (var i=0;i<children.length;i++) {
		var item = children[i];
		if (item.nodeType != 1) {
			item.parentNode.removeChild(item);
		} else if (item.tagName.toLowerCase() == "a") {
			this.items.push(new SZN.RankItem(this,item));
		} else {
//			alert("Unknown ranking node!");
		}
	}
	
	if (this.options.ajax) {
		var method = (this.options.post ? "post" : "get");
		this.rq = new SZN.HTTPRequest();
		this.rq.setMethod(method);
		this.rq.setFormat("txt");
		this.rq.setMode("async");
	}
	
	this._addEvents();
}

SZN.Rank.prototype.disable = function() {
	this._removeEvents();
	this._mouseout();
	for (var i=0;i<this.items.length;i++) {
		this.items[i]._disable();
	}
}

SZN.Rank.prototype._addEvents = function() {
	for (var i=0;i<this.items.length;i++) { this.items[i]._addEvents(); }
	this.ec.push(SZN.Events.addListener(this.dom.container,"mouseover",this,"_mouseover",false,true));
	this.ec.push(SZN.Events.addListener(this.dom.container,"mouseout",this,"_mouseout",false,true));
}

SZN.Rank.prototype._removeEvents = function() {
	for (var i=0;i<this.items.length;i++) { this.items[i]._removeEvents(); }
	for (var i=0;i<this.ec.length;i++) { SZN.Events.removeListener(this.ec[i]); }
}

SZN.Rank.prototype._mouseover = function(e, elm) {
	SZN.Dom.addClass(this.dom.container,"rank-active");
}

SZN.Rank.prototype._mouseout = function(e, elm) {
	SZN.Dom.removeClass(this.dom.container,"rank-active");
	for (var i=0;i<this.items.length;i++) {
		this.items[i]._removeActive();
	}
}

SZN.Rank.prototype._makeActive = function(item) {
	var done = false;
	for (var i=0;i<this.items.length;i++) {
		var it = this.items[i];
		if (!done && !it.active) { it._addActive(); }
		if (done && it.active) { it._removeActive(); }
		if (it == item) { done = true; }
	}
}

SZN.Rank.prototype._send = function(url) {
	var data = "";
	var r = url.match(/^(.*)\?(.*)$/);
	if (r) {
		var u = r[1];
		data = r[2];
	} else {
		var u = url;
	}
	data += "&ajax=1";
	if (this.options.post) {
		this.rq.setPostData(data);
	} else {
		u += "?"+data;
	}
	this.rq.send(u,this,"_response");
}

SZN.Rank.prototype._response = function(response) {
	var data = eval("("+response+")");
	this.disable();
	if (data.error) {
		alert(data.error);
	} else {
		var rating = data.rating;
		if (!rating) { return; }
		for (var i=0;i<this.items.length;i++) {
			var item = this.items[i];
			item.dom.container.style.cursor = "default";
			if (i < rating) {
				item._select();
			} else {
				item._deselect();
			}
		}
	}
}

/* ------------------------------------------------------------------------------------------------ */

SZN.RankItem = SZN.ClassMaker.makeClass({
	NAME:"RankItem",
	VERSION:"1.0",
	CLASS:"class"
});

SZN.RankItem.prototype.$destructor = function() {
}

SZN.RankItem.prototype.$constructor = function(owner, link) {
	this.owner = owner;
	this.active = false;
	this.ec = [];
	this.dom = {
		container:link
	}
}

SZN.RankItem.prototype._addEvents = function() {
	this.ec.push(SZN.Events.addListener(this.dom.container,"mouseover",this,"_mouseover",false,true));
	if (this.owner.options.ajax) {
		this.ec.push(SZN.Events.addListener(this.dom.container,"click",this,"_click",false,true));
	}
}

SZN.RankItem.prototype._removeEvents = function() {
	for (var i=0;i<this.ec.length;i++) { SZN.Events.removeListener(this.ec[i]); }
}

SZN.RankItem.prototype._addActive = function() {
	this.active = true;
	SZN.Dom.addClass(this.dom.container,"rank-active");
}

SZN.RankItem.prototype._removeActive = function() {
	this.active = false;
	SZN.Dom.removeClass(this.dom.container,"rank-active");
}

SZN.RankItem.prototype._mouseover = function() {
	this.owner._makeActive(this);
}

SZN.RankItem.prototype._click = function(e, elm) {
	SZN.Events.cancelDef(e);
	this.owner._send(this.dom.container.href);
}

SZN.RankItem.prototype._disable = function() {
	this.dom.container.href = "#";
	SZN.Dom.addClass(this.dom.container, "disabled");
}

SZN.RankItem.prototype._select = function() {
	SZN.Dom.addClass(this.dom.container,this.owner.options.selectedClass);
}

SZN.RankItem.prototype._deselect = function() {
	SZN.Dom.removeClass(this.dom.container,this.owner.options.selectedClass);
}
