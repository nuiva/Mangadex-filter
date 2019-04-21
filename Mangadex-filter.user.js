// ==UserScript==
// @name Mangadex filter
// @namespace Mangadex filter
// @version 13
// @match *://mangadex.org/
// @match *://mangadex.org/updates*
// @match *://mangadex.org/manga/*
// @match *://mangadex.org/title/*
// @require      https://ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js
// @require      https://raw.githubusercontent.com/hiddentao/fast-levenshtein/master/levenshtein.js
// @require https://raw.githubusercontent.com/mathiasbynens/he/master/he.js
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_listValues
// @grant        GM_deleteValue
// ==/UserScript==

{
  function fill(opt, val){
    if (typeof load("__OPTIONS", opt) === "undefined")
      save("__OPTIONS", opt, val);
  }
  fill("FILTERED_REGEX", []);
}

if (window.location.pathname === "/") {
  main_frontpage();
} else if (window.location.pathname.match("/updates")) {
  main_updates();
} else {
  main_manga();
}

function main_frontpage() {
  $("#latest_update div.col-md-6").each(frontpage_processmanga);
  function color() {
    var $this = $(this);
    var mid = hreftomid($this.find("a.manga_title").attr("href"));
    colorbyfilter(mid, $this, 0.3);
  }
  function remove() {
    let $this = $(this);
    let mid = hreftomid($this.find("a").attr("href"));
    if (isfiltered_general(mid)) {
      $this.remove();
    } else {
      $("<a/>", {text:"Filter", style:"position:absolute;left:60px;bottom:0px", href:"javascript:;"}).click(()=>{filter(mid);$this.remove();}).appendTo($this);
    }
  }
  $("div.tab-pane li").each(color);
  $("div.owl-carousel div.large_logo").each(remove);
  button = $("<button>Mangadex filter</button>");
  button.click(controlpanel);
  button.appendTo("nav.navbar");
}
function frontpage_processmanga() {
  var $this = $(this);
  var $a = $this.find("a.manga_title");
  var href = $a.attr("href");
  var mid = hreftomid(href);
  xhr_get(mid, function(){
    if (isfiltered_general(mid)) $this.hide();
  }, 200);
  filterbutton(mid, $this, $this, "position:absolute;right:0;bottom:0");
}

function main_manga() {
  var $h = $("h6.card-header").first();
  var mid = hreftomid(window.location.pathname);
  var title = textcontent($("h6.card-header")).trim();
  var tags = [];
  var tagdict = tagmap(1);
  $("a.genre").each(function(){
    tags.push(tagdict[$(this).text()]);
  });
  var lang = $h.find("img.flag").attr("title");
  save(mid, "title", title);
  save(mid, "tags", tags);
  save(mid, "tagschecked", time());
  save(mid, "lang", lang);
  if (isfiltered_bytag(mid)) {
    $("<a/>", {text: "Filtered by tags.", style: "margin-left:30px"}).appendTo($h);
  }
  if (isfiltered_bylang(mid)) {
    $("<a/>", {text: "Filtered by language.", style: "margin-left:30px"}).appendTo($h);
  }
  if (isfiltered_byregex(mid)) {
    $("<a/>", {text: "Filtered by regex.", style: "margin-left:30px"}).appendTo($h);
  }
  var $a = $("<a/>", {style: "margin-left:30px", href: "javascript:;"});
  $h.css("background-image", "none");
  function style(){
    colorbyfilter(mid, $h, 0.5);
    $a.text(isfiltered(mid) ? "Unfilter" : "Filter");
  }
  style();
  $a.click(()=>{save(mid, "f", !isfiltered(mid));style()});
  $a.appendTo($h);
}

function main_updates() {
  var $table = $("table.table.table-striped.table-sm tr");
  var mid = -1;
  var singleseries = [];
  var first = 1;
  function filterarray(mid, v) {
    if (mid === -1) return;
    var $v = $(v.map((e)=>e[0]));
    xhr_get(mid, function(){
      if (isfiltered_general(mid)) $v.hide();
    }, 200);
    filterbutton(mid, $v, v[0].find("td:nth-child(3)"), "position:absolute;right:0");
  }
  $table.each(function(){
    var $this = $(this);
    var $a = $this.find("a.manga_title");
    if ($a.text()) {
      filterarray(mid, singleseries);
      singleseries = [];
      mid = hreftomid($a.attr("href")) || -1;
    }
    singleseries.push($this);
  });
  filterarray(mid, singleseries);
}

