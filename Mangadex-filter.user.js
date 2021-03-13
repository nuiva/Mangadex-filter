  // ==UserScript==
// @name Mangadex filter
// @namespace Mangadex filter
// @version 21
// @match *://mangadex.org/*
// @match *://mangadex.cc/*
// @require      https://ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_listValues
// @grant        GM_deleteValue
// @grant       GM_addValueChangeListener
// ==/UserScript==

function sleep(ms) {
  return new Promise(f => setTimeout(f, ms));
}

async function fetch_throttled(url) {
  let t = Date.now();
  if (typeof fetch_throttled.t === "undefined") {
    fetch_throttled.t = t;
  }
  let d = fetch_throttled.t - t;
  fetch_throttled.t += 500;
  if (d > 0) await sleep(d);
  return await fetch(url);
}

class Option {
  static dbKey = "__OPTIONS";
  static defaults = {
    FILTERING_TAG_WEIGHTS: [],
    FILTERED_LANGS: [], // Transforms into a Set()
    FILTERED_REGEX: [],
  };
  static get(optionName) {
    let savedOptions = JSON.parse(GM_getValue(Option.dbKey, null)) || {};
    let value = (optionName in savedOptions) ? savedOptions[optionName] : Option.defaults[optionName];
    if (optionName == "FILTERED_LANGS") {
      return new Set(value);
    }
    // Change stringified Infinity and NaN back to Numbers
    else if (optionName == "FILTERING_TAG_WEIGHTS") {
      for (let weights of value) {
        for (let k in weights) {
          if (typeof weights[k] === "string") {
            weights[k] = Number(weights[k]);
          }
        }
      }
    }
    return value;
  }
  constructor(optionName) {
    this.key = optionName;
    this.load();
  }
  load() {
    this.value = Option.get(this.key);
  }
  save() {
    let options = JSON.parse(GM_getValue(Option.dbKey, null)) || Option.defaults;
    // Infinity and NaN are changed to null by JSON.stringify so we change them to strings
    if (this.key == "FILTERING_TAG_WEIGHTS") {
      for (let weights of this.value) {
        for (let key in weights) {
          if (!Number.isFinite(weights[key])) {
            weights[key] = weights[key].toString();
          }
        }
      }
    }
    if (this.key == "FILTERED_LANGS") {
      options[this.key] = [...this.value];
    } else {
      options[this.key] = this.value;
    }
    let s = JSON.stringify(options);
    GM_setValue(Option.dbKey, s);
    console.log("Saved", Option.dbKey, options);
  }
}

class Manga {
  static updateInterval = 30 * 24 * 60 * 60 * 1000;
  constructor(mid) {
    this.id = mid;
    this.key = this.id;
  }
  load() {
    let data = JSON.parse(GM_getValue(this.key, null)) || {};
    this.filtered = data.f;
    this.tags = new Set(data.t);
    this.lastUpdate = data.u || 0;
    this.demographic = data.e;
    this.title = data.b;
    this.language = data.l;
    this.hentai = data.h;
  }
  save() {
    // NB: Keys "a" and "c" were previously used for read chapters
    let data = {};
    if (this.title) data.b = this.title;
    if (this.lastUpdate) data.u = this.lastUpdate;
    if (this.filtered) data.f = 1;
    if (this.tags && this.tags.size) data.t = [...this.tags].sort();
    if (this.demographic) data.e = this.demographic;
    if (this.language) data.l = this.language;
    if (this.hentai) data.h = 1;
    let s = JSON.stringify(data);
    if (GM_getValue(this.key) == s) return;
    GM_setValue(this.key, s);
    console.log("Saved", this.key, data);
  }
  isFilteredByTag() {
    let tagweights = Option.get("FILTERING_TAG_WEIGHTS");
    for (let w of tagweights) {
      let x = 0;
      for (let tag in w) {
        if (tag == -99) {
          if (this.hentai) x += w[tag];
        } else if (tag < 0) {
          if (this.demographic == -tag) x += w[tag];
        } else if (this.tags.has(Number(tag))) {
          x += w[tag];
        }
      }
      if (x <= -1) return true;
    }
    return false;
  }
  isFilteredByLanguage() {
    let filtered = Option.get("FILTERED_LANGS");
    return filtered.has(this.language);
  }
  isFilteredByRegex() {
    let filtered = Option.get("FILTERED_REGEX");
    for (let filter of filtered) {
      let re = new RegExp(filter);
      if (re.test(this.title)) return true;
    }
    return false;
  }
  filterType() { // Returns 0 for not filtered, 1 for specific filter, 2 for tags, 3 for language, 4 for regex
    if (this.filtered) return 1;
    if (this.isFilteredByTag()) return 2;
    if (this.isFilteredByLanguage()) return 3;
    if (this.isFilteredByRegex()) return 4;
    return 0;
  }
  async update() {
    if (Date.now() - this.lastUpdate > Manga.updateInterval) {
      return await this.fetch();
    }
  }
  async fetch() {
    let response = await fetch_throttled("https://api.mangadex.org/v2/manga/" + this.id);
    if (!response.ok) throw response;
    let json = await response.json();
    this.load();
    let data = json.data;
    let doc = new DOMParser().parseFromString(data.title, "text/html");
    this.title = doc.documentElement.textContent;
    this.tags = new Set(data.tags);
    this.demographic = data.publication.demographic;
    this.lastUpload = data.lastUploaded;
    this.cover = data.mainCover;
    this.lastUpdate = Date.now();
    this.language = data.publication.language;
    this.hentai = data.isHentai;
    this.save();
  }
}

