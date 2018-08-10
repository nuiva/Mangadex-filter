// ==UserScript==
// @name Mangadex filter
// @namespace Mangadex filter
// @version 1
// @match *://mangadex.org/
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
  get_filterifyaoi(title, $a.attr("href"), $this);
  filterbutton(title, $this, $this, "position:absolute;right:0;bottom:0");
}

function main_manga() {
  var $h = $("h6.card-header");
  var title = textcontent($h).trim();
  var $a = $("<a/>", {style: "margin-left:30px"});
  function style(){
    $h.css("background-color", isfiltered(title) ? "#a00": "");
    $h.css("background-image", isfiltered(title) ? "none": "");
    $a.text(isfiltered(title) ? "Unfilter" : "Filter");
  }
  style();
  $a.click(()=>{isfiltered(title) ? unfilter(title) : filter(title);style()});
  $a.appendTo($h);
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
      get_filterifyaoi(title, v[0].find("a.manga_title").attr("href"), $v);
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

function get_filterifyaoi(title, url, $hide) {
  if (load(title, "yaoicheck")) return;
  throttled_get(url, function(html){
    save(title, "yaoicheck", true);
    $(html).find("a.genre").each(function(){
      if ($(this).text() == "Yaoi") {
        filter(title);
        $hide.hide();
        return;
      }
    });
  });
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
function clearidentifier(i) {
  GM_listValues().forEach(function(k){
    if (k.match('^.' + i)) {
      GM_deleteValue(k);
      console.log("Deleted: " + k);
    }
  });
}
// List all cache data to console, usable from webconsole for debug
cache_list = function(filter) {
  if (!filter) {
    console.log(GM_listValues());
  } else {
    console.log(GM_listValues().filter((k)=>k.match(filter)));
  }
}
cache_clear = function(){
  if (confirm("Clear cache?")) {
    clearall();
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
    } catch {
      data = false;
    }
  }
  if (typeof data !== "object") {
    data = {d: time()};
  }
  data[key] = val;
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
    return JSON.parse(data)[key];
  }
  return false;
}
function isfiltered(title){
  return load(title, "f");
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
        isfiltered(best_match) ? unfilter(best_match) : filter(best_match);
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