function filterbutton(s,$hide,$target,style) {
  var $a = $("<a/>", {text: "Filter", style: style, href: "javascript:;"});
  $a.click(function(){
    $hide.hide();
    filter(s);
  });
  $a.appendTo($target);
  return $a;
}

function xhr_get(mid, callback, delay = 1100, usecache = true) {
  //if (usecache && time() - load(mid, "tagschecked") < 2592000000) { // 30 days
  if (usecache && load(mid, "tagschecked")) {
    callback();
  } else {
    throttled_get(midtoapihref(mid),function(data){
      save(mid, "title", data.manga.title);
      save(mid, "tags", data.manga.genres);
      save(mid, "tagschecked", time());
      save(mid, "lang", data.manga.lang_name);
      callback();
    }, delay);
  }
}

// List all cache data to console, usable from webconsole for debug
cache_get = function(filter) {
  var v = GM_listValues().filter(k=>k.match(filter));
  //console.log(v);
  return v;
}
cache_print = function(mid) {
  return load(mid);
}
cache_clear = function(filter){
  var v = cache_get(filter);
  if (confirm("Specific entries shown in log.\nClear cache?")) {
    v.forEach(GM_deleteValue);
  }
}
// Get nonchanging time
function time() {
  if (typeof time.time === "undefined") {
    time.time = new Date().getTime();
  }
  return time.time;
}
// Note: Mangadex bans on 600 requests / 600 seconds.
// A delay of 1100ms leaves 55 requests to the user per 10min.
function throttled_get_delay(incr = 1100) {
  if (typeof throttled_get_delay.lastgettime === "undefined") {
    throttled_get_delay.lastgettime = 0;
  }
  throttled_get_delay.lastgettime += incr;
  var now = new Date().getTime();
  var delay = throttled_get_delay.lastgettime - now;
  if (delay < 0) {
    delay = 0;
    throttled_get_delay.lastgettime = now;
  }
  return delay;
}
function throttled_get(url, callback, delay = 1100) {
  setTimeout(()=>$.get(url, callback), throttled_get_delay(delay));
}
function save(mid, key, val){
  var data = GM_getValue(mid, false);
  if (!data) {
    data = {d: time()};
  } else if (data === 1) {
    data = {d: time(), f: true};
  } else {
    try {
      data = JSON.parse(data);
    } catch (e){
      data = false;
    }
  }
  if (typeof data !== "object") {
    data = {d: time()};
  }
  if (typeof val === undefined || val === false) {
    delete data[key];
  } else {
    data[key] = val;
  }
  var s = JSON.stringify(data);
  console.log("Stored: " + mid + " -> " + s);
  GM_setValue(mid, s);
}
function filter(mid) {
  save(mid, "f", true);
}
function load(mid, key) {
  var data = GM_getValue(mid, false);
  if (data) {
    if (typeof key === "undefined") {
      return JSON.parse(data);
    }
    return JSON.parse(data)[key];
  }
  return;
}
function optarray_get(option){
  return getoption(option) || [];
}
function optarray_getval(option, value){
  return optarray_get(option).indexOf(value) !== -1;
}
function optarray_setval(option, value, state) {
  var v = getoption(option);
  if (!v) v = [];
  if (state) {
    if (v.indexOf(value) === -1) {
      v.push(value);
    }
  } else {
    var i = v.indexOf(value);
    if (i !== -1) {
      v.splice(i,1);
    }
  }
  setoption(option, v);
}
function array_removeval(v, x) {
  let i = v.indexOf(x);
  if (i !== -1) {
    v.splice(i,1);
  }
}
function isfiltered(mid){
  return load(mid, "f");
}
function isfiltered_bytag(mid){
  var tags = load(mid, "tags");
  var dnf = getoption("FILTERED_TAGS_DNF");
  if (!mid || !tags || !dnf) return 0;
  for (let i = 0; i < dnf.length; i++) {
    let c = dnf[i];
    let x = true;
    c[0].forEach(v=>{x &= tags.includes(v);});
    c[1].forEach(v=>{x &= !tags.includes(v);});
    if (x) {
      return true;
    }
  }
  return false;
}
function isfiltered_bylang(mid){
  var lang = load(mid, "lang");
  var filtered = getoption("FILTERED_LANGS");
  if (!lang || !filtered) return false;
  return filtered.indexOf(lang) !== -1;
}
function isfiltered_byregex(mid){
  let title = load(mid, "title");
  let opt = getoption("FILTERED_REGEX");
  for (let i = 0; i < opt.length; i++) {
    let re = new RegExp(opt[i]);
    if (re.test(title)) return true;
  }
  return false;
}
function isfiltered_general(mid){
  return isfiltered(mid) || isfiltered_bytag(mid) || isfiltered_bylang(mid) || isfiltered_byregex(mid);
}
function color_green(opacity = 1){
  return "rgba(0,255,0," + opacity + ")";
}
function color_yellow(opacity = 1){
  return "rgba(255,255,25," + opacity + ")";
}
function color_red(opacity = 1){
  return "rgba(255,0,0," + opacity + ")";
}
function colorbyfilter(mid, $elem, opacity = 1){
  if (!$elem.attr("orig-color")) {
    $elem.attr("orig-color", $elem.css("background-color"));
  }
  if (isfiltered(mid)) {
    $elem.css("background-color", color_red(opacity));
  } else if (isfiltered_bytag(mid) || isfiltered_bylang(mid) || isfiltered_byregex(mid)) {
    $elem.css("background-color", color_yellow(opacity));
  } else {
    $elem.css("background-color", $elem.attr("orig-color"));
  }
}
function setoption(option, value) {
  return save("__OPTIONS", option, value);
}
function getoption(option) {
  return load("__OPTIONS", option);
}
initoptions = function(){
  GM_deleteValue("__OPTIONS");
  save("__OPTIONS", "FILTERED_LANGS", []);
  save("__OPTIONS", "FILTERED_TAGS_DNF", []);
}
cache_text = function() {
  var s = "";
  GM_listValues().forEach(function(k){
    s += k + "\n";
  });
  console.log(s);
}