// Corresponds to one manga entry in /updates pages
class MangaUpdateBatch {
  static updateRowToUpdate(updateRow) {
    let datestring = updateRow.children[6].children[0].dateTime.slice(0,-4)
    let date = new Date(datestring);
    let timezonediff = date.getTime() - Date.parse(date.toLocaleString("en-US", {timeZone: "GMT"}));
    let link = updateRow.children[1].children[1];
    let chapterId = Number(link.href.match(/\/chapter\/(\d+)/)[1]);
    return {
      link: link,
      flag: updateRow.children[2].children[0],
      group: updateRow.children[3].children[0].children[0],
      uploader: updateRow.children[4].children[0],
      time: date.getTime() + timezonediff,
      chapterId: chapterId
    };
  }
  constructor(rows) {
    let href = rows[0].children[2].children[0].children[1].href;
    let mid = Number(href.match(/\d+/));
    this.manga = new Manga(mid);
    this.manga.load();
    this.manga.cover = rows[0].children[0].children[0].children[0].children[0].src;
    this.manga.title = rows[0].children[2].children[0].children[1].textContent;
    if (rows[0].querySelector(".badge-danger")) this.manga.hentai = true;
    this.manga.save();
    this.updates = [];
    for (let i = 1; i < rows.length; ++i) {
      this.updates.push(MangaUpdateBatch.updateRowToUpdate(rows[i]));
    }
  }
  extend(that) {
    console.assert(this.manga.id == that.manga.id);
    let chapterMap = {};
    for (let i = 0; i < this.updates.length; ++i) {
      chapterMap[this.updates[i].chapterId] = i;
    }
    for (let u of that.updates) {
      let i = chapterMap[u.chapterId];
      if (i === undefined) {
        this.updates.push(u);
      } else if (u.time > this.updates[i].time) {
        this.updates[i] = u;
      }
    }
    this.updates.sort((a,b) => b.chapterId - a.chapterId);
  }
  hash() {
    let s = this.manga.id;
    if (this.updates.length) {
      s += ":" + this.updates[0].chapterId;
    }
    return s;
  }
  static batchRows(rows) { // Returns an array of MangaUpdateBatches, input is an array or <tr>
    let batches = [];
    for (let i = 0; i < rows.length; ++i) {
      let span = rows[i].children[0].rowSpan;
      if (span > 1) {
        batches.push(new MangaUpdateBatch(rows.slice(i, i+span)));
        i += span - 1;
      }
    }
    return batches;
  }
}

function timestring(time) {
  let td = Date.now() - time;
  let suffix = " sec";
  td /= 1000;
  if (Math.abs(td) > 60) {
    td /= 60;
    suffix = " min";
    if (Math.abs(td) > 60) {
      td /= 60;
      suffix = " hr";
      if (Math.abs(td) > 24) {
        td /= 24;
        suffix = " day";
      }
    }
  }
  td = Math.floor(td);
  return td + suffix + (td > 1 ? "s" : "");
}

class FrontPageMangaUpdate {
  static timeTextUpdateThresholds = [60*1000, 60*60*1000, 24*60*60*1000];
  constructor(mangaUpdateBatch) {
    this.data = mangaUpdateBatch;
    this.constructDiv();
    this.update();
  }
  constructDiv() {
    this.div = document.createElement("div");
    this.div.className = "col-md-6 border-bottom p-2";
    this.div.appendChild(this.constructCover());
    this.div.appendChild(this.constructTitle());
    this.div.appendChild(this.constructFilterButton());
    this.div.appendChild(this.constructChapterLink());
    this.div.appendChild(this.constructGroupLink());
    this.div.appendChild(this.constructTimeText());
    return this.div;
  }
  constructCover() {
    let coverContainer = document.createElement("div");
    coverContainer.className = "hover sm_md_logo rounded float-left mr-2";
    let coverLink = document.createElement("a");
    coverLink.href = "/title/" + this.data.manga.id;
    coverContainer.appendChild(coverLink);
    this.coverImage = document.createElement("img");
    coverLink.appendChild(this.coverImage);
    this.coverImage.className = "rounded max-width";
    return coverContainer;
  }
  constructTitle() {
    let titleContainer = document.createElement("div");
    titleContainer.className = "pt-0 pb-1 mb-1 border-bottom d-flex align-items-center flex-nowrap";
    let bookIcon = document.createElement("span");
    titleContainer.appendChild(bookIcon);
    bookIcon.className = "fas fa-book fa-fw mr-1";
    bookIcon.setAttribute("aria-hidden", true);
    this.titleElement = document.createElement("a");
    titleContainer.appendChild(this.titleElement);
    this.titleElement.className = "manga_title text-truncate";
    this.titleElement.href = "/title/" + this.data.manga.id;
    if (this.data.manga.hentai) {
      let hentaiIcon = document.createElement("span");
      titleContainer.appendChild(hentaiIcon);
      hentaiIcon.className = "badge badge-danger ml-1";
      hentaiIcon.textContent = "H";
    }
    return titleContainer;
  }
  constructFilterButton() {
    this.filterButton = document.createElement("a");
    this.filterButton.textContent = "Filter";
    this.filterButton.style.position = "absolute";
    this.filterButton.style.right = 0;
    this.filterButton.style.bottom = 0;
    this.filterButton.className = "button";
    this.filterButton.onclick = ()=>{
      this.data.manga.load();
      this.data.manga.filtered = true;
      this.data.manga.save();
    }
    return this.filterButton;
  }
  constructChapterLink() {
    let container = document.createElement("div");
    container.className = "py-0 mb-1 row no-gutters align-items-center flex-nowrap";
    let icon = document.createElement("span");
    container.appendChild(icon);
    icon.className = "far fa-file fa-fw col-auto mr-1";
    icon.setAttribute("aria-hidden", "");
    this.chapterLink = document.createElement("a");
    container.appendChild(this.chapterLink);
    this.chapterLink.className = "text-truncate chapter";
    let flagContainer = document.createElement("div");
    container.appendChild(flagContainer);
    flagContainer.className = "ml-1";
    this.chapterFlag = document.createElement("span");
    flagContainer.appendChild(this.chapterFlag);
    return container;
  }
  constructGroupLink() {
    let container = document.createElement("div");
    container.className = "text-truncate py-0 mb-1";
    let icon = document.createElement("span");
    container.appendChild(icon);
    icon.className = "fas fa-users fa-fw";
    icon.setAttribute("aria-hidden", "");
    let spacing = document.createTextNode(" ");
    container.appendChild(spacing);
    this.groupLink = document.createElement("a");
    container.appendChild(this.groupLink);
    return container;
  }
  constructTimeText() {
    let container = document.createElement("div");
    container.className = "text-truncate py-0 mb-1";
    let icon = document.createElement("span");
    container.appendChild(icon);
    icon.className = "far fa-clock fa-fw";
    icon.setAttribute("aria-hidden", "");
    this.timeElement = document.createTextNode("");
    container.appendChild(this.timeElement);
    return container;
  }
  update() {
    this.data.manga.load();
    this.hidden = this.data.manga.filterType();
    if (Date.now() - this.data.manga.lastUpdate > Manga.refreshInterval) this.div.style.backgroundColor = "#f002";
    this.coverImage.src = this.data.manga.cover;
    this.titleElement.title = this.data.manga.title;
    this.titleElement.textContent = this.data.manga.title;
    let u = this.data.updates[0];
    this.chapterLink.href = u.link.href;
    this.chapterLink.textContent = u.link.textContent;
    this.chapterFlag.className = u.flag.className;
    this.chapterFlag.title = u.flag.title;
    this.groupLink.href = u.group.href;
    this.groupLink.textContent = u.group.textContent;
    this.time = u.time;
    this.setTimeTextUpdater();
  }
  updateTime() {
    this.timeElement.textContent = " " + timestring(this.time);
  }
  select(scrollIntoView = true) {
    this.titleElement.focus({preventScroll: true});
    if (scrollIntoView) this.div.scrollIntoView({behavior: "smooth", block: "center", inline: "center"});
  }
  static compare(a, b) {
    if (a.data.updates.length && b.data.updates.length) {
      return a.data.updates[0].time - b.data.updates[0].time;
    }
    return b.data.updates.length - a.data.updates.length || b.data.manga.id - a.data.manga.id;
  }
  static getElementContainer(element) { // Returns the div.col-md-6 that contains the given DOM element, or undefined if it doesn't exist
    while (!element.classList.contains("col-md-6")) {
      element = element.parentNode;
      if (!element) return;
    }
    return element;
  }
  setTimeTextUpdater() {
    let tickerFunc = () => {
      this.updateTime();
      let timeDiff = Date.now() - this.time;
      let updateInterval = 1000; // milliseconds
      for (let threshold of FrontPageMangaUpdate.timeTextUpdateThresholds) {
        if (timeDiff < threshold) break;
        updateInterval = threshold;
      }
      let untilNextUpdate = updateInterval - timeDiff % updateInterval + 500;
      this.timeTextUpdaterId = setTimeout(tickerFunc, untilNextUpdate);
    }
    if (this.timeTextUpdaterId) clearTimeout(this.timeTextUpdaterId);
    if (this.hidden) return;
    tickerFunc();
  }
}

