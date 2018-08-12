// ==UserScript==
// @name Mangadex filter
// @namespace Mangadex filter
// @version 10
// @match *://mangadex.org/
// @match *://mangadex.org/search
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
} else if (window.location.pathname === "/search") {
  main_search();
} else {
  main_manga();
}

function main_frontpage() {
  $("#latest_update div.col-md-6").each(frontpage_processmanga);
  function colorbyfilter() {
    var $this = $(this);
    var mid = hreftomid($this.find("a.manga_title").attr("href"));
    if (isfiltered(mid)) {
      $this.css("background-color","rgba(255,0,0,0.5)");
    } else if (anytagfiltered(load(mid, "tags"))) {
      $this.css("background-color","rgba(120,120,0,0.5)");
    }
  }
  $("div.tab-pane li").each(colorbyfilter);
  $("div.large_logo div.car-caption").each(colorbyfilter);
  button = $("<button>Mangadex filter</button>");
  button.click(controlpanel);
  button.appendTo("nav.navbar");
}
function frontpage_processmanga() {
  var $this = $(this);
  var $a = $this.find("a.manga_title");
  var href = $a.attr("href");
  var mid = hreftomid(href);
  if (isfiltered(mid)) {
    $this.hide();
    return;
  }
  xhr_tagfilter(mid, $this);
  filterbutton(mid, $this, $this, "position:absolute;right:0;bottom:0");
}

function main_manga() {
  var $h = $("h6.card-header");
  var mid = hreftomid(window.location.pathname);
  var title = textcontent($("h6.card-header")).trim();
  var tags = [];
  var tagdict = tagmap(1);
  $("a.genre").each(function(){
    tags.push(tagdict[$(this).text()]);
  });
  save(mid, "title", title);
  save(mid, "tags", tags);
  save(mid, "tagschecked", time());
  if (anytagfiltered(tags)) {
    $("<a/>", {text: "Filtered by tags.", style: "background-color:#a00;margin-left:30px"}).appendTo($h);
  }
  var $a = $("<a/>", {style: "margin-left:30px", href: "javascript:;"});
  function style(){
    $h.css("background-color", isfiltered(mid) ? "#a00": "");
    $h.css("background-image", isfiltered(mid) ? "none": "");
    $a.text(isfiltered(mid) ? "Unfilter" : "Filter");
  }
  style();
  $a.click(()=>{save(mid, "f", !isfiltered(mid));style()});
  $a.appendTo($h);
}

function main_search() {
  var i = 1;
  $("div.custom-control.custom-checkbox").each(function(){
    var $this = $(this);
    var j = i;
    i += 1;
    var istagfiltered = ()=>anytagfiltered([j]);
    var $a = $("<a/>", {style: "position:absolute;right:0", href: "javascript:;"});
    $a.text(istagfiltered() ? "Unfilter" : "Filter");
    $a.css("color", istagfiltered() ? "#a00" : "#0a0");
    $a.click(function(){
      filtertag(j, !istagfiltered());
      $a.css("color", istagfiltered() ? "#a00" : "#0a0");
      $a.text(istagfiltered() ? "Unfilter" : "Filter");
    });
    $a.appendTo($this);
  });
}

