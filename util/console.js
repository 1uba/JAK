SZN.Shell = SZN.ClassMaker.makeClass({
	NAME:"Shell",
	VERSION:"1.0",
	CLASS:"class"
});
SZN.Shell.COMMAND_PREPROCESS = 1;
SZN.Shell.COMMAND_STANDARD = 2;
SZN.Shell.COMMAND_FALLBACK = 3;

SZN.Shell.prototype.$constructor = function(console) {
	this.console = console;

	this.context = "";
	this.contextObject = null;
	this.prompt = "";
	
	this.commands = {};
	this.commands[SZN.Shell.COMMAND_PREPROCESS] = [];
	this.commands[SZN.Shell.COMMAND_STANDARD] = [];
	this.commands[SZN.Shell.COMMAND_FALLBACK] = [];

	this.addCommand(new SZN.Shell.Command.Clear());
	this.addCommand(new SZN.Shell.Command.Eval());
	this.addCommand(new SZN.Shell.Command.CD());
	this.addCommand(new SZN.Shell.Command.Pwd());
	this.addCommand(new SZN.Shell.Command.Prompt());
	this.addCommand(new SZN.Shell.Command.Help());
	this.addCommand(new SZN.Shell.Command.History());
	this.addCommand(new SZN.Shell.Command.Exit());
	this.addCommand(new SZN.Shell.Command.ReloadCSS());
	this.addCommand(new SZN.Shell.Command.LS());
	this.addCommand(new SZN.Shell.Command.Suggest());
	
	this.setContext("");
	this.setPrompt("%{SZN.Browser.client}:%l$");
}

SZN.Shell.prototype.$destructor = function() {
	if (this.console) { this.console.$destructor(); }
}

/* -------------------- verejne metody shellu urcene k vyuziti v commandech ------------------------ */

/**
 * vrati seznam vsech zaregistrovanych dvojic daneho typu 
 */
SZN.Shell.prototype.getCommands = function(type) { 
	return this.commands[type]; 
}

/**
 * zaregistruje command
 */
SZN.Shell.prototype.addCommand = function(command) {
	var hooks = command.getHooks();
	for (var i=0;i<hooks.length;i++) {
		var hook = hooks[i];
		var placement = hook.placement;
		var method = hook.method || "execute";
		this.commands[placement].push([command, method]);
	}
}

/**
 * vycisti konzoli
 */
SZN.Shell.prototype.clear = function() {
	if (this.console) { this.console.clear(); }
}

/**
 * vrati formatovaci retezec pro prompt
 */
SZN.Shell.prototype.getPrompt = function() {
	return this.prompt;
}

/**
 * vrati string aktualniho kontextu
 */
SZN.Shell.prototype.getContext = function() {
	return this.context;
}

/**
 * vrati context jako object 
 */
SZN.Shell.prototype.getContextObject = function() {
	return this.contextObject;
}

/**
 * nastavi formatovaci retezec pro prompt
 */
SZN.Shell.prototype.setPrompt = function(prompt) {
	this.prompt = prompt;
	if (this.console) { 
		var str = this._formatContext();
		this.console.setPrompt(str); 
	}
}

/**
 * nastavi kontext
 */
SZN.Shell.prototype.setContext = function(context) {
	var ptr = window;
	var newContext = [];
	var parts = context.split(".");
	for (var i=0;i<parts.length;i++) {
		var part = parts[i];
		if (!part) { continue; }
		if (!(part in ptr)) { return false; }
		ptr = ptr[part];
		newContext.push(part);
	}
	
	this.context = newContext.join(".");
	this.contextObject = ptr;
	if (this.console) { 
		var str = this._formatContext();
		this.console.setPrompt(str); 
	}
	return true;
}

SZN.Shell.prototype._execute = function(command, method, input, keyCode) {
	var result = command[method].apply(command, [input, this, keyCode]);
	if (result && this.console) { this.console.print(result); }
}

/**
 * nastala udalost -> shell reaguje 
 */