function textcontent($x) {
  var s = "";
  $x[0].childNodes.forEach(function(e){if (e.nodeType == Node.TEXT_NODE) s += e.textContent;});
  return s;
}
function hreftomid(href) {
  if (typeof href === "undefined") return false;
  return href.match("[0-9]+");
}
function midtohref(mid) {
  return "/title/" + mid;
}
function midtoapihref(mid) {
  return "/api/manga/" + mid;
}
function intersection(a,b) {
  return a.filter(x => -1 !== b.indexOf(x));
}
function tagmap(dir) { // dir == 0: index -> name ##  dir == 1: name -> index
  if (typeof tagmap.tagtable === "undefined") {
    tagmap.tagtable = ["4-Koma","Action","Adventure","Award Winning","Comedy","Cooking","Doujinshi","Drama","Ecchi","Fantasy","Gyaru","Harem","Historical","Horror","[no longer used]","Martial Arts","Mecha","Medical","Music","Mystery","Oneshot","Psychological","Romance","School Life","Sci-Fi","[no longer used]","[no longer used]","Shoujo Ai","[no longer used]","Shounen Ai","Slice of Life","Smut","Sports","Supernatural","Tragedy","Long Strip","Yaoi","Yuri","[no longer used]","Video Games","Isekai","Adaptation","Anthology","Web Comic","Full Color","User Created","Official Colored","Fan Colored","Gore","Sexual Violence","Crime","Magical Girls","Philosophical","Superhero","Thriller","Wuxia","Aliens","Animals","Crossdressing","Demons","Delinquents","Genderswap","Ghosts","Monster Girls","Loli","Magic","Military","Monsters","Ninja","Office Workers","Police","Post-Apocalyptic","Reincarnation","Reverse Harem","Samurai","Shota","Survival","Time Travel","Vampires","Traditional Games","Virtual Reality","Zombies","Incest"];
    tagmap.tagdict = {};
    tagmap.tagtable.forEach((v,i)=>tagmap.tagdict[v]=i+1);
  }
  if (dir) {
    return tagmap.tagdict;
  }
  return tagmap.tagtable;
}

cache_update = ()=>console.log("Need to open control panel.");
function controlpanel(){
  if (typeof controlpanel.div === "undefined") {
    controlpanel.div = $("<div/>", {style: "position:fixed;top:0;left:0;width:100%;height:100%;z-index:10000;background-color:#fff;color:#000"});
    controlpanel.div.appendTo("body");
    var controldiv = $("<div/>", {style: "border: 2px solid black;height:30px;overflow:auto"})
    controldiv.appendTo(controlpanel.div);
    var datatable = $("<table/>", {style: "display: block; overflow: auto; white-space: nowrap; position:absolute;bottom:0;left:0;top:30px;width:100%;background-color:#fff"});
    datatable.appendTo(controlpanel.div);
    $("<button>Show tags</button>").click(()=>controlpanel_listtags(datatable)).appendTo(controldiv);
    $("<button>List cache</button>").click(()=>controlpanel_listcache(datatable, false)).appendTo(controldiv);
    $("<button>Languages</button>").click(()=>controlpanel_langs(datatable)).appendTo(controldiv);
    $("<button>Regex</button>").click(()=>controlpanel_regexes(datatable)).appendTo(controldiv);
    cache_update = ()=>controlpanel_listcache(datatable, true);
    $("<button>Close</button>").click(()=>controlpanel.div.hide()).appendTo(controldiv);
  }
  controlpanel.div.show();
  return controlpanel.div;
}