class FrontPageControlDiv {
  constructor(parent) {
    this.time = -Infinity;
    this.parent = parent;
    this.nextFetchedPage = 1;
    // Create DOM elements
    this.div = document.createElement("div");
    this.div.className = "col-md-6 border-bottom p-2";
    let coverContainer = document.createElement("div");
    this.div.appendChild(coverContainer);
    coverContainer.className = "hover sm_md_logo rounded float-left mr-2";
    this.loadingIcon = document.createElement("div");
    coverContainer.appendChild(this.loadingIcon);
    this.loadingIcon.className = "fas fa-circle-notch fa-spin";
    this.loadingIcon.style.fontSize = "xxx-large";
    this.div.appendChild(this.constructRefreshButton());
    this.div.appendChild(document.createElement("br"));
    this.div.appendChild(this.constructLoadMoreButton());
    this.setLoading(false);
  }
  constructRefreshButton() {
    this.lastRefresh = Date.now();
    let refreshButton = document.createElement("button");
    refreshButton.update = () => refreshButton.textContent = "Refreshed " + timestring(this.lastRefresh) + " ago";
    refreshButton.addEventListener("click", () => this.fetchFirstPages());
    this.refreshButton = refreshButton;
    this.setTimeTextUpdater();
    return refreshButton;
  }
  constructLoadMoreButton() {
    let loadMoreButton = document.createElement("button");
    loadMoreButton.update = () => {
      if (this.lastPageFetched) {
        loadMoreButton.textContent = "No more pages to fetch";
      } else {
        loadMoreButton.textContent = "Load page " + this.nextFetchedPage;
      }
    }
    loadMoreButton.update();
    loadMoreButton.addEventListener("click", () => this.addNextUpdatePage());
    this.loadMoreButton = loadMoreButton;
    return loadMoreButton;
  }
  setLoading(val) {
    if (val) {
      this.refreshButton.disabled = true;
      this.loadMoreButton.disabled = true;
      if (this.parent.selection == this) this.activeButton = document.activeElement;
      this.refreshButton.blur(); // Workaround for https://bugzilla.mozilla.org/show_bug.cgi?id=706773
      this.loadMoreButton.blur();
      this.loadingIcon.style.display = "";
    } else {
      this.refreshButton.disabled = false;
      if (!this.lastPageFetched) this.loadMoreButton.disabled = false;
      if (this.parent.selection == this) {
        this.select(false);
        if (this.activeButton) {
          this.activeButton.focus();
          delete this.activeButton;
        }
      }
      this.loadingIcon.style.display = "none";
    }
    this.loadMoreButton.update();
  }
  select(scrollIntoView = true) {
    document.activeElement.blur();
    this.loadMoreButton.focus({preventScroll: true});
    if (scrollIntoView) this.div.scrollIntoView({behavior: "smooth", block: "center", inline: "center"});
  }
  async fetchUpdatePage(page) {
    let html;
    for (let i = 1;; ++i) {
      try {
        let response = await fetch_throttled("/updates/" + page);
        if (!response.ok) throw response;
        html = await response.text();
        break;
      } catch (e) {
        console.log("fetchUpdatePage", e);
        await sleep(i * 5000);
      }
    }
    let template = document.createElement("template");
    template.innerHTML = html;
    let rows = [...template.content.querySelectorAll("tr")];
    return MangaUpdateBatch.batchRows(rows);
  }
  async addNextUpdatePage() {
    this.setLoading(true);
    let updates = await this.fetchUpdatePage(this.nextFetchedPage);
    if (!updates.length) {
      this.lastPageFetched = true;
      this.setLoading(false);
      return;
    }
    this.nextFetchedPage += 1;
    for (let u of updates) {
      for (let i = 1;; ++i) {
        try {
          await u.manga.update();
          this.parent.addMangaUpdate(u);
        } catch (e) {
          if (e.status >= 502 && e.status <= 504) {
            await sleep(i * 1000);
            continue;
          }
          console.log("addNextUpdatePage", e);
        }
        break;
      }
    }
    this.setLoading(false);
    return updates[updates.length - 1].updates[0].time;
  }
  async fetchUntilTime(time) { // Fetches pages until the oldest update is earlier than the time parameter
    while (await this.addNextUpdatePage() >= time);
  }
  async fetchFirstPages() { // Fetches pages until hitting an already seen update
    this.setLoading(true);
    let seen = new Set(); // Used to prevent found mangas rolling to next page and stopping fetches because "old" update is seen
    let seenCount = 0; // Counts how many manga were found in previous calls
    for (let i = 1;; ++i) {
      let updates = await this.fetchUpdatePage(i);
      if (!updates.length) break;
      for (let j = 0; j < updates.length; ++j) {
        await updates[j].manga.update();
        if (!this.parent.addMangaUpdate(updates[j]) && !seen.has(updates[j].hash())) {
          seenCount += 1;
        }
        seen.add(updates[j].hash());
      }
      if (seenCount >= 10) break;
    }
    this.lastRefresh = Date.now();
    this.setTimeTextUpdater();
    this.setLoading(false);
  }
  setTimeTextUpdater() {
    let tickerFunc = () => {
      this.refreshButton.update();
      let timeDiff = Date.now() - this.lastRefresh;
      let updateInterval = 1000; // milliseconds
      for (let threshold of FrontPageMangaUpdate.timeTextUpdateThresholds) {
        if (timeDiff < threshold) break;
        updateInterval = threshold;
      }
      let untilNextUpdate = updateInterval - timeDiff % updateInterval;
      this.timeTextUpdaterId = setTimeout(tickerFunc, untilNextUpdate);
    }
    if (this.timeTextUpdaterId) clearTimeout(this.timeTextUpdaterId);
    tickerFunc();
  }
}