SZN.Shell.prototype.event = function(input, keyCode) { /* xxx todo: rozlisit command a event */
	/* preprocess */
	var list = this.commands[SZN.Shell.COMMAND_PREPROCESS];
	for (var i=0;i<list.length;i++) {
		var obj = list[i][0];
		var method = list[i][1];
		this._execute(obj, method, input, keyCode);
	}
	
	var re = input.match(/^ *([^ ]+)/);
	if (!re || keyCode != 13) { return; }
	var cmd = re[1];
	if (this.console) { this.console.print("<strong>"+this._formatContext()+"</strong>"+input+"\n"); }
	
	/* standard */
	var list = this.commands[SZN.Shell.COMMAND_STANDARD];
	var ok = false;
	for (var i=0;i<list.length;i++) { /* vsechny commandy */
		var obj = list[i][0];
		var method = list[i][1];
		var names = obj.getNames();
		if (names.indexOf(cmd) != -1) { /* shoda v nazvu -> vykonat */
			ok = true;
			this._execute(obj, method, input, keyCode);
		}
	}
	
	/* fallback */
	if (!ok) {
		var list = this.commands[SZN.Shell.COMMAND_FALLBACK];
		for (var i=0;i<list.length;i++) {
			var obj = list[i][0];
			var method = list[i][1];
			this._execute(obj, method, input, keyCode);
		}
	}
	
	this.setInput("");
}

/**
 * nastavi hodnotu inputu
 */
SZN.Shell.prototype.setInput = function(input) {
	if (this.console) { this.console.setInput(input); }
}

/* -------------------- ostatni byznys: privatni metody, console, abstraktni command ---------- */

/**
 * zformatuje context na prompt
 */
SZN.Shell.prototype._formatContext = function() {
	var p = this.prompt;
	var last = this.context.split(".").pop();
	
	p = p.replace(/%c/g,this.context || "window");
	p = p.replace(/%l/g,last || "window");
	p = p.replace(/%{.*?}/g,function(s){
		var s = "("+s.substring(2,s.length-1)+")";
		return eval(s);
	});
	/* replace */
	return p+" ";
}

SZN.Console = SZN.ClassMaker.makeClass({
	NAME:"Console",
	VERSION:"1.0",
	CLASS:"class"
});

SZN.Console.prototype.$constructor = function() {
	this.ec = []
	this.dom = {
		container:SZN.cEl("div",false,"console-container",{position:"absolute"}),
		input:SZN.cEl("input",false,"console-input"),
		output:SZN.cEl("div",false,"console-output",{overflow:"auto"}),
		prompt:SZN.cEl("span",false,"console-prompt")
	}
	
	this.left = 0;
	this.top = 0;
	this.width = 500;
	this.height = 300;
	
	SZN.Dom.append([this.dom.container, this.dom.output, this.dom.prompt, this.dom.input]);
	document.body.insertBefore(this.dom.container, document.body.firstChild);
	
	this.dom.input.focus();
	this.ec.push(SZN.Events.addListener(this.dom.input, "keyup", this, "_keyup", false, true));
	this.ec.push(SZN.Events.addListener(this.dom.input, "keydown", this, "_keydown", false, true));
	
	this._restyle();
	this.shell = new SZN.Shell(this);
}

SZN.Console.prototype.$destructor = function() {
	for (var i=0;i<this.ec.length;i++) {
		SZN.Events.removeListener(this.ec[i]);
	}
	this.dom.container.parentNode.removeChild(this.dom.container);
}

SZN.Console.prototype._restyle = function() {
	this.dom.container.style.left = this.left+"px";
	this.dom.container.style.top = this.top+"px";
	this.dom.output.style.width = this.width+"px";
	this.dom.output.style.height = this.height+"px";
	
	var l = this.dom.prompt.offsetWidth;
	var w = this.width - l - 18;
	this.dom.input.style.width = w+"px";
}

SZN.Console.prototype._keyup = function(e, elm) {
	if (e.keyCode == 9) { return; }
	this.shell.event(this.dom.input.value, e.keyCode);
}

SZN.Console.prototype._keydown = function(e, elm) {
	if (e.keyCode == 9) {
		SZN.Events.cancelDef(e);
		this.shell.event(this.dom.input.value, e.keyCode);
	}
}

SZN.Console.prototype.clear = function() {
	SZN.Dom.clear(this.dom.output);
}

SZN.Console.prototype.setPrompt = function(prompt) {
	this.dom.prompt.innerHTML = prompt;
	this._restyle();
}