function controlpanel_listcache($table, update_xhr) {
  $table.find("tr").remove();
  GM_listValues().forEach(function(k){
    if (k !== "__OPTIONS") {
      var $tr = $("<tr/>", {style: "border-bottom:1px solid black"}).appendTo($table);
      $("<td/>", {style: "padding-left:10px"}).appendTo($tr).append($("<a/>", {text: k, href: midtohref(k), style: "color: #00c"}));
      var $controls = $("<td/>", {style: "padding-left:10px"}).appendTo($tr);
      var $name = $("<td/>", {style: "padding-left:10px"}).appendTo($tr);
      var $cache = $("<td/>", {style: "padding-left:10px"}).appendTo($tr);
      var $extra = $("<td/>", {style: "padding-left:10px"}).appendTo($tr);
      $tr.css("background-color", color_green(0.6));
      function update() {
        colorbyfilter(k, $tr, 0.6);
        $name[0].innerHTML = load(k, "title"); // jQuery can't handle HTML entity codes
        $cache.text(GM_getValue(k));
      }
      update();
      if (update_xhr) xhr_get(k, update, 1100, false);
      function togglefilter(){
        save(k, "f", !isfiltered(k));
        update();
      }
      $name.click(togglefilter);
      $cache.click(togglefilter);
      $extra.click(togglefilter);
      $controls.append(
        $("<a/>", {text: "Update", href: "javascript:;", style: "color:#000"}).click(()=>xhr_get(k,update,1100,false))
      ).append(
        $("<a/>", {text: "Remove", href: "javascript:;", style: "color:#000;margin-left:5px"}).click(function(){GM_deleteValue(k);$tr.remove()})
      )
    } else {
      var $tr = $("<tr/>", {style: "border-bottom:1px solid black"}).appendTo($table);
      $("<td/>", {text: k + ": " + GM_getValue(k), colspan: "9"}).appendTo($tr);
    }
  });
}

function controlpanel_listtags($table){
  function rulecomp(a,b){
    for (let i = 0; i < a[0].length && i < b[0].length; i++) {
      if (a[0][i] != b[0][i]) return a[0][i] - b[0][i];
    }
    if (a[0].length != b[0].length) return a[0].length - b[0].length;
    for (let i = 0; i < a[1].length && i < b[1].length; i++) {
      if (a[1][i] != b[1][i]) return a[1][i] - b[1][i];
    }
    return a[1].length - b[1].length;
  }
  function dnfsort(dnf, comp){
    dnf.forEach(v=>v.forEach(w=>w.sort((a,b)=>a-b)));
    return dnf.sort(comp);
  }
  function savednf(dnf){
    setoption("FILTERED_TAGS_DNF", dnf);
    refresh();
  }
  function refresh() {
    $table.find("tr").remove();
    let dnf = getoption("FILTERED_TAGS_DNF");
    if (!dnf) dnf = [];
    let tagrows = tagmap(0).map(function(v,i){
      let j = i+1;
      let $tr = $("<tr/>", {style: "border-bottom: 1px solid black"}).append("<td>" + j + "</td>");
      $("<td/>", {style: "padding: 0 10px 0 20px", text: v}).click(()=>savednf(dnfsort(dnf, (a,b)=>(b[0].includes(j)-a[0].includes(j)) || (b[1].includes(j)-a[1].includes(j)) || rulecomp(a,b)))).appendTo($tr);
      $tr.appendTo($table);
      return $tr;
    });
    let $control = $("<tr/>").appendTo($table);
    $("<td/>", {text: "Add rule", colspan: "2"}).click(()=>{dnf.push([[],[]]);savednf(dnf);}).appendTo($control);
    
    let descstring = "Filter if ";
    console.log(dnf);
    for (let k = 0; k < dnf.length; k++) {
      let counter = 0;
      descstring += (k ? " or " : "") + "(";
      let disj = dnf[k];
      for (let i = 1; i <= tagrows.length; i++) {
        let state = 0;
        if (disj[0].includes(i)) state = 1;
        else if (disj[1].includes(i)) state = 2;
        
        var $td = $("<td/>", {style: "border-right: 1px solid black; width: 80px;"}).appendTo(tagrows[i-1]);
        if (disj[0].includes(i)) {
          $td.click(()=>{array_removeval(disj[0],i);disj[1].push(i);savednf(dnf);});
          $td.css("background-color", color_red(0.6));
          $td.text("filtered");
          descstring += (counter++ ? " and " : "") + tagmap(0)[i-1];
        } else if (disj[1].includes(i)) {
          $td.click(()=>{array_removeval(disj[1],i);savednf(dnf);});
          $td.css("background-color", color_green(0.6));
          $td.text("exception");
          descstring += (counter++ ? " and " : "") + "not " + tagmap(0)[i-1];
        } else {
          $td.click(()=>{disj[0].push(i);savednf(dnf);});
          $td.css("background-color", color_yellow(0.6));
          $td.text("ignored");
        }
      };
      descstring += (!counter ? "true" : "") + ")";
      $("<td/>", {text: "Remove"}).click(()=>{dnf.splice(k,1);savednf(dnf);}).appendTo($control);
    };
    $("<tr/>").append("<td colspan=\"2\" title=\"" + descstring + "\">Hover for rules</td>").appendTo($table);
    $("<tr/>").append("<td colspan=\"2\">Sort</td>").click(()=>savednf(dnfsort(dnf, rulecomp))).appendTo($table);
  }
  refresh();
}