class FrontPageMangaList {
  constructor(container) {
    this.container = container;
    this.mangas = {};
    this.visible = [];
    this.controlDiv = new FrontPageControlDiv(this);
    this.addMangaIfVisible(this.controlDiv);
  }
  // Returns the least index i: a <= i < b such that this.visible[i].time < time, or b if no such index exists.
  binarySearch(time, a = 0, b = this.visible.length) {
    if (a == b) return b;
    let m = Math.floor((a+b)/2);
    if (time > this.visible[m].time) {
      return this.binarySearch(time, a, m);
    }
    return this.binarySearch(time, m+1, b);
  }
  // Returns true if actually added, false if already existed and updated that
  addMangaUpdate(mangaUpdate) {
    let m = this.mangas[mangaUpdate.manga.id];
    if (m) {
      m.data.extend(mangaUpdate);
      m.update();
      if (!m.hidden) {
        let i = this.visible.indexOf(m);
        // Check if manga has changed time position due to added chapter updates.
        if (i > 0 && this.visible[i-1].time < this.visible[i].time || i+1 < this.visible.length && this.visible[i].time < this.visible[i+1].time) {
          this.removeVisibleManga(i);
          this.addMangaIfVisible(m);
        }
      }
      return false;
    }
    m = new FrontPageMangaUpdate(mangaUpdate);
    this.mangas[m.data.manga.id] = m;
    this.addMangaIfVisible(m);
    let update = () => this.onStorageEvent(m.data.manga.id);
    GM_addValueChangeListener(m.data.manga.key, update);
    GM_addValueChangeListener(Option.dbKey, update);
    return true;
  }
  removeVisibleManga(position) {
    let [m] = this.visible.splice(position, 1);
    this.container.removeChild(m.div);
    m.prev.next = m.next;
    m.next.prev = m.prev;
    if (m == this.selection && m.next != m) {
      this.selection = m.next;
      this.selection.select(false);
    }
  }
  addMangaIfVisible(frontPageMangaUpdate) {
    if (frontPageMangaUpdate.hidden) return;
    let i = this.binarySearch(frontPageMangaUpdate.time);
    this.visible.splice(i, 0, frontPageMangaUpdate);
    frontPageMangaUpdate.prev = this.visible[(i-1+this.visible.length) % this.visible.length];
    frontPageMangaUpdate.next = this.visible[(i+1) % this.visible.length];
    frontPageMangaUpdate.prev.next = frontPageMangaUpdate;
    frontPageMangaUpdate.next.prev = frontPageMangaUpdate;
    this.container.insertBefore(frontPageMangaUpdate.div, frontPageMangaUpdate.time > frontPageMangaUpdate.next.time ? frontPageMangaUpdate.next.div : null);
    if (this.visible.length == 1 || this.selection == this.controlDiv && frontPageMangaUpdate.next == this.controlDiv) { // First addition is control div, second is first manga
      this.selection = frontPageMangaUpdate;
      this.selection.select();
    }
  }
  onStorageEvent(mangaId) {
    let m = this.mangas[mangaId];
    if (!m) return;
    let previouslyHidden = m.hidden;
    m.update();
    if (!previouslyHidden && m.hidden) {
      let i = this.visible.indexOf(m);
      this.removeVisibleManga(i);
    } else if (previouslyHidden && !m.hidden) {
      this.addMangaIfVisible(m);
    }
  }
  onFocusEvent(e) {
    let container = FrontPageMangaUpdate.getElementContainer(e.target);
    if (container == this.controlDiv.div) {
      this.selection = this.controlDiv;
      return;
    }
    let a = container.querySelector("a.manga_title");
    let mid = Number(a.href.match(/\d+/));
    let m = this.mangas[mid];
    if (m) this.selection = m;
  }
  onKeyDownEvent(e) {
    if (!this.selection || !this.visible.length) return;
    // Blocks keypresses if active element is searchbar etc
    if (document.activeElement.tagName === "INPUT") return;
    if (e.key == "ArrowRight" || e.key == "d") {
      this.selection = this.selection.next;
    } else if (e.key == "ArrowLeft" || e.key == "a") {
      this.selection = this.selection.prev;
    } else if (e.key == "ArrowDown" || e.key == "s") {
      let x = this.selection.div.offsetLeft;
      this.selection = this.selection.next;
      while (this.selection.div.offsetLeft != x) this.selection = this.selection.next;
    } else if (e.key == "ArrowUp" || e.key == "w") {
      let x = this.selection.div.offsetLeft;
      this.selection = this.selection.prev;
      while (this.selection.div.offsetLeft != x) this.selection = this.selection.prev;
    } else if (e.key == "Home") {
      this.selection = this.visible[0];
    } else if (e.key == "End") {
      this.selection = this.visible[this.visible.length-1];
    } else if (e.key == "f") {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (FrontPageMangaUpdate.getElementContainer(document.activeElement) !== this.selection.div) return;
      if (this.selection.filterButton) {
        this.selection.filterButton.click();
      }
    } else if (e.key == "c") {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (FrontPageMangaUpdate.getElementContainer(document.activeElement) !== this.selection.div) return;
      if (!this.selection.data) return;
      navigator.clipboard.writeText(this.selection.data.manga.title).then(()=>{
        return "#0f0";
      }, ()=>{
        return "#f00";
      }).then(color=>{
        requestAnimationFrame(()=>{
          this.selection.titleElement.style.color = color;
          this.selection.titleElement.style.transition = "color 0s ease";
          requestAnimationFrame(()=>{
            this.selection.titleElement.style.color = "";
            this.selection.titleElement.style.transitionDuration = "1s";
          })
        })
      });
    } else {
      return;
    }
    this.selection.select();
    e.stopPropagation();
    e.preventDefault();
  }
}

