// ==UserScript==
// @name Mangadex filter
// @namespace Mangadex filter
// @version 11
// @match *://mangadex.org/
// @match *://mangadex.org/updates*
// @match *://mangadex.org/manga/*
// @require      https://ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js
// @require      https://raw.githubusercontent.com/hiddentao/fast-levenshtein/master/levenshtein.js
// @require https://raw.githubusercontent.com/mathiasbynens/he/master/he.js
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_listValues
// @grant        GM_deleteValue
// ==/UserScript==


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
  $("div.tab-pane li").each(color);
  $("div.large_logo div.car-caption").each(color);
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
  console.log(v);
  return v;
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
  return false;
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
function filtertag(tag, state) {
  return optarray_setval("TAGS_FILTERED", tag, state);
}
function istagfiltered(tag) {
  return optarray_getval("TAGS_FILTERED", tag);
}
function isfiltered(mid){
  return load(mid, "f");
}
function isfiltered_bytag(mid){
  var tags = load(mid, "tags");
  var filtered = getoption("TAGS_FILTERED");
  if (!tags || !filtered) return false;
  return intersection(tags,filtered).length > 0;
}
function isfiltered_bylang(mid){
  var lang = load(mid, "lang");
  var filtered = getoption("FILTERED_LANGS");
  if (!lang || !filtered) return false;
  return filtered.indexOf(lang) !== -1;
}
function isfiltered_general(mid){
  return isfiltered(mid) || isfiltered_bytag(mid) || isfiltered_bylang(mid);
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
  } else if (isfiltered_bytag(mid) || isfiltered_bylang(mid)) {
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
  return "/manga/" + mid;
}
function midtoapihref(mid) {
  return "/api/manga/" + mid;
}
function intersection(a,b) {
  return a.filter(x => -1 !== b.indexOf(x));
}
function tagmap(dir) { // dir == 0: index -> name ##  dir == 1: name -> index
  if (typeof tagmap.tagtable === "undefined") {
    tagmap.tagtable = ["4-Koma", "Action", "Adventure", "Award Winning", "Comedy", "Cooking", "Doujinshi", "Drama", "Ecchi", "Fantasy", "Gender Bender", "Harem", "Historical", "Horror", "Josei", "Martial Arts", "Mecha", "Medical", "Music", "Mystery", "Oneshot", "Psychological", "Romance", "School Life", "Sci-Fi", "Seinen", "Shoujo", "Shoujo Ai", "Shounen", "Shounen Ai", "Slice of Life", "Smut", "Sports", "Supernatural", "Tragedy", "Webtoon", "Yaoi", "Yuri", "[no chapters]", "Game", "Isekai"];
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
  $table.find("tr").remove();
  var i = 1;
  tagmap(0).forEach(function(v){
    var j = i;
    var $tr = $("<tr/>", {style: "border-bottom: 1px solid black"}).append("<td>" + j + "</td>").append("<td style=\"padding:0 10px 0 20px\">" + v + "</td>");
    $tr.click(()=>{filtertag(j,!istagfiltered(j));$tr.css("background-color",istagfiltered(j)?color_yellow(0.6):color_green(0.6))});
    $tr.css("background-color",istagfiltered(j)?color_yellow(0.6):color_green(0.6));
    $tr.appendTo($table);
    i += 1;
  });
}

function controlpanel_langs($table){
  $table.find("tr").remove();
  function addlangrow($tr, lang){
    $("<td/>").append($("<a/>", {text: "Unfilter", href: "javascript:;", style: "color:#000;margin-left:5px"}).click(function(){optarray_setval("FILTERED_LANGS", lang, false); $tr.remove()})).appendTo($tr);
    $("<td/>", {text: lang, style: "padding:0 20px 0 10px"}).appendTo($tr);
  }
  var langs = getoption("FILTERED_LANGS");
  if (!langs) langs = [];
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