function main_updates() {
  var $table = $("table.table.table-striped.table-sm tr");
  var mid = -1;
  var singleseries = [];
  var first = 1;
  function filterarray(mid, v) {
    if (mid === -1) return;
    var $v = $(v.map((e)=>e[0]));
    if (isfiltered(mid)) {
      $v.hide();
    } else {
      xhr_tagfilter(mid, $v);
      filterbutton(mid, $v, v[0].find("td:nth-child(3)"), "position:absolute;right:0");
    }
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

function xhr_tagfilter(mid, $hide) {
  if (load(mid, "tagschecked")) {
    if (anytagfiltered(load(mid, "tags"))) {
      $hide.hide();
    }
  } else {
    xhr_get(mid, function(data){
      if (anytagfiltered(data.manga.genres)) {
        $hide.hide();
      }
    }, 200);
  }
}
function xhr_get(mid, callback, delay = 1100) {
  throttled_get(midtoapihref(mid),function(data){
    save(mid, "title", data.manga.title);
    save(mid, "tags", data.manga.genres);
    save(mid, "tagschecked", time());
    callback(data);
  }, delay);
}

// Clear all entries in cache
function clearall() {
  GM_listValues().forEach(function(k){
    console.log("Cleared: " + k);
    GM_deleteValue(k);
  });
  console.log("Cleared cache.");
}
// Clear entries for some identifier in cache
function clearfilter(s) {
  GM_listValues().filter((k)=>k.match(s)).forEach(function(k){
    GM_deleteValue(k);
    console.log("Deleted: " + k);
  });
}
// List all cache data to console, usable from webconsole for debug
cache_list = function(filter) {
  var print = (k)=>console.log(k, GM_getValue(k));
  if (!filter) {
    GM_listValues().forEach(print);
  } else {
    GM_listValues().filter((k)=>k.match(filter)).forEach(print);
  }
}
cache_clear = function(filter){
  if (typeof filter === "undefined") {
    if (confirm("Clear cache?")) {
      clearall();
    }
  } else {
    clearfilter(filter);
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
function filtertag(tag, state) {
  var tags = getoption("TAGS_FILTERED");
  if (!tags) {
    tags = [];
  }
  if (state) {
    if (tags.indexOf(tag) === -1) {
      tags.push(tag);
    }
  } else {
    var i = tags.indexOf(tag);
    if (i !== -1) {
      tags.splice(i,1);
    }
  }
  setoption("TAGS_FILTERED", tags);
}
function istagfiltered(tag) {
  return getoption("TAGS_FILTERED").indexOf(tag) !== -1;
}
function isfiltered(mid){
  return load(mid, "f");
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
function anytagfiltered(tags) {
  var filtered = getoption("TAGS_FILTERED");
  if (!tags || !filtered) return false;
  return intersection(tags,filtered).length > 0;
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
    cache_update = ()=>controlpanel_listcache(datatable, true);
    $("<button>Close</button>").click(()=>controlpanel.div.hide()).appendTo(controldiv);
  }
  controlpanel.div.show();
  return controlpanel.div;
}

function controlpanel_listcache($table, update_xhr) {
  $table.find("tr").remove();
  GM_listValues().forEach(function(k){
    var $tr = $("<tr/>", {style: "border-bottom:1px solid black"}).appendTo($table);
    if (k !== "__OPTIONS") {
      $("<td/>", {style: "padding-left:10px"}).appendTo($tr).append($("<a/>", {text: k, href: midtohref(k), style: "color: #00c"}));
      var $controls = $("<td/>", {style: "padding-left:10px"}).appendTo($tr);
      var $name = $("<td/>", {style: "padding-left:10px"}).appendTo($tr);
      var $cache = $("<td/>", {style: "padding-left:10px"}).appendTo($tr);
      var $extra = $("<td/>", {style: "padding-left:10px"}).appendTo($tr);
      function update() {
        var data = load(k);
        $tr.css("background-color", data.f ? "#a00" : (anytagfiltered(data.tags) ? "#aa0" : "#0a0"));
        $name[0].innerHTML = data.title; // jQuery can't handle HTML entity codes
        $cache.text(GM_getValue(k));
      }
      update();
      function xhr_update(){
        xhr_get(k, function(data){
          $extra.text(JSON.stringify(data.manga));
          update();
        });
      }
      if (update_xhr) xhr_update();
      function togglefilter(){
        save(k, "f", !isfiltered(k));
        update();
      }
      $name.click(togglefilter);
      $cache.click(togglefilter);
      $extra.click(togglefilter);
      $controls.append(
        $("<a/>", {text: "Update", href: "javascript:;", style: "color:#000"}).click(xhr_update)
      ).append(
        $("<a/>", {text: "Remove", href: "javascript:;", style: "color:#000;margin-left:5px"}).click(function(){GM_deleteValue(k);$tr.remove()})
      )
    } else {
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
    $tr.click(()=>{filtertag(j,!istagfiltered(j));$tr.css("background-color",istagfiltered(j)?"#aa0":"#0a0")});
    $tr.css("background-color",istagfiltered(j)?"#aa0":"#0a0")
    $tr.appendTo($table);
    i += 1;
  });
}