function main_manga() {
  let mid = Number(location.pathname.match(/\d+/));
  let manga = new Manga(mid);
  manga.load();
  // Get title and tags again
  {
    manga.title = document.querySelector("span.mx-1").textContent;
    if (document.querySelector("h6 .badge-danger")) manga.hentai = true;
    let tag_els = document.querySelectorAll("a.badge");
    let re_tag = /\/genre\/(\d+)/;
    let re_demo = /\/search\?demo_id=(\d+)/;
    manga.tags.clear();
    for (let el of tag_els) {
      let m = el.href.match(re_tag);
      if (m) {
        let tag = Number(m[1]);
        manga.tags.add(tag);
      }
    }
    for (let el of document.querySelectorAll("a.genre")) {
      let m = el.href.match(re_demo);
      if (m) {
        manga.demographic = Number(m[1]);
      }
    }
    let flag = document.querySelector(".flag");
    if (flag) {
      let lang = flag.className.match(/flag-(\w+)/)[1];
      manga.language = lang;
    }
    manga.save();
  }
  // Add filter button etc
  let header = document.querySelector("h6.card-header");
  let text = document.createElement("a");
  text.style.marginLeft = "30px";
  header.appendChild(text);
  header.setAttribute("orig-color", header.style.backgroundColor)
  header.style.backgroundImage = "none";
  let filterButton = document.createElement("a");
  filterButton.style.marginLeft = "30px";
  filterButton.className = "button";
  header.appendChild(filterButton);
  for (let ch of document.querySelectorAll(".chapter-row .col-lg-5 a")) {
    ch.classList.add("chapter");
  }
  function redraw() {
    manga.load();
    filterButton.textContent = manga.filtered ? "Unfilter" : "Filter";
    let ft = manga.filterType();
    if (ft >= 2) {
      if (ft == 2) {
        text.textContent = "Filtered by tags.";
      } else if (ft == 3) {
        text.textContent = "Filtered by language.";
      } else {
        text.textContent = "Filtered by regex.";
      }
      header.style.backgroundColor = "rgba(255,255,25,0.5)";
    } else if (ft == 1) {
      text.textContent = "";
      header.style.backgroundColor = "rgba(255,0,0,0.5)";
    } else {
      text.textContent = "";
      header.style.backgroundColor = header.getAttribute("orig-color");
    }
  }
  redraw();
  GM_addValueChangeListener(manga.key, redraw);
  GM_addValueChangeListener(Option.dbKey, redraw);
  function toggleFilter() {
    manga.load();
    manga.filtered = !manga.filtered;
    filterButton.textContent = manga.filtered ? "Unfilter" : "Filter";
    manga.save();
  }
  filterButton.addEventListener("click", toggleFilter);
  let selection;
  let chapters = [...document.querySelectorAll(".chapter-row .col-lg-5 a")];
  function select(chapter) {
    selection = chapter;
    selection.focus({preventScroll:true});
  }
  function changePage(offset) {
    let pageButtons = document.querySelectorAll(".page-item");
    for (let i = 0; i < pageButtons.length; ++i) {
      if (pageButtons[i].classList.contains("active")) {
        pageButtons[i+offset].querySelector("a").click();
        return;
      }
    }
  }
  addEventListener("keydown", function(e){
    if (!selection && e.key != "f") return;
    // Blocks keypresses if active element is searchbar etc
    if (document.activeElement.tagName === "INPUT") return;
    let i = chapters.indexOf(selection);
    if (e.key == "ArrowDown" || e.key == "s") {
      select(chapters[(i+1)%chapters.length]);
      selection.scrollIntoView({behavior:"smooth",block:"center",inline:"center"});
    } else if (e.key == "ArrowUp" || e.key == "w") {
      select(chapters[(i-1+chapters.length)%chapters.length]);
      selection.scrollIntoView({behavior:"smooth",block:"center",inline:"center"});
    } else if (e.key == "ArrowLeft" || e.key == "a") {
      changePage(-1);
    } else if (e.key == "ArrowRight" || e.key == "d") {
      changePage(1);
    } else if (e.key == "f") {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      toggleFilter();
      filterButton.scrollIntoView({behavior:"smooth",block:"center"});
    } else if (e.key == "Home") {
      if (selection == chapters[0] && document.scrollingElement.scrollTop != 0) return;
      select(chapters[0]);
      selection.scrollIntoView({behavior:"smooth",block:"center",inline:"center"});
    } else if (e.key == "End") {
      select(chapters[chapters.length-1]);
      selection.scrollIntoView({behavior:"smooth",block:"center",inline:"center"});
    } else if (e.key == "M") {
      location.pathname = "/";
    } else if (e.key == "c") {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      let title = document.querySelector("h6 .mx-1");
      navigator.clipboard.writeText(title.textContent).then(()=>{
        return "#0f0";
      }, ()=>{
        return "#f00";
      }).then(color=>{
        requestAnimationFrame(()=>{
          title.style.color = color;
          title.style.transition = "color 0s ease";
          requestAnimationFrame(()=>{
            title.style.color = "";
            title.style.transitionDuration = "1s";
          })
        })
      });
    } else {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
  });
  if (chapters.length) select(chapters[0]);
}

async function main_frontpage() {
  document.querySelector(".navbar").appendChild((new Dashboard).createToggleButton("MDFilter"));
  // Add chapter class for all chapter links so they get :visited color
  for (let a of document.querySelectorAll("a")) {
    if (a.href.match(/\/chapter\/\d+/)) {
      a.classList.add("chapter");
    }
  }
  // Color top manga in sidebar
  {
    for (let li of document.querySelectorAll(".list-group-item")) {
      let title = li.querySelector("a.manga_title");
      if (!title) continue;
      let mid = Number(title.href.match(/\d+/));
      let manga = new Manga(mid);
      let color = () => {
        manga.load();
        let ft = manga.filterType();
        if (ft >= 2) {
          li.style.backgroundColor = "#ff03";
        } else if (ft == 1) {
          li.style.backgroundColor = "#f003";
        } else {
          li.style.backgroundColor = "";
        }
      }
      color();
      GM_addValueChangeListener(manga.key, color);
      GM_addValueChangeListener(Option.dbKey, color);
    }
  }
  let container = document.querySelector(".m-0");
  container.innerHTML = "";
  let mangalist = new FrontPageMangaList(container);
  addEventListener("keydown", e => mangalist.onKeyDownEvent(e));
  let lastVisit = Math.min(Date.now() - 2 * 24 * 60 * 60 * 1000, GM_getValue("LAST_VISIT", 0));
  GM_setValue("LAST_VISIT", Date.now());
  document.querySelector(".row.m-0").addEventListener("focusin", e => mangalist.onFocusEvent(e));
  // Initial and periodic fetches of update pages
  {
    await mangalist.controlDiv.fetchUntilTime(lastVisit);
    setInterval(() => {
      if (Date.now() - mangalist.controlDiv.lastRefresh > 5 * 60 * 1000) {
        mangalist.controlDiv.fetchFirstPages();
      }
    }, 60 * 1000);
  }
}

function main_chapter() {
  // Check for "Error while loading a resource. The server may be busy at the moment."
  {
    let errorObserver = new MutationObserver(function(){
      if (reader.model._chapter) return; // Chapter already loaded successfully
      let messageEl = document.querySelector(".message");
      if (messageEl && messageEl.textContent == "Error while loading a resource. The server may be busy at the moment.") {
        errorObserver.disconnect(); // Prevents infinite loop
        let refreshAt = Date.now() + 60 * 1000;
        let timerEl = document.createElement("div");
        timerEl.className = "message";
        messageEl.parentNode.appendChild(timerEl);
        function update() {
          let remaining = refreshAt - Date.now();
          timerEl.textContent = `Refreshing in ${Math.round(remaining/1000)} seconds.`;
          if (remaining > 0) {
            setTimeout(update, 500);
          } else {
            location.reload();
          }
        }
        update();
      }
    });
    errorObserver.observe(document.querySelector(".reader-images"), {childList:true, subtree:true});
  }
  // Periodically checks pages that failed to load and retries one every 10 secs
  setInterval(function(){
    // Mostly copied from MD reader source at 2021-03-08 to reduce risk of update bugs
    let notch = document.querySelector(".failed");
    if (!notch) return;
    let page = parseInt(notch.dataset.page);
    if (!page) {
      console.log("Could not find page for error notch.", notch);
      return;
    }
    reader.model.getPageWithoutLoading(page).reload(!0);
  }, 10000)
  // Makes the default reader to add /chapter/id to history in addition to /chapter/id/1, so that chapters gray out properly
  {
    let pushState = history.pushState;
    unsafeWindow.history.pushState = function(data, title, url) {
      if (data.page == 1) {
        pushState.apply(history, [data, title, "/chapter/" + data.chapter]);
      }
      pushState.apply(history, [data, title, url]);
    }
    document.body.addEventListener("keydown", function(e){
      // Blocks keypresses if active element is searchbar etc
      if (document.activeElement.tagName === "INPUT") return;
      if (e.key == "Home") {
        document.querySelector(".notch").click();
      } else if (e.key == "End") {
        document.querySelector(".notch:last-child").click();
      }
    });
  }
}

function main_updates() {
  // Add chapter class for all chapter links so they get :visited color
  for (let a of document.querySelectorAll("a")) {
    if (a.href.match(/\/chapter\/\d+/)) {
      a.classList.add("chapter");
    }
  }
  // Color rows
  {
    let rows = document.querySelectorAll("tr");
    for (let i = 0; i < rows.length; ++i) {
      let span = rows[i].children[0].rowSpan;
      if (span > 1) {
        let mid = Number(rows[i].querySelector(".manga_title").href.match(/\d+/));
        let manga = new Manga(mid);
        let color = () => {
          manga.load();
          let ft = manga.filterType();
          if (ft >= 2) {
            for (let j = i; j < i+span; ++j) {
              rows[j].style.backgroundColor = "#ff02";
            }
          } else if (ft == 1) {
            for (let j = i; j < i+span; ++j) {
              rows[j].style.backgroundColor = "#f002";
            }
          } else {
            for (let j = i; j < i+span; ++j) {
              rows[j].style.backgroundColor = "";
            }
          }
        }
        color();
        GM_addValueChangeListener(manga.key, color);
        GM_addValueChangeListener(Option.dbKey, color);
        i += span - 1;
      }
    }
  }
  // Add keyboard controls
  let mangaLinks = [...document.querySelectorAll("a.manga_title")];
  let selection;
  let page = Number(location.pathname.match(/\d+/)) || 1;
  function select(el) {
    selection = el;
    selection.focus({preventScroll:true});
    selection.scrollIntoView({behavior: "smooth", block: "center", inline: "center"});
  }
  addEventListener("keydown", function(e){
    if (!selection) return;
    // Blocks keypresses if active element is searchbar etc
    if (document.activeElement.tagName === "INPUT") return;
    let i = mangaLinks.indexOf(selection);
    if (e.key == "ArrowRight") {
      if (document.activeElement == selection) location.pathname = "/updates/" + (page+1);
    } else if (e.key == "ArrowLeft") {
      if (document.activeElement == selection && page > 1) location.pathname = "/updates/" + (page-1);
    } else if (e.key == "ArrowDown") {
      select(mangaLinks[(i+1)%mangaLinks.length]);
    } else if (e.key == "ArrowUp") {
      select(mangaLinks[(i-1+mangaLinks.length)%mangaLinks.length]);
    } else {
      return;
    }
    e.stopPropagation();
    e.preventDefault();
  });
  select(mangaLinks[0]);
}


function addCSS() {
  let style = document.createElement("style");
  style.type = "text/css";
  style.innerHTML = `
    a.button {
      user-select: none;
    }
    a.button:hover {
      cursor: pointer;
      text-decoration: underline !important;
      filter: brightness(150%);
    }
    .chapter:visited {
      color: gray;
    }
    /*button:focus {
      background-color: #8f8;
    }*/
    @keyframes flashRedColor {
      from {
        color: #f00;
      }
      to {
        color: inherit;
      }
    }
    @keyframes flashGreenColor {
      from {
        color: #0f0;
      }
      to {
        color: inherit;
      }
    }
  `;
  if (window.location.pathname === "/") {
    style.innerHTML += `
      .col-lg-8 .chapter:link {
        color: #5f5;
      }
    `;
  }
  document.head.appendChild(style);
}

function checkResponseErrors() {
  function addRefreshTimer() {
    let refreshAt = Date.now() + 60 * 1000;
    let timerEl = document.createElement("div");
    timerEl.style.textAlign = "center";
    document.body.appendChild(timerEl);
    function update() {
      let remaining = refreshAt - Date.now();
      timerEl.textContent = `Refreshing in ${Math.round(remaining/1000)} seconds.`;
      if (remaining > 0) {
        setTimeout(update, 200);
      } else {
        location.reload();
      }
    }
    update();
  }
  let h1 = document.querySelector("h1");
  let bEl = document.querySelector("b");
  if (h1 && ["502 Bad Gateway","504 Gateway Time-out"].includes(h1.textContent) ||
     bEl && ["502 - Bad Gateway .","504 - Gateway Timeout ."].includes(bEl.textContent)) {
    addRefreshTimer();
    return true;
  }
  return false;
}

async function updateDatabase(oldDbVersion) {
  const newDbVersion = 21;
  oldDbVersion = oldDbVersion || GM_getValue("VERSION");
  if (oldDbVersion != newDbVersion) {
    console.log(`Updating from dbVersion ${oldDbVersion} to ${newDbVersion}.`);
    let origBody = document.body;
    let html = origBody.parentNode;
    let tempBody = document.createElement("body");
    html.removeChild(origBody);
    html.appendChild(tempBody);
    function createText(s) {
      let div = document.createElement("div");
      div.textContent = s;
      tempBody.appendChild(div);
      div.scrollIntoView();
    }
    createText(`Updating from dbVersion ${oldDbVersion} to ${newDbVersion}.`);
    // Update FILTERED_LANGS
    if (oldDbVersion < 21) {
      createText("Updating language filters...");
      let allLangs = new Set();
      for (let k of GM_listValues()) {
        let mid = Number(k);
        if (!isFinite(mid)) continue;
        let m = new Manga(mid);
        m.load();
        if (m.language) allLangs.add(m.language);
      }
      let filteredLangs = new Option("FILTERED_LANGS");
      let langMap = {
        "Chinese (Trad)": "cn",
        "Chinese (Simp)": "cn",
        "Korean": "kr"
      }
      let newFilters = new Set();
      for (let lang of filteredLangs.value) {
        if (allLangs.has(lang)) {
          newFilters.add(lang);
        } else if (langMap[lang]) {
          newFilters.add(langMap[lang]);
        }
      }
      filteredLangs.value = newFilters;
      filteredLangs.save();
    }
    GM_setValue("VERSION", newDbVersion);
    createText("Update successful. Returning to Mangadex...");
    await sleep(3000);
    html.removeChild(tempBody);
    html.appendChild(origBody);
  }
  GM_addValueChangeListener("VERSION", close); // Closes current tab if another tab updates db to avoid corruption
}

async function main() {
  await updateDatabase();
  if (checkResponseErrors()) return;
  if (window.location.pathname === "/" && location.search == "") {
    main_frontpage();
  } else if (window.location.pathname.match("^/(?:manga|title)/")) {
    main_manga();
  } else if (window.location.pathname.match("^/updates")) {
    main_updates();
  } else if (location.pathname.match("^/chapter/")) {
    main_chapter();
  }
  addCSS();
}
main();

// Namespace for exposed functions
MangadexFilter = {
  cache_get: function(filter) {
    var v = GM_listValues().filter(k=>k.match(filter));
    return v;
  },
  cache_clear: function(filter){
    var v = MangadexFilter.cache_get(filter);
    if (confirm("Specific entries shown in log.\nClear cache?")) {
      v.forEach(GM_deleteValue);
    }
  },
  cache_update: function(filter) {
    let v = MangadexFilter.cache_get(filter);
    for (let i = 0, j = v.length; i < j; ++i) {
      xhr_get(v[i], ()=>{}, false, 500);
    }
  },
  debug: {
    GM_getValue: GM_getValue,
    GM_setValue: GM_setValue,
    GM_listValues: GM_listValues,
    GM_deleteValue: GM_deleteValue,
    updateDatabase: updateDatabase
  },
  dashboard_cache_remove: function(elem,mid){
    let tr = elem.parentNode.parentNode;
    GM_deleteValue(mid);
    tr.parentNode.removeChild(tr);
  }
};

class Dashboard {
  createToggleButton(buttonText) {
    let button = document.createElement("button");
    button.textContent = buttonText;
    button.addEventListener("click", () => this.toggle());
    return button;
  }
  init() {
    // Create body
    {
      function addElement(type, parent) {
        return parent.appendChild(document.createElement(type));
      }
      this.body = document.createElement("body");
      this.body.id = "mdfbody";
      this.body.style.backgroundColor = "#fff";
      this.body.style.padding = 0;
      // Create header bar
      {
        this.header = addElement("div", this.body);
        this.header.style.borderBottom = "2px solid black";
        this.header.style.height = "30px";
        // Create tag tab button
        {
          let button = addElement("button", this.header);
          button.textContent = "Tags";
          button.onclick = () => this.showTagTab();
        }
        // Create language tab button
        {
          let button = addElement("button", this.header);
          button.textContent = "Languages";
          button.onclick = () => this.showLanguageTab();
        }
        this.header.appendChild(this.createToggleButton("Close"));
      }
      this.content = addElement("div", this.body);
      this.content.style.display = "block";
      this.content.style.top = "30px";
      this.content.style.padding = "5px";
    }
    // Add CSS to head
    {
      let style = document.createElement("style");
      style.type = "text/css";
      style.innerHTML = `
        #mdfbody {
          padding: 0;
          color: #000;
        }
        #mdfbody, #mdfbody table {
          background-color: #fff;
        }
        .mdf-tag-table td {
          width: 75px;
          height: 20px;
          border: 1px solid black;
        }
        .mdf-tag-table td.mdf-tag-name {
          width: 200px;
          border-left: none;
        }
        .mdf-tag-table td.mdf-tag-id {
          width: 25px;
          color: #aaa;
          border-right: none;
        }
        .mdf-tag-table button {
          width: 100%;
        }
        .mdf-tag-table input {
          border: none;
          width: 75px;
          height: 20px;
          background-color: #0000;
        }
        .mdf-tag-table .red {
          background-color: #f005;
        }
        .mdf-tag-table .green {
          background-color: #0f05;
        }
        .mdf-lang-table td, .mdf-lang-table th {
          text-align: center;
          padding: 0 5px 0 5px;
          border: 1px solid black;
        }
        .mdf-lang-table td.mdf-flag-td {
          width: 30px;
          text-align: center;
          background-color: #ccc;
        }
      `;
      document.head.appendChild(style);
    }
  }
  toggle() {
    if (!this.body) this.init();
    [document.body, this.body] = [this.body, document.body];
  }
  async showTagTab() {
    this.content.innerHTML = "Loading tags...";
    let tagList = await this.getTagList();
    this.content.innerHTML = "";
    let tagFilters = new Option("FILTERING_TAG_WEIGHTS");
    function addElement(type, parent) {
      return parent.appendChild(document.createElement(type));
    }
    let table = addElement("table", this.content);
    table.className = "mdf-tag-table";
    let tr = addElement("tr", table);
    // Create add rule button
    {
      let td = addElement("td", tr);
      td.colSpan = "2";
      let addRuleButton = addElement("button", td);
      addRuleButton.onclick = () => {
        tagFilters.value.push({});
        tagFilters.save();
        this.showTagTab();
      }
      addRuleButton.textContent = "Add rule";
    }
    // Create remove rule buttons
    for (let i = 0; i < tagFilters.value.length; ++i) {
      let removeRuleButton = addElement("button", addElement("td", tr));
      removeRuleButton.textContent = "Remove";
      removeRuleButton.onclick = () => {
        tagFilters.value.splice(i,1);
        tagFilters.save();
        this.showTagTab();
      }
    }
    for (let tag of tagList) {
      tr = addElement("tr", table);
      let tagId = addElement("td", tr);
      tagId.textContent = tag.id;
      tagId.className = "mdf-tag-id";
      let tagName = addElement("td", tr);
      tagName.textContent = tag.name;
      tagName.className = "mdf-tag-name";
      for (let rule of tagFilters.value) {
        let td = addElement("td", tr);
        let input = addElement("input", td);
        input.type = "text";
        input.value = rule[tag.id] || "";
        function restyle() {
          td.className = "";
          if (rule[tag.id] < 0) td.className = "red";
          else if (rule[tag.id] > 0) td.className = "green";
        }
        restyle();
        input.onchange = function() {
          if (!input.value) {
            delete rule[tag.id];
          } else {
            rule[tag.id] = Number(input.value);
          }
          tagFilters.save();
          restyle();
        }
      }
    }
  }
  showLanguageTab() {
    // Find all languages in database
    let allLangs = new Set();
    for (let k of GM_listValues()) {
      let mid = Number(k);
      if (!isFinite(mid)) continue;
      let m = new Manga(mid);
      m.load();
      if (m.language) allLangs.add(m.language);
    }
    // Create DOM
    this.content.innerHTML = "";
    function addElement(type, parent) {
      return parent.appendChild(document.createElement(type));
    }
    let table = addElement("table", this.content);
    table.className = "mdf-lang-table";
    let tr = addElement("tr", table);
    addElement("th", tr).textContent = "Language";
    addElement("th", tr).textContent = "Flag";
    addElement("th", tr).textContent = "Filtered";
    let filteredLangs = new Option("FILTERED_LANGS");
    for (let lang of allLangs) {
      tr = addElement("tr", table);
      addElement("td", tr).textContent = lang;
      let td = addElement("td", tr);
      td.className = "mdf-flag-td";
      addElement("span", td).className = "rounded flag flag-" + lang;
      let checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = filteredLangs.value.has(lang);
      checkbox.onchange = () => {
        if (checkbox.checked) {
          filteredLangs.value.add(lang);
        } else {
          filteredLangs.value.delete(lang);
        }
        filteredLangs.save();
      };
      addElement("td", tr).appendChild(checkbox);
    }
  }
  async getTagList() {
    if (this.taglist) return this.taglist;
    this.taglist = [
      {id: -99, name: "Hentai"},
      {id: -4, name: "Josei"},
      {id: -3, name: "Seinen"},
      {id: -2, name: "Shoujo"},
      {id: -1, name: "Shounen"}
    ];
    let response = await fetch_throttled("https://api.mangadex.org/v2/tag");
    let json = await response.json();
    let tags = json.data;
    for (let key in tags) {
      this.taglist.push(tags[key]);
    }
    return this.taglist;
  }
}