function controlpanel_langs($table){
  $table.find("tr").remove();
  function addlangrow($tr, lang){
    $("<td/>").append($("<a/>", {text: "Unfilter", href: "javascript:;", style: "color:#000;margin-left:5px"}).click(function(){optarray_setval("FILTERED_LANGS", lang, false); $tr.remove()})).appendTo($tr);
    $("<td/>", {text: lang, style: "padding:0 20px 0 10px"}).appendTo($tr);
  }
  var langs = getoption("FILTERED_LANGS");
  langs.forEach(function(v){
    addlangrow($("<tr/>").appendTo($table), v);
  });
  var $tr = $("<tr/>").appendTo($table);
  var $td = $("<td/>", {colspan: "2"}).appendTo($tr);
  var $input = $("<input/>", {type: "text"}).appendTo($td);
  $("<button/>", {text: "Filter"}).click(function(){
    var lang = $input.val();
    optarray_setval("FILTERED_LANGS", lang, true);
    addlangrow($("<tr/>").insertBefore($tr), lang);
  }).appendTo($td);
}


function controlpanel_regexes($table){
  $table.find("tr").remove();
  function addlangrow($tr, lang){
    $("<td/>").append($("<a/>", {text: "Unfilter", href: "javascript:;", style: "color:#000;margin-left:5px"}).click(function(){optarray_setval("FILTERED_REGEX", lang, false); $tr.remove()})).appendTo($tr);
    $("<td/>", {text: lang, style: "padding:0 20px 0 10px"}).appendTo($tr);
  }
  var langs = getoption("FILTERED_REGEX");
  langs.forEach(function(v){
    addlangrow($("<tr/>").appendTo($table), v);
  });
  var $tr = $("<tr/>").appendTo($table);
  var $td = $("<td/>", {colspan: "2"}).appendTo($tr);
  var $input = $("<input/>", {type: "text"}).appendTo($td);
  $("<button/>", {text: "Filter"}).click(function(){
    var r = $input.val();
    optarray_setval("FILTERED_REGEX", r, true);
    addlangrow($("<tr/>").insertBefore($tr), r);
  }).appendTo($td);
}


function proxysearch(urlprefix, names, callback, nthname = 0) {
  if (nthname >= names.length && nthname > 0) {
    return;
  }
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      if (xhttp.responseText) {
        callback(xhttp.responseText);
      } else {
        proxysearch(urlprefix, names, callback, nthname + 1);
      }
    }
  };
  xhttp.open("GET", "https://two-d.faith/close/proxy/" + urlprefix + encodeURI(names[nthname]), true);
  xhttp.send();
}
function pushuniq(array, val) {
  if (!array.includes(val)) {
    array.push(val);
  }
  return array;
}
function filter_manganame(name) {
  proxysearch("mangadex_search.php?n=", pushuniq([name], name.replace(/ ?(\(.+\)|\.)$/,'')), function(id){
    xhr_get(id, function(){
      filter(id);
    });
  });
}

filter_list = function(s){
  var strings = s.split(/\r?\n/);
  var i = 0;
  setInterval(function(){
    if (i == strings.length) return;
    filter_manganame(strings[i]);
    i += 1;
  }, 1100);
}