SZN.Console.prototype.setInput = function(input) {
	this.dom.input.value = input;
	this.dom.input.focus();
}

SZN.Console.prototype.getShell = function() {
	return this.shell;
}

SZN.Console.prototype.print = function(data) {
	var d = SZN.cEl("div");
	d.innerHTML = data;
	this.dom.output.appendChild(d);
	this.dom.output.scrollTop = this.dom.output.scrollHeight;
}

SZN.Shell.Command = SZN.ClassMaker.makeClass({
	NAME:"Command",
	VERSION:"1.0",
	CLASS:"class"
});

SZN.Shell.Command.prototype.$constructor = function() {
	this.names = [];
	this.help = "";
}

SZN.Shell.Command.prototype.getNames = function() { 
	return this.names;
}

SZN.Shell.Command.prototype.getHooks = function() {
	return [{placement:SZN.Shell.COMMAND_STANDARD}];
}

SZN.Shell.Command.prototype.execute = function(input, shell, keyCode) {
	return false;
}

SZN.Shell.Command.prototype.getHelp = function() {
	return this.help;
}

SZN.Shell.Command.prototype._tokenize = function(input) {
	var result = [];
	
	function numSlashes(i) {
		var cnt = 0;
		var ptr = i-1;
		while (ptr >= 0 && input.charAt(ptr) == "\\") {
			cnt++;
			ptr--;
		}
		return cnt;
	}
	
	var current = "";
	var inSpecial = "";
	for (var i=0;i<input.length;i++) {
		var ch = input.charAt(i);
		switch (ch) {
			case '"':
			case "'":
				var num = numSlashes(i);
				if (!(num & 1)) {
					inSpecial = (inSpecial ? "" : ch);
					if (!inSpecial && current) {
						result.push(current);
						current = "";
					}
				}
			break;
			
			case " ":
				if (current && !inSpecial) {
					result.push(current);
					current = "";
				}
			break;
			
			default:
				current += ch;
			break;
		}
	}
	if (current) { result.push(current); }
	
	return result;
}

/* ------------------------- zde nasleduji jednotlive commandy ------------------ */

SZN.Shell.Command.Clear = SZN.ClassMaker.makeClass({
	NAME:"Clear",
	VERSION:"1.0",
	CLASS:"class",
	IMPLEMENT:SZN.Shell.Command
});

SZN.Shell.Command.Clear.prototype.$constructor = function() {
	this.names = ["clear","cls"];
	this.help = "clear the console";
}

SZN.Shell.Command.Clear.prototype.execute = function(input, shell, keyCode) {
	shell.clear();
	return false;
}

/**/

SZN.Shell.Command.Eval = SZN.ClassMaker.makeClass({
	NAME:"Eval",
	VERSION:"1.0",
	CLASS:"class",
	IMPLEMENT:SZN.Shell.Command
});

SZN.Shell.Command.Eval.prototype.getHooks = function() {
	return [{placement:SZN.Shell.COMMAND_FALLBACK}];
}

SZN.Shell.Command.Eval.prototype.execute = function(input, shell, keyCode) {
	var str = "("+input+")";
	var context = shell.getContextObject();
	var result = this.evaluator.call(context, str);
	var str = this._format(result);
	return str;
}

SZN.Shell.Command.Eval.prototype._format = function(data) {
	if (data === null) { return "[null]"; }
	if (typeof(data) == "undefined") { return "[undefined]"; }
	return data.toString();
}

SZN.Shell.Command.Eval.prototype.evaluator = function(str) {
	try {
		var result = eval(str);
		return result;
	} catch(e) {
		return e;
	}
	return "";
}

/**/

SZN.Shell.Command.CD = SZN.ClassMaker.makeClass({
	NAME:"CD",
	VERSION:"1.0",
	CLASS:"class",
	IMPLEMENT:SZN.Shell.Command
});

SZN.Shell.Command.CD.prototype.$constructor = function() {
	this.names = ["cd"];
	this.help = "change context, no value == window";
}

