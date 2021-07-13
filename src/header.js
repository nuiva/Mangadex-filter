  // ==UserScript==
// @name Mangadex filter
// @namespace Mangadex filter
// @version 21
// @match *://mangadex.org/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_listValues
// @grant        GM_deleteValue
// @grant       GM_addValueChangeListener
// @grant       GM_removeValueChangeListener
// @grant unsafeWindow
// ==/UserScript==

unsafeWindow.MDFDEBUG = [GM_getValue, GM_setValue, GM_deleteValue, GM_listValues];
