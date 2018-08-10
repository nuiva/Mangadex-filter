// ==UserScript==
// @name Mangadex filter
// @namespace Mangadex filter
// @version 3
// @match *://mangadex.org/
// @match *://mangadex.org/search
// @match *://mangadex.org/updates*
// @match *://mangadex.org/manga/*
// @require      https://ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js
// @require      https://raw.githubusercontent.com/hiddentao/fast-levenshtein/master/levenshtein.js
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
  //$("div.tab-pane li").each(frontpage_processmanga);
}
function frontpage_processmanga() {
  var $this = $(this);
  var $a = $this.find("a.manga_title");
  var title = $a.attr("title");
  if (isfiltered(title)) {
    $this.hide();
    return;
  }
  xhr_tagfilter(title, $a.attr("href"), $this);
  filterbutton(title, $this, $this, "position:absolute;right:0;bottom:0");
}

function main_manga() {
  var $h = $("h6.card-header");
  var title = textcontent($h).trim();
  if (gettags(title)) {
    $("<a/>", {text: "Filtered by tags.", style: "background-color:#a00;margin-left:30px"}).appendTo($h);
  }
  var $a = $("<a/>", {style: "margin-left:30px"});
  function style(){
    $h.css("background-color", isfiltered(title) ? "#a00": "");
    $h.css("background-image", isfiltered(title) ? "none": "");
    $a.text(isfiltered(title) ? "Unfilter" : "Filter");
  }
  style();
  $a.click(()=>{save(title, "f", !isfiltered(title));style()});
  $a.appendTo($h);
}

function main_search() {
  $("div.custom-control.custom-checkbox").each(function(){
    var $this = $(this);
    var option = "FILTER_TAG_" + $this.find("span.badge.badge-secondary").text();
    var $a = $("<a/>", {style: "position:absolute;right:0"});
    $a.text(getoption(option) ? "Unfilter" : "Filter");
    $a.css("color", getoption(option) ? "#a00" : "#0a0");
    $a.click(function(){
      setoption(option, !getoption(option));
      $a.css("color", getoption(option) ? "#a00" : "#0a0");
      $a.text(getoption(option) ? "Unfilter" : "Filter");
    });
    $a.appendTo($this);
  });
}

function main_updates() {
  var $table = $("table.table.table-striped.table-sm tr");
  var title = "";
  var singleseries = [];
  var first = 1;
  function filterarray(title, v) {
    if (!v.length) return;
    var $v = $(v.map((e)=>e[0]));
    if (isfiltered(title)) {
      $v.hide();
    } else {
      xhr_tagfilter(title, v[0].find("a.manga_title").attr("href"), $v);
      filterbutton(title, $v, v[0].find("td:nth-child(3)"), "position:absolute;right:0");
    }
  }
  $table.each(function(){
    var $this = $(this);
    var $a = $this.find("a.manga_title");
    if ($a.text()) {
      filterarray(title, singleseries);
      singleseries = [];
      title = $a.attr("title");
    }
    if (first) {
      first = 0;
    } else {
      singleseries.push($this);
    }
  });
  filterarray(title, singleseries);
}

function filterbutton(s,$hide,$target,style) {
  var $a = $("<a/>", {text: "Filter", style: style});
  $a.click(function(){
    $hide.hide();
    filter(s);
  });
  $a.appendTo($target);
  return $a;
}

// Returns filter status: true or false
function gettags(title, html) {
  save(title, "tagschecked", time());
  loadtags(title).forEach((k)=>save(title,k,false));
  var f = false;
  function checktags(){
    var tag = $(this).text();
    save(title, "TAG_" + tag, true);
    if (load("__OPTIONS", "FILTER_TAG_" + tag)) {
      f = true;
    }
  }
  if (typeof html === "undefined") {
    $("a.genre").each(checktags);
  } else {
    $(html).find("a.genre").each(checktags);
  }
  return f;
}

function xhr_tagfilter(title, url, $hide) {
  if (load(title, "tagschecked")) {
    loadtags(title).forEach((k)=>{if (getoption("FILTER_"+k)) $hide.hide()});
  } else {
    throttled_get(url, function(html){
      if (gettags(title, html)) {
        $hide.hide();
      }
    });
  }
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
function throttled_get_delay() {
  if (typeof throttled_get_delay.lastgettime === "undefined") {
    throttled_get_delay.lastgettime = 0;
  }
  throttled_get_delay.lastgettime += 1100;
  var now = new Date().getTime();
  var delay = throttled_get_delay.lastgettime - now;
  if (delay < 0) {
    delay = 0;
    throttled_get_delay.lastgettime = now;
  }
  return delay;
}
function throttled_get(url, callback) {
  setTimeout(()=>$.get(url, callback), throttled_get_delay());
}
function save(title, key, val){
  var data = GM_getValue(title, false);
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
  console.log("Stored: " + title + " -> " + s);
  GM_setValue(title, s);
}
function filter(title) {
  save(title, "f", true);
}
function load(title, key) {
  var data = GM_getValue(title, false);
  if (data) {
    if (typeof key === "undefined") {
      return JSON.parse(data);
    }
    return JSON.parse(data)[key];
  }
  return false;
}
function loadtags(title) {
  return Object.keys(load(title)).filter((k)=>(k.substring(0,4)==="TAG_"));
}
function isfiltered(title){
  return load(title, "f");
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

function filter_query(s,$controldiv){
  if (!s || isfiltered(s)) return;
  throttled_get("/quick_search/" + s, function(html){
    var best_match = "";
    var best_distance = -1;
    var re = new RegExp("manga_title[^\"]*\">([^<]*)", "g");
    var match;
    while ((match = re.exec(html))) {
      var title = match[1];
      var distance = Levenshtein.get(s, title);
      if (best_distance < 0 || distance < best_distance) {
        best_match = title;
        best_distance = distance;
      }
    }
    if (isfiltered(best_match)) return;
    if (best_distance == 0) {
      filter(s);
      return;
    }
    var $p = $("<p/>", {text: s, style: "color:#000;border:1px solid black;margin:0"});
    $p.css("background-color","#a00");
    if (best_distance > 0) {
      $p.append("<br>" + best_match);
      $p.css("background-color", "#aa0");
      $p.click(function(){
        save(best_match, "f", !isfiltered(best_match));
        $p.css("background-color", isfiltered(best_match) ? "#0a0" : "#aa0");
      });
    }
    $p.appendTo($controldiv);
  });
}
filter_list = function(s){
  var $controldiv = $("<div/>", {style: "position:fixed;top:0;left:0;width:100%;height:100%;z-index:10000;background-color:#fff;overflow:scroll"});
  $controldiv.appendTo($("body"));
  var strings = s.split(/\r?\n/);
  var delay = 0;
  strings.forEach(function(s){
    filter_query(s, $controldiv);
  });
}