SZN.Shell.Command.CD.prototype.execute = function(input, shell, keyCode) {
	var argv = this._tokenize(input);
	var newContext = "";
	if (argv.length > 1) { 
		if (argv[1] == "..") {
			var c = shell.getContext().split(".");
			c.splice(c.length-1,1);
			newContext = c.join(".");
		} else {
			newContext = shell.getContext()+"."+argv[1]; 
		}
	}
	var result = shell.setContext(newContext);
	if (!result) { return "Cannot change context to '"+newContext+"'"; }
	return false;
}

/**/

SZN.Shell.Command.Prompt = SZN.ClassMaker.makeClass({
	NAME:"Prompt",
	VERSION:"1.0",
	CLASS:"class",
	IMPLEMENT:SZN.Shell.Command
});

SZN.Shell.Command.Prompt.prototype.$constructor = function() {
	this.names = ["prompt"];
	this.help = "view or set the prompt formatting mask: %c = context, %l = last context part, %{} = eval()'ed code";
}

SZN.Shell.Command.Prompt.prototype.execute = function(input, shell, keyCode) {
	var argv = this._tokenize(input);
	if (argv.length > 1) {
		var p = argv[1];
		shell.setPrompt(p);
	} else {
		return shell.getPrompt();
	}
	return false;
}

/**/

SZN.Shell.Command.Help = SZN.ClassMaker.makeClass({
	NAME:"Help",
	VERSION:"1.0",
	CLASS:"class",
	IMPLEMENT:SZN.Shell.Command
});

SZN.Shell.Command.Help.prototype.$constructor = function() {
	this.names = ["help", "man", "hehe","heheh"];
	this.help = "describe command or list commands";
}

SZN.Shell.Command.Help.prototype.execute = function(input, shell, keyCode) {
	var argv = this._tokenize(input);
	var commands = shell.getCommands(SZN.Shell.COMMAND_STANDARD);
	if (argv.length > 1) {
		var command = false;
		var c = argv[1];
		for (var i=0;i<commands.length;i++) {
			var names = commands[i][0].getNames();
			if (names.indexOf(c) != -1) { command = commands[i][0]; }
		}

		if (command) {
			var h = command.getHelp();
			if (h) {
				return "<strong>"+command.getNames().join(", ")+"</strong>: " + h;
			} else {
				return "Command <strong>"+c+"</strong> has no help";
			}
		} else {
			return "There is no command <strong>"+c+"</strong>";
		}
	} else {
		var result = "Available commands:\n";
		var arr = [];
		
		var pairs = [];
		var max = 0;
		for (var i=0;i<commands.length;i++) {
			var obj = commands[i][0];
			var names = obj.getNames().join(", ");
			var help = obj.getHelp();
			pairs.push([names, help]);
			max = Math.max(max, names.length);
		}
		for (var i=0;i<pairs.length;i++) {
			var item = pairs[i];
			var str = "<strong>"+item[0]+"</strong>";
			for (var j=item[0].length; j < max+1; j++) { str += " "; }
			str += item[1];
			arr.push(str);
		}
		
		arr.sort();
		result += arr.join("\n");
		return result;
	}
}

/**/

SZN.Shell.Command.History = SZN.ClassMaker.makeClass({
	NAME:"History",
	VERSION:"1.0",
	CLASS:"class",
	IMPLEMENT:SZN.Shell.Command
});

SZN.Shell.Command.History.prototype.$constructor = function() {
	this.ptr = -1;
	this.stack = [];
	this.lastTyped = "";
	this.names = ["history"];
	this.help = "show history; clear it with 'clear' argument";
}

SZN.Shell.Command.History.prototype.getHooks = function() {
	return [
		{placement:SZN.Shell.COMMAND_PREPROCESS, method:"_key"},
		{placement:SZN.Shell.COMMAND_PREPROCESS, method:"_record"},
		{placement:SZN.Shell.COMMAND_STANDARD}
	];
}

SZN.Shell.Command.History.prototype._key = function(input, shell, keyCode) {
	switch (keyCode) {
		case 38:
			if (this.ptr > 0) {
				this.ptr--;
				if (!this.lastTyped) {
					this.lastTyped = input;
				}
				shell.setInput(this.stack[this.ptr]);
			}
		break;
		
		case 40:
			if (this.ptr == this.stack.length) { break; }
			this.ptr++;
			if (this.ptr == this.stack.length) {
				shell.setInput(this.lastTyped);
			} else {
				shell.setInput(this.stack[this.ptr]);
			}
		break;
	}
}

SZN.Shell.Command.History.prototype._record = function(input, shell, keyCode) {
	if (keyCode != 13) { return; }
	this.lastTyped = "";
	if (input.length) {
		this.stack.push(input);
		this.ptr = this.stack.length;
	}
}

SZN.Shell.Command.History.prototype.execute = function(input, shell, keyCode) {
	var argv = this._tokenize(input);
	if (argv.length > 1 && argv[1] == "clear") {
		this.stack = [];
		this.ptr = -1;
		this.lastTyped = "";
		return "History cleared";
	} else {
		var str = "History:\n";
		str += this.stack.join("\n");
		return str;
	}
}

/**/

SZN.Shell.Command.Exit = SZN.ClassMaker.makeClass({
	NAME:"Exit",
	VERSION:"1.0",
	CLASS:"class",
	IMPLEMENT:SZN.Shell.Command
});

SZN.Shell.Command.Exit.prototype.$constructor = function() {
	this.names = ["quit", "exit", "bye"];
	this.help = "destroy shell & console";
}

SZN.Shell.Command.Exit.prototype.execute = function(input, shell, keyCode) {
	shell.$destructor();
	return false;
}

/**/

SZN.Shell.Command.ReloadCSS = SZN.ClassMaker.makeClass({
	NAME:"ReloadCSS",
	VERSION:"1.0",
	CLASS:"class",
	IMPLEMENT:SZN.Shell.Command
});

SZN.Shell.Command.ReloadCSS.prototype.$constructor = function() {
	this.names = ["rcss"];
	this.help = "reload appended stylesheets";
}

SZN.Shell.Command.ReloadCSS.prototype.execute = function(input, shell, keyCode) {
	var styles = [];
	var urls = [];
	var all = document.getElementsByTagName("link");
	var h = document.getElementsByTagName("head");

	if (h.length) {
		h = h[0];
	} else {
		return "No &lt;head&gt; element found";
	}

	for (var i=0;i<all.length;i++) { /* projit a zapamatovat */
		if (all[i].rel == "stylesheet") { 
			styles.push(all[i]); 
			var url = all[i].href.match(/^[^?]+/);
			urls.push(url[0]);
		}
	}
	for (var i=0;i<styles.length;i++) { /* vyfakovat */
		styles[i].parentNode.removeChild(styles[i]);
	}
	for (var i=0;i<urls.length;i++) { /* vyrobit */
		var l = SZN.cEl("link");
		l.rel = "stylesheet";
		l.type = "text/css";
		l.href = urls[i]+"?"+Math.random();
		h.appendChild(l);
	}
	
	if (urls.length) { 
		return urls.length + " stylesheet(s) reloaded";
	} else {
		return "No stylesheets found";
	}
}

/**/

SZN.Shell.Command.LS = SZN.ClassMaker.makeClass({
	NAME:"LS",
	VERSION:"1.0",
	CLASS:"class",
	IMPLEMENT:SZN.Shell.Command
});

SZN.Shell.Command.LS.prototype.$constructor = function() {
	this.names = ["ls"];
	this.help = "list available properties in current context";
}

SZN.Shell.Command.LS.prototype.execute = function(input, shell, keyCode) {
	var obj = shell.getContextObject();
	var list = [];
	for (var p in obj) { list.push(p); }
	list.sort();
	return list.join("\n");
}

/**/

SZN.Shell.Command.Suggest = SZN.ClassMaker.makeClass({
	NAME:"Suggest",
	VERSION:"1.0",
	CLASS:"class",
	IMPLEMENT:SZN.Shell.Command
});

SZN.Shell.Command.Suggest.prototype.$constructor = function() {
}

SZN.Shell.Command.Suggest.prototype.getHooks = function() {
	return [{placement:SZN.Shell.COMMAND_PREPROCESS, method:"suggest"}];
}

SZN.Shell.Command.Suggest.prototype._insensitiveSort = function(a,b) {
	return (a.toLowerCase() < b.toLowerCase() ? -1 : 1);
}

SZN.Shell.Command.Suggest.prototype.suggest = function(input, shell, keyCode) {
	if (keyCode != 9) { return false; }
	var part = input.match(/[^ ]*$/);
	part = part[0];
	
	/* list properties when part contains dot or when this is not first word */
	var first = input.match(/^ *([^ ]*)/);
	first = first[1];
	
	if (part.indexOf(".") != -1 || first != part) {
		var data = this._listProperties(part, shell);
	} else {
		var data = this._listCommands(part, shell);
	}

	var remainder = data[0];
	var options = data[1];

	if (remainder) { shell.setInput(input + remainder); }
	if (options.length) {
		return options.sort(this._insensitiveSort).join("\n");
	} else { return false; }
	
}

SZN.Shell.Command.Suggest.prototype._listCommands = function(str, shell) {
	var commands = shell.getCommands(SZN.Shell.COMMAND_STANDARD);
	var result = [];
	
	var all = [];
	for (var i=0;i<commands.length;i++) {
		var obj = commands[i][0];
		var names = obj.getNames();
		for (var j=0;j<names.length;j++) { all.push(names[j]); }
	}
	var re = new RegExp("^"+str);
	for (var i=0;i<all.length;i++) {
		if (re.test(all[i])) { result.push(all[i]); }
	}
	
	if (!result.length) { return ["",[]]; } /* zadny vysledek */
	if (result.length == 1) { /* prave jeden vysledek */
		return [result[0].substring(str.length),[]];
	} else { /* vice vysledku - najit spolecny zacatek */
		var cmd = "";
		var ch = "";
		var ok = true;
		var index = 0;
		while (ok) {
			for (var i=0;i<result.length;i++) {
				if (!i) { 
					ch = result[i].charAt(index); 
				} else {
					ok = ok && (result[i].charAt(index) == ch);
				}
			}
			if (!ch) { ok = false; }
			if (ok) { cmd += ch; }
			index++;
		}
		cmd = cmd.substring(str.length);
		return [cmd,result];
	}
}

SZN.Shell.Command.Suggest.prototype._listProperties = function(str, shell) {
	var start = window;
	var context = shell.getContextObject();
	if (str.match(/^this/)) { start = shell.getContextObject(); }
	var ptr = context;
	
	var parts = str.split("."); /* docestovat dle zatim zadane cesty */
	for (var i=0;i<parts.length;i++) {
		var part = parts[i];
		if (!i && part == "this") { continue; }
		if (part == "") { continue; }
		if (i+1 != parts.length) { 
			if (part in ptr) {
				ptr = ptr[part]; 
			} else {
				return ["",[]];
			}
		}
	}
	
	var last = parts.pop();
	var props = this._listStartProperties(ptr, last);
	
	if (last in ptr && props.length == 1) {
		ptr = ptr[last];
		props = this._listStartProperties(ptr, "");
		return [".",props];
	}
	
	if (last == "") {
		return ["",props];
	}
	
	switch (props.length) { /* rozhodnout podle poctu moznosti, ktere odpovidaji */
		case 0: return ["",[]]; break;
		case 1: return [props[0].substring(last.length),[]]; break;
		default:
			var cmd = "";
			var ch = "";
			var ok = true;
			var index = 0;
			while (ok) {
				for (var i=0;i<props.length;i++) {
					if (!i) { 
						ch = props[i].charAt(index); 
					} else {
						ok = ok && (props[i].charAt(index) == ch);
					}
				}
				if (!ch) { ok = false; }
				if (ok) { cmd += ch; }
				index++;
			}
			cmd = cmd.substring(str.length);
			return [cmd,props];
		break;
	}
}

SZN.Shell.Command.Suggest.prototype._listStartProperties = function(obj, prefix) {
	var re = new RegExp("^"+prefix);
	var result = [];
	for (var p in obj) {
		if (re.test(p)) { result.push(p); }
	}
	return result;
}

/**/

SZN.Shell.Command.Pwd = SZN.ClassMaker.makeClass({
	NAME:"Pwd",
	VERSION:"1.0",
	CLASS:"class",
	IMPLEMENT:SZN.Shell.Command
});

SZN.Shell.Command.Pwd.prototype.$constructor = function() {
	this.names = ["pwd"];
	this.help = "output current context";
}

SZN.Shell.Command.Pwd.prototype.execute = function(input, shell, keyCode) {
	return shell.getContext();
}