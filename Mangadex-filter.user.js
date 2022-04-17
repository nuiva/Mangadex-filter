  // ==UserScript==
// @name Mangadex filter
// @namespace Mangadex filter
// @version 25
// @match *://mangadex.org/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_listValues
// @grant        GM_deleteValue
// @grant       GM_addValueChangeListener
// @grant       GM_removeValueChangeListener
// @grant unsafeWindow
// @icon        data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAFUElEQVRYw81Xa1BVVRT+9j6Hc+65cLmgApdHg11AEhCLCz2shPKFmDpgjtU02kxTOo05TlZmjo01pmPlTI790MZ85A8zJjXwNRY1Y2aJg0CjBDGogHJBecZ9nHvOuWf3gyBe13ugnGn923u9vrX2WnuvTWCQ7A6H1eTTFmqMzKKUZkJniQxsQh+XdBCCRhD2G/PTMlUiJ65VVPQYsUuCCaRkPTqV+HzrCfRlADEZQkuIlzF2BCZu+x8VFbXjAuBwOMwuxf8hYWQ1Y4zHOIgQohHGdvWmpWy8WVzsNQwgNTs7lXr9R3WwtNH4M+wJWDQlFnYzjxe+vQjNrwfDUg6NFNbVVbYEBfDAtCwH09kZgE0avG+VTNiYOw1zBBdM7m4ouYVQYxKRvXK9sWyAtPhD+AX1VZeqBu/T4ZEPd04JwftzHbiQa8MiVz1EjsK99lP4Zi9DZVW14eNgYHFUU0+kpj4UNyqAvLyXTJD9Xw92nhw1AeeKsrDM0wDO1Q1mtsDz6gfQJ9pAXD04/MPPYysKhngSghKHw2EeAaDtTtVWMJbZv56ZkoBjOZGY1NYwoO8rWA7d2oePa65H1c22MRcmY8zhUbChf831px5+drAf0Ax7AvYkU/Cu7n8URQne598AKNeneP0K0ogXXRrQ1PXnWGE4Eu+L3+90Ol0UAIhPW9/fanHWMOyZagLnHmrUn5gK8CEAAL6mHOL5UszsrMXeODd+WpKFgnT7GLKAUI9Xew8AyObNH0eXnj52w+XySADw47M5iG2tH6GkOp6CnL8c5q92gGu4MtIq5XBxQgpeKb0Exe83ckd4mOqxkX37DuwsKMhfc+rMWYTUVuDFrtErW7clgrh7QHq772rYaUvB/JIqyIoaPBM8fY7GxcXOkyQJSwoXo6hwcUBh2toY1DkAxHi78Oa6tcbOQtOfptHR0QkD66RpYJYI/BvSHnwCBfPzIYpiUFkOmE6joqKkgZ0QAb68onE7ZyYzfLlF4HkeGelpQeV1QuxUFIUht6Hy+EL4708fy4uD6zEp+Eay41B4BhpudwIAnlkw30g7hFNChj0HlMKzYgP8ccbaigkm3FA4xGfPgGZPx9Wa3wEA8+bMQmrqlGCzgEqampo1qzWcG8FUZJhKv0BI+XcAY4EBWCIhL3oZ6vQnR/Bamm7inXXvovZWY6DsNZCKy5d7k5OSwu5W/cIvp8HXV4N2tgK6DiZK0OPtUDMeg5ozG0yURtUVKptx61INFhzYGuguuMB3tHfcSE5KyghYKLZEyIWr/g5XBxQFTBDhcrshe2WYFA2uzlZQjoKjHHieR0SEta8jJk8EX2cO3NqM/kqdbbdPGi84CogmEEJgCQuD1RoOl8sNQRBgliRwPAdKCWRZBmMMeqQZJUpT4OPT/WW87HHtVBTlbUEQiFEcfl1HT0/fzBkbaxt5basqCCG4fecODh8pDlSAvTExEecIAHxfVladk52dafA5xeDOaW/vgKqqfdETClEUIEkSOjo6sfK1NWhxOkcHwOgntTWX3+IBoLmpZfX0TOWcIAhGHhEAQHd3D2RZRmRkJERxpN7uz/cGdg4omiVk55CZcP+Xh05aLeEFRjIwHMzw46msrMLR4yVDZIdZ2VR3tXoLAAyM243XGhYfKT5+XgcewT0kQkhFqMhtH3Uq3pafN3lVPDsoEETdC+cK0P5Zm7hiU+nZ6wHHcrZqbgaY7/V7E764i+w+e8XQz4gtXSpgkjP0P3HcHusmxcXKaKzAX67Iawy6ZTkItoAhbHwRwwtKP4LNtm3cn1O2riARve6HxwXAElpOdpxqxP+Z/gI6tgfLZjV0agAAAABJRU5ErkJggg==
// ==/UserScript==
(function () {
    'use strict';

    function sleep(ms) {
        return new Promise(f => setTimeout(f, ms));
    }
    function createStyle(css) {
        let style = document.createElement("style");
        style.innerHTML = css;
        return style;
    }
    // Decorator
    function initializeCustomElement(parentTagName, tagName) {
        return function (cls) {
            customElements.define(tagName ?? cls.name.replaceAll(/([A-Z])/g, "-$1").replace(/^-/, "").toLowerCase(), cls, parentTagName && { extends: parentTagName });
        };
    }

    function getUserOptionRequestString() {
        let s = "";
        let userOptionString = localStorage.getItem("md");
        if (!userOptionString) {
            console.log("No user options to load.");
            return s;
        }
        let userOptions = JSON.parse(userOptionString);
        for (let lang of userOptions.userPreferences.originLanguages) {
            s += "originalLanguage[]=" + lang + "&";
        }
        for (let lang of userOptions.userPreferences.filteredLanguages) {
            s += "translatedLanguage[]=" + lang + "&";
        }
        return s;
    }
    async function fetchRecentChapters(offset = 0) {
        let response = await fetch(`https://api.mangadex.org/chapter?order[publishAt]=desc&limit=100&includes[]=manga&${getUserOptionRequestString()}includeFutureUpdates=0&offset=${offset}`);
        let json = await response.json();
        let returnValue = [];
        for (let entry of json.data) {
            let manga;
            for (let rel of entry.relationships) {
                if (rel.type == "manga") {
                    manga = rel;
                    break;
                }
            }
            returnValue.push({
                chapter: entry,
                manga: manga
            });
        }
        return returnValue;
    }
    const throttleTime = 200;
    let requestPromise = new Promise(f => f(undefined));
    function fetchThrottled(url) {
        let fetchPromise = requestPromise.then(() => fetch(url));
        let throttlePromise = sleep(throttleTime);
        requestPromise = fetchPromise.then(() => throttlePromise);
        return fetchPromise;
    }
    async function fetchCovers(...mangaIdArray) {
        let mangaIdToCover = new Map();
        while (mangaIdArray.length) {
            let currentRequestMangas = [];
            while (currentRequestMangas.length < 100 && mangaIdArray.length) {
                currentRequestMangas.push(mangaIdArray.pop());
            }
            let offset = 0;
            let total = 0;
            do {
                let request = `https://api.mangadex.org/cover?limit=100&offset=${offset}`;
                for (let mangaId of currentRequestMangas) {
                    request += `&manga[]=${mangaId}`;
                }
                let response = await fetchThrottled(request);
                let json = await response.json();
                for (let entry of json.data) {
                    console.assert(entry.relationships[0].type == "manga");
                    mangaIdToCover.set(entry.relationships[0].id, entry.attributes.fileName);
                }
                total = json.total;
                offset += json.limit;
            } while (offset < total);
        }
        return mangaIdToCover;
    }

    // Synchronised data IO to shared memory, i.e., localStorage or GM_*
    class Callbackable {
        constructor() {
            this.callbacks = [];
        }
        addChangeListener(callback) {
            if (!(callback instanceof Function))
                debugger;
            this.callbacks.push(callback);
        }
        removeChangeListener(callback) {
            let i = this.callbacks.indexOf(callback);
            if (i === -1)
                return false;
            this.callbacks.splice(i, 1);
            return true;
        }
        onChange(oldValue, newValue, remote) {
            for (let callback of this.callbacks) {
                callback(oldValue, newValue, remote);
            }
        }
        destroy() {
            delete this.callbacks;
        }
    }
    class Settable extends Callbackable {
    }
    class Variable extends Settable {
        constructor(value) {
            super();
            this.value = value;
        }
        get() {
            return this.value;
        }
        set(value) {
            if (value === this.value)
                return;
            this._set_remote(value, false);
        }
        _set_remote(value, remote) {
            let oldValue = this.value;
            this.value = value;
            this.onChange(oldValue, value, remote);
        }
    }
    class Wrapper extends Settable {
        constructor(variable) {
            super();
            this.variable = variable;
            variable.addChangeListener(this.onVariableChanged.bind(this));
        }
        destroy() {
            //this.variable.removeChangeListener(this.onVariableChanged);
            super.destroy();
            this.variable.destroy();
        }
    }
    class BoolWrapper extends Wrapper {
        set(value) {
            this.variable.set(value ? 1 : undefined);
            return this.get();
        }
        get() {
            return !!this.variable.get();
        }
        toggle() {
            return this.set(!this.get());
        }
        onVariableChanged(oldValue, newValue, remote) {
            this.onChange(!!oldValue, !!newValue, remote);
        }
    }
    class ArrayWrapper extends Wrapper {
        get() {
            return this.variable.get() || [];
        }
        set(value) {
            // Check if arrays are equal
            if (value.length === this.length) {
                let i = 0;
                for (let current = this.variable.get(); i < value.length && value[i] === current[i]; ++i)
                    ;
                if (i === value.length)
                    return;
            }
            if (value.length === 0) {
                this.variable.set(undefined);
            }
            else {
                this.variable.set(value);
            }
        }
        get length() {
            return this.variable.get()?.length ?? 0;
        }
        push(...values) {
            this.set([...this.get(), ...values]);
        }
        remove(value) {
            let arr = [...this.get()];
            let i = arr.indexOf(value);
            if (i === -1)
                return false;
            arr.splice(i, 1);
            this.set(arr);
            return true;
        }
        pop(index) {
            index ??= this.length - 1;
            let newValue = [...this.get()];
            let deleted = newValue.splice(index, 1);
            this.set(newValue);
            return deleted[0];
        }
        onVariableChanged(oldValue, newValue, remote) {
            super.onChange(oldValue || [], newValue || [], remote);
        }
        [Symbol.iterator]() {
            return this.get()[Symbol.iterator]();
        }
    }
    class JsonSetWrapper extends Wrapper {
        constructor(variable) {
            super(variable);
            // Wraps a variable such that it's stored as an array but has Set API
            // Useful for sets stored in JSON.
            this.value = new Set();
            this.value = new Set(variable.get() || []);
        }
        get() {
            return this.value;
        }
        set(value) {
            this.variable.set([...value]);
        }
        has(value) {
            return this.value.has(value);
        }
        add(value) {
            if (this.has(value))
                return false;
            this.variable.push(value);
            return true;
        }
        pop(value) {
            if (this.has(value)) {
                if (!this.variable.remove(value))
                    throw Error("Wrapper desync");
                return true;
            }
            return false;
        }
        toggle(value) {
            if (this.has(value)) {
                this.pop(value);
                return false;
            }
            this.add(value);
            return true;
        }
        onVariableChanged(oldValue, newValue, remote) {
            let removed = this.value;
            this.value = new Set(newValue);
            let added = new Set();
            for (let addedValue of newValue) {
                if (!removed.delete(addedValue)) {
                    added.add(addedValue);
                }
            }
            super.onChange(removed, added, remote);
        }
        [Symbol.iterator]() {
            return this.value[Symbol.iterator]();
        }
    }
    class WebStorageField extends Variable {
        constructor(storage, optionName) {
            super(JSON.parse(storage.getItem(optionName)));
            this.optionName = optionName;
            this.storage = storage;
            this.eventListener = e => this.onOptionChange(e, true);
            window.addEventListener("storage", this.eventListener);
            if (!WebStorageField.localChangeListeners.has(storage)) {
                WebStorageField.localChangeListeners.set(storage, new Set());
            }
            WebStorageField.localChangeListeners.get(storage).add(this);
        }
        set(value) {
            if (value === undefined) {
                this.storage.removeItem(this.optionName);
            }
            else {
                this.storage.setItem(this.optionName, JSON.stringify(value));
            }
            let e = document.createEvent("StorageEvent");
            // @ts-ignore
            e.initStorageEvent("storage", false, false, this.optionName, JSON.stringify(oldValue), JSON.stringify(value), location.href, this.storage);
            for (let listener of WebStorageField.localChangeListeners.get(this.storage)) {
                listener.onOptionChange(e, false);
            }
        }
        onOptionChange(storageEvent, remote) {
            if (storageEvent.key === null) {
                return super._set_remote(null, remote);
            }
            if (storageEvent.key == this.optionName) {
                return super._set_remote(JSON.parse(storageEvent.newValue), remote);
            }
        }
        destroy() {
            window.removeEventListener("storage", this.eventListener);
            WebStorageField.localChangeListeners.get(this.storage).delete(this);
            super.destroy();
        }
    }
    WebStorageField.localChangeListeners = new Map();
    class GMOption extends Variable {
        constructor(optionName) {
            // @ts-expect-error
            super(GM_getValue(optionName));
            this.optionName = optionName;
            // @ts-expect-error
            this.GMlistenerId = GM_addValueChangeListener(this.optionName, (key, oldValue, newValue, remote) => super.set(newValue, remote));
        }
        set(value) {
            console.log("GM_set", this.optionName, value);
            // This only sets the GMStorage value, which sends a change event, which changes the local value in the event listener
            if (value === undefined) {
                // @ts-expect-error
                return GM_deleteValue(this.optionName);
            }
            // @ts-expect-error
            return GM_setValue(this.optionName, value);
        }
        destroy() {
            // @ts-expect-error
            GM_removeValueChangeListener(this.GMlistenerId);
            super.destroy();
        }
    }
    class ObjectField extends Variable {
        constructor(option, key) {
            super(option.get()?.[key]);
            this.option = option;
            this.key = key;
            this.onOptionChange = (oldValue, newValue, remote) => {
                let newEntry = newValue?.[this.key];
                if (this.get() === newEntry)
                    return;
                super._set_remote(newEntry, remote);
            };
            this.option.addChangeListener(this.onOptionChange);
        }
        set(value) {
            if (value === this.value)
                return;
            let newObj = { ...this.option.get() };
            if (value === undefined) {
                delete newObj[this.key];
            }
            else {
                newObj[this.key] = value;
            }
            this.option.set(newObj);
        }
        destroy() {
            this.option.removeChangeListener(this.onOptionChange);
            super.destroy();
        }
    }
    class ArrayField extends Variable {
        constructor(option, index) {
            super(option.get()[index]);
            this.option = option;
            this.index = index;
            this.onOptionChanged = (oldValue, newValue, remote) => {
                let newEntry = newValue[this.index];
                if (newEntry === this.value)
                    return;
                super._set_remote(newEntry, remote);
            };
            this.option.addChangeListener(this.onOptionChanged);
        }
        set(value) {
            if (value === this.value)
                return;
            let newArr = [...this.option.get()];
            newArr[this.index] = value;
            this.option.set(newArr);
        }
        destroy() {
            this.option.removeChangeListener(this.onOptionChanged);
            super.destroy();
        }
    }
    class SetIndicator extends Variable {
        constructor(variable, key) {
            super(variable.has(key.get()));
            this.variable = variable;
            this.key = key;
            this.onVariableChanged = () => {
                super.set(this.variable.has(this.key.get()));
            };
            this.variable.addChangeListener(this.onVariableChanged);
            this.key.addChangeListener(this.onVariableChanged);
        }
        toggle() {
            return this.variable.toggle(this.key.get());
        }
    }
    /*
          static MatchingRegexSet = class extends SynchronizedValue.Callbackable {
            constructor(regexSetOption, matchString) {
              this.matchString = matchString;
              this.option = regexSetOption;
              this.option.addChangeListener(this.onOptionChange.bind(this));
              this.matchingRegex = new Set();
              for (let regex of this.option.regexIterator()) {
                if (this.matchString.match(regex)) {
                  this.matchingRegex.add(regex);
                }
              }
            }
            get() {
              return this.matcingRegex.size && this.matchingRegex;
            }
            onOptionChange(added, deleted, remote) {
              let addedSubset = new Set();
              let deletedSubset = new Set();
              for (let element of deleted) {
                if (this.matchingRegex.delete(element)) {
                  deletedSubset.add(element);
                }
              }
              for (let element of added) {
                if (this.matchString.match(this.option.constructor.regexParse(element))) {
                  this.matches.add(element);
                  addedSubset.add(element);
                }
              }
              if (addedSubset.size || deletedSubset.size) this.onChange(addedSubset, deletedSubset, remote);
            }
          }
          static Not = class extends SynchronizedValue.Callbackable {
            constructor(option) {
              super();
              this.option = option;
              option.addChangeListener(this.onOptionChange.bind(this));
            }
            get() {
              return !this.option.get();
            }
            onOptionChange(oldValue, newValue, remote) {
              if (!oldValue === !newValue) return;
              this.onChange(!oldValue, !newValue, remote);
            }
          }
          static Any = class extends SynchronizedValue.Callbackable {
            constructor(...options) {
              super();
              this.options = options;
              this.enabled = new Set();
              for (let option of options) {
                if (option.get()) this.enabled.add(option);
                option.addChangeListener(this.onOptionChange.bind(this,option));
              }
            }
            get() {
              return !!this.enabled.size;
            }
            onOptionChange(option, oldValue, newValue, remote) {
              console.log(this, arguments);
              let a = this.enabled.has(option);
              if (a == !!newValue) return;
              oldValue = this.get();
              if (a) {
                this.enabled.delete(option);
              } else {
                this.enabled.add(option);
              }
              newValue = this.get();
              if (oldValue != newValue) this.onChange(oldValue, newValue, remote);
            }
          }
          static All = class extends this.Any {
            get() {
              return this.options.length == this.enabled.size;
            }
          }
          static Includes = class extends SynchronizedValue.Callbackable {
            constructor(option, value) {
              super();
              this.option = option;
              this.value = value;
            }
            get() {
              return this.option.get()?.includes(this.value);
            }
            onOptionChange(oldValue, newValue, remote) {
              oldValue = oldValue.includes(this.value);
              newValue = newValue.includes(this.value);
              if (oldValue !== newValue) this.onChange(oldValue, newValue, remote);
            }
          }
        }
        static Wrapper = class {
          static Bool = BoolOption => class extends BoolOption {
            toggle() {
              super.set(!super.get() && 1 || undefined);
            }
          }
          static Set = ArrayOption => class extends ArrayOption {
            constructor() {
              super(...arguments);
              this.value = new Set(super.get() || []);
            }
            get() {
              return this.value.size && this.value;
            }
            has(element) {
              return this.value.has(element);
            }
            add(element) {
              if (this.value.has(element)) return;
              this.value.add(element);
              super.set(Array.from(this.value));
            }
            delete(element) {
              if (!this.value.delete(element)) return;
              super.set(this.value.size && Array.from(this.value) || undefined);
            }
            toggle(element) {
              if (this.value.has(element)) {
                this.delete(element);
              } else {
                this.add(element);
              }
            }
            [Symbol.iterator]() {
              return this.value[Symbol.iterator]();
            }
            onChange(oldValue, newValue, remote) {
              this.value = new Set(newValue);
              if (!oldValue) return super.onChange(new Set(newValue), new Set(), remote);
              if (!newValue) return super.onChange(new Set(), new Set(oldValue), remote);
              let added = new Set();
              let deleted = new Set();
              for (let element of newValue) added.add(element);
              for (let element of oldValue) {
                if (!added.delete(element)) {
                  deleted.add(element);
                }
              }
              super.onChange(added, deleted, remote);
            }
          }
          static RegexSet = ArrayOption => class extends this.Set(ArrayOption) {
            *regexIterator() {
              for (let regexString of super[Symbol.Iterator]()) {
                yield this.constructor.regexParse(regexString);
              }
            }
            static regexParse(regexString) {
              let match = regexString.match("^/(.*)/([a-z]*)$");
              if (!match) return null;
              return new RegExp(match[1], match[2]);
            }
          }
        }
      }
    */

    let options = new GMOption("__OPTIONS");
    let FILTERED_LANGS = new JsonSetWrapper(new ArrayWrapper(new ObjectField(options, "FILTERED_LANGS")));
    let FILTERING_TAG_WEIGHTS = new ArrayWrapper(new ObjectField(options, "FILTERING_TAG_WEIGHTS"));

    var __decorate$5 = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    var FilterButton_1, LanguageFilterButton_1;
    let FilterButton = FilterButton_1 = class FilterButton extends HTMLButtonElement {
        constructor(filterOption) {
            super();
            this.filterOption = filterOption;
            this.addEventListener("click", filterOption.toggle.bind(filterOption));
            filterOption.addChangeListener(this.onOptionChanged.bind(this));
            this.classList.add(FilterButton_1.typeName);
            this.onOptionChanged();
        }
        onOptionChanged() {
            if (this.filterOption.get()) {
                this.textContent = "Unfilter";
                this.style.backgroundColor = "#0f0";
            }
            else {
                this.textContent = "Filter";
                this.style.backgroundColor = "#f00";
            }
        }
    };
    FilterButton.typeName = "filter-button";
    FilterButton = FilterButton_1 = __decorate$5([
        initializeCustomElement("button")
    ], FilterButton);
    document.head.appendChild(createStyle(`
    .${FilterButton.typeName} {
        padding: 5px;
        border-radius: 10px;
        height: 20px;
        text-align: center;
        vertical-align: middle;
        line-height: 12px;
    }
`));
    let LanguageFilterButton = LanguageFilterButton_1 = class LanguageFilterButton extends FilterButton {
        constructor(language) {
            super(new SetIndicator(FILTERED_LANGS, language));
            this.classList.add(LanguageFilterButton_1.typeName);
        }
        onOptionChanged() {
            if (this.filterOption.get()) {
                this.textContent = "Unfilter language";
                this.style.backgroundColor = "#0f0";
            }
            else {
                this.textContent = "Filter language";
                this.style.backgroundColor = "#f00";
            }
        }
    };
    LanguageFilterButton.typeName = "language-filter-button";
    LanguageFilterButton = LanguageFilterButton_1 = __decorate$5([
        initializeCustomElement("button")
    ], LanguageFilterButton);

    var __decorate$4 = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    let ImageTooltip = class ImageTooltip extends HTMLImageElement {
        constructor(targetClass) {
            super();
            this.targetClass = targetClass;
            this.currentTarget = null;
            this.onMouseover = (e) => {
                if (!(e.target instanceof HTMLImageElement) || !e.target.classList.contains(this.targetClass))
                    return;
                this.currentTarget = e.target;
                this.src = e.target.src;
            };
            this.onMouseout = (e) => {
                if (e.target !== this.currentTarget)
                    return;
                this.currentTarget = null;
                this.hidden = true;
            };
            this.onLoad = () => {
                if (this.currentTarget === null)
                    return; // Image loaded after mouseout
                this.hidden = false;
                let coords = this.currentTarget.getBoundingClientRect();
                this.style.top = Math.min(coords.top, window.innerHeight - this.height) + "px";
                this.style.left = coords.right + 5 + "px";
            };
            this.style.position = "fixed";
            this.style.zIndex = "999999";
            this.addEventListener("load", this.onLoad);
        }
        connectedCallback() {
            this.parentNode.addEventListener("mouseover", this.onMouseover);
            this.parentNode.addEventListener("mouseout", this.onMouseout);
            this.hidden = true;
        }
        disconnectedCallback() {
            this.parentNode.removeEventListener("mouseover", this.onMouseover);
            this.parentNode.removeEventListener("mouseout", this.onMouseout);
        }
    };
    ImageTooltip = __decorate$4([
        initializeCustomElement("img")
    ], ImageTooltip);

    class TagFilteredBool extends BoolWrapper {
        constructor(tags, demographic, rating) {
            super(new Variable(false));
            this.tags = tags;
            this.demographic = demographic;
            this.rating = rating;
            this.onWeightChanged = () => {
                for (let rule of FILTERING_TAG_WEIGHTS) {
                    let w = 0;
                    for (let tag of this.tags) {
                        w += Number(rule[tag] ?? 0);
                    }
                    w += Number(rule[this.demographic.get()] ?? 0);
                    w += Number(rule["rating:" + this.rating.get()] ?? 0);
                    if (w <= -1) {
                        return super.set(true);
                    }
                }
                return super.set(false);
            };
            FILTERING_TAG_WEIGHTS.addChangeListener(this.onWeightChanged);
            this.tags.addChangeListener(this.onWeightChanged);
            this.demographic.addChangeListener(this.onWeightChanged);
            this.rating.addChangeListener(this.onWeightChanged);
            this.onWeightChanged();
        }
        destroy() {
            FILTERING_TAG_WEIGHTS.removeChangeListener(this.onWeightChanged);
            this.tags.removeChangeListener(this.onWeightChanged);
            this.demographic.removeChangeListener(this.onWeightChanged);
            this.rating.removeChangeListener(this.onWeightChanged);
            super.destroy();
        }
    }
    class FilterStatus extends Variable {
        constructor(filtered, tags, language, demographic, rating) {
            super(0);
            this.onVariableChange = () => {
                if (this.filtered.get()) {
                    return this.set(1);
                }
                if (this.tagFiltered.get()) {
                    return this.set(2);
                }
                if (this.langFiltered.get()) {
                    return this.set(3);
                }
                this.set(0);
            };
            this.filtered = filtered;
            this.tagFiltered = new TagFilteredBool(tags, demographic, rating);
            this.filtered.addChangeListener(this.onVariableChange);
            this.tagFiltered.addChangeListener(this.onVariableChange);
            this.langFiltered = new SetIndicator(FILTERED_LANGS, language);
            this.langFiltered.addChangeListener(this.onVariableChange);
            this.onVariableChange();
        }
        destroy() {
            this.filtered.removeChangeListener(this.onVariableChange);
            this.tagFiltered.destroy();
            super.destroy();
        }
    }
    class FilterIndicator extends HTMLDivElement {
        constructor(filterStatus, filterTexts = FilterIndicator.filterTexts) {
            super();
            this.filterStatus = filterStatus;
            this.filterTexts = filterTexts;
            this.classList.add("filter-indicator");
            this.filterStatus.addChangeListener(() => this.update());
            this.update();
        }
        update() {
            this.textContent = this.filterTexts.get(this.filterStatus.get()) ?? "";
        }
    }
    FilterIndicator.filterTexts = new Map([
        [0, "Not filtered"],
        [1, "Filtered"],
        [2, "Filtered by tags"],
        [3, "Filtered by language"]
    ]);
    customElements.define("filter-indicator", FilterIndicator, { extends: "div" });
    class Manga {
        constructor(id) {
            this.id = id;
            this.variable = new GMOption(String(id));
            this.title = new ObjectField(this.variable, "b");
            this.filtered = new BoolWrapper(new ObjectField(this.variable, "f"));
            this.tags = new JsonSetWrapper(new ArrayWrapper(new ObjectField(this.variable, "t")));
            this.lastUpdate = new ObjectField(this.variable, "u");
            this.demographic = new ObjectField(this.variable, "e");
            this.language = new ObjectField(this.variable, "l");
            //this.hentai = new BoolWrapper(new ObjectField(this.variable, "h"));
            this.rating = new ObjectField(this.variable, "r");
            this.filterStatus = new FilterStatus(this.filtered, this.tags, this.language, this.demographic, this.rating);
            this.cover = new ObjectField(this.variable, "c");
        }
        updateFrom(json) {
            console.assert(this.id === json.id);
            if (json.attributes) {
                this.title.set(Object.values(json.attributes.title)[0]);
                let tags = new Set();
                for (let tag of json.attributes.tags) {
                    tags.add(tag.attributes.name.en);
                }
                this.tags.set(tags);
                this.lastUpdate.set(Date.now());
                this.demographic.set(json.attributes.publicationDemographic);
                this.language.set(json.attributes.originalLanguage);
            }
        }
        destroy() {
            this.filterStatus.destroy();
            this.rating.destroy();
            this.cover.destroy();
            this.language.destroy();
            this.demographic.destroy();
            this.lastUpdate.destroy();
            this.tags.destroy();
            this.filtered.destroy();
            this.title.destroy();
            this.variable.destroy();
        }
    }
    Manga.updateInterval = 30 * 24 * 60 * 60 * 1000;

    function getStyleContainer(context) {
        let container = context.getRootNode();
        if (container instanceof Document) {
            return container.head;
        }
        return container;
    }
    function addStyle(context, styleText) {
        let style = document.createElement("style");
        style.innerHTML = styleText;
        getStyleContainer(context).appendChild(style);
        return style;
    }

    var __decorate$3 = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    var TimeText_1;
    let TimeText = TimeText_1 = class TimeText extends HTMLTimeElement {
        constructor(timestamp) {
            super();
            this.timestamp = timestamp;
            this.timeoutID = null;
            this.onTimeout = () => {
                let diff = this.timestamp - Date.now();
                let sign = Math.sign(diff);
                diff = Math.abs(diff);
                let i = 0;
                while (i < TimeText_1.thresholds.length && TimeText_1.thresholds[i][0] < diff)
                    ++i;
                i = Math.max(0, i - 1);
                let multiplier = Math.floor(diff / TimeText_1.thresholds[i][0]);
                this.textContent = multiplier + TimeText_1.thresholds[i][1] + (sign == -1 ? " ago" : "");
                let untilNext = sign === 1 ?
                    diff - multiplier * TimeText_1.thresholds[i][0] + 1 :
                    (multiplier + 1) * TimeText_1.thresholds[i][0] - diff;
                this.timeoutID = setTimeout(this.onTimeout, untilNext);
            };
            this.classList.add("time-text");
            this.title = new Date(timestamp).toISOString();
        }
        connectedCallback() {
            this.onTimeout();
        }
        disconnectedCallback() {
            clearTimeout(this.timeoutID);
        }
    };
    TimeText.thresholds = [
        [1, "ms"],
        [1000, "s"],
        [1000 * 60, "min"],
        [1000 * 60 * 60, "h"],
        [1000 * 60 * 60 * 24, "d"]
    ];
    TimeText = TimeText_1 = __decorate$3([
        initializeCustomElement("time")
    ], TimeText);

    var __decorate$2 = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    var MangaCover_1;
    let MangaCover = MangaCover_1 = class MangaCover extends HTMLImageElement {
        constructor(mangaId, srcOption) {
            super();
            this.mangaId = mangaId;
            this.srcOption = srcOption;
            this.setCover = () => {
                if (!this.srcOption.get())
                    return;
                if (this.srcOption.get() == this.src)
                    return;
                MangaCover_1.fetchDelayPromise = MangaCover_1.fetchDelayPromise.then(async () => {
                    this.src = `https://uploads.mangadex.org/covers/${this.mangaId}/${this.srcOption.get()}.256.jpg`;
                    await sleep(200);
                });
            };
            this.classList.add("hover-tooltip");
        }
        connectedCallback() {
            this.setCover();
            this.srcOption.addChangeListener(this.setCover);
        }
        disconnectedCallback() {
            this.srcOption.removeChangeListener(this.setCover);
        }
    };
    MangaCover.fetchDelayPromise = new Promise(f => f());
    MangaCover = MangaCover_1 = __decorate$2([
        initializeCustomElement("img")
    ], MangaCover);
    let ChapterRow = class ChapterRow extends HTMLDivElement {
        constructor(chapter) {
            super();
            this.chapter = chapter;
            let chapterLink = document.createElement("a");
            chapterLink.href = `/chapter/${chapter.id}`;
            chapterLink.textContent = `v${chapter.attributes.volume ?? "_"}c${chapter.attributes.chapter ?? "_"} - ${chapter.attributes.title ?? "NO TITLE"}`;
            this.timestamp = new Date(chapter.attributes.publishAt).getTime();
            this.append(new TimeText(this.timestamp), chapterLink);
        }
    };
    ChapterRow = __decorate$2([
        initializeCustomElement("div")
    ], ChapterRow);
    let MangaRow = class MangaRow extends HTMLTableRowElement {
        constructor(manga) {
            super();
            this.manga = manga;
            this.coverFetched = false;
            this.chapters = new Set();
            this.timestamp = 0; // Used for ordering rows, currently gets max publishTime from chapters
            this.onFilterUpdate = () => {
                if (this.manga.filterStatus.get()) {
                    this.classList.add("filtered-manga");
                }
                else {
                    this.classList.remove("filtered-manga");
                    this.loadCover();
                }
            };
            // Create cover
            this.cover = new MangaCover(manga.id, manga.cover);
            this.addTd();
            // Create title
            {
                let title = document.createElement("a");
                title.textContent = manga.title.get();
                title.href = `/title/${manga.id}`;
                this.addTd(title, new FilterButton(manga.filtered), new FilterIndicator(manga.filterStatus));
            }
            // Create chapter container
            this.chapterContainer = this.addTd();
            manga.filterStatus.addChangeListener(this.onFilterUpdate);
            this.onFilterUpdate();
        }
        addChapter(chapter) {
            if (this.chapters.has(chapter.id))
                return;
            this.chapters.add(chapter.id);
            let newRow = new ChapterRow(chapter);
            let i = 0;
            let rows = this.chapterContainer.children;
            while (i < rows.length && rows[i].timestamp > newRow.timestamp)
                ++i;
            this.chapterContainer.insertBefore(newRow, rows[i] ?? null);
            this.timestamp = Math.max(this.timestamp, newRow.timestamp);
        }
        addTd(...content) {
            let td = document.createElement("td");
            for (let element of content) {
                td.appendChild(element);
            }
            return this.appendChild(td);
        }
        setCover(filename) {
            this.manga.cover.set(filename);
            this.coverFetched = true;
        }
        loadCover() {
            if (this.cover.isConnected)
                return;
            this.firstElementChild.appendChild(this.cover);
        }
    };
    MangaRow = __decorate$2([
        initializeCustomElement("tr")
    ], MangaRow);
    let ChapterTable = class ChapterTable extends HTMLTableElement {
        constructor() {
            super();
            this.mangaCache = new Map();
            this.offset = 0;
            this.chapters = new Set();
            this.classList.add("chapter-table");
        }
        addChapter(chapter, manga) {
            if (this.chapters.has(chapter.id))
                return false;
            this.chapters.add(chapter.id);
            if (!this.mangaCache.has(manga.id)) {
                let manga_ = new Manga(manga.id);
                manga_.updateFrom(manga);
                let mangaRow = new MangaRow(manga_);
                this.mangaCache.set(manga.id, mangaRow);
                this.appendChild(mangaRow);
            }
            let mangaRow = this.mangaCache.get(manga.id);
            mangaRow.addChapter(chapter);
            if (mangaRow.timestamp > mangaRow.previousSibling?.timestamp ||
                mangaRow.timestamp < mangaRow.nextSibling?.timestamp) {
                let i = 0;
                while (i < this.rows.length && (this.rows[i].timestamp > mangaRow.timestamp || this.rows[i] === mangaRow))
                    ++i;
                this.insertBefore(mangaRow, this.rows[i] ?? null);
            }
            return true;
        }
        async fetchNew() {
            let chapters = [];
            for (let offset = 0, oldChaptersFound = 0; oldChaptersFound < 50; offset += 100) {
                for (let entry of await fetchRecentChapters(offset)) {
                    if (this.mangaCache.get(entry.manga.id)?.chapters?.has?.(entry.chapter.id)) {
                        oldChaptersFound += 1;
                    }
                    chapters.push(entry);
                }
            }
            for (let { chapter, manga } of chapters) {
                this.addChapter(chapter, manga);
            }
            await this.fetchCovers();
        }
        async fetchMore() {
            let oldOffset = this.offset;
            this.offset += 100;
            let chapters = await fetchRecentChapters(oldOffset);
            let added = [];
            for (let { chapter, manga } of chapters) {
                if (this.addChapter(chapter, manga)) {
                    added.push({ chapter, manga });
                }
            }
            await this.fetchCovers();
            return added;
        }
        async fetchMoreVisible() {
            for (let i = 0; i < 20; ++i) {
                if ((await this.fetchMore()).length > 0) {
                    return true;
                }
            }
            return false;
        }
        async fetchMoreUntilFullTable() {
            let scrollEl = this.parentElement.parentElement;
            while (scrollEl.offsetHeight && scrollEl.offsetHeight == scrollEl.scrollHeight) {
                if (!await this.fetchMoreVisible()) {
                    return false;
                }
            }
            return true;
        }
        async fetchCovers() {
            let mangasToFetchSet = new Set();
            for (let mangaRow of this.rows) {
                if (mangaRow.coverFetched == true)
                    continue;
                mangasToFetchSet.add(mangaRow.manga.id);
            }
            let coverMap = await fetchCovers(...mangasToFetchSet);
            for (let mangaRow of this.rows) {
                if (coverMap.has(mangaRow.manga.id)) {
                    mangaRow.setCover(coverMap.get(mangaRow.manga.id));
                }
            }
        }
        loadCovers() {
            for (let mangaRow of this.rows) {
                mangaRow.loadCover();
            }
        }
    };
    ChapterTable = __decorate$2([
        initializeCustomElement("table")
    ], ChapterTable);
    let ChapterTableContainer = class ChapterTableContainer extends HTMLDivElement {
        constructor() {
            super();
            this.fetchMorePromise = new Promise(f => f(null));
            this.fillTable = () => {
                this.fetchMorePromise = this.fetchMorePromise.then(() => this.table.fetchMoreUntilFullTable());
            };
            this.table = new ChapterTable();
            // Fetch new
            /*let addNewButton = document.createElement("button");
            addNewButton.textContent = "Fetch new";
            addNewButton.addEventListener("click", () => {
                addNewButton.disabled = true;
                this.table.fetchNew().then(
                    ()=>{addNewButton.disabled=false},
                    ()=>{addNewButton.style.backgroundColor = "#f00"}
                );
            });*/
            // Fetch older
            let addMoreButton = document.createElement("button");
            addMoreButton.textContent = "Fetch older";
            addMoreButton.addEventListener("click", () => this.fetchMorePromise = this.fetchMorePromise.then(() => this.table.fetchMoreVisible()));
            this.showFilteredButton = document.createElement("button");
            this.showFilteredButton.textContent = "Show filtered";
            this.showFilteredButton.addEventListener("click", () => this.toggleShowFiltered());
            this.filterStyle = addStyle(this, `
            .filtered-manga {
                display: none;
            }
        `);
            this.append(
            //addNewButton,
            this.showFilteredButton, this.table, addMoreButton, new ImageTooltip("hover-tooltip"));
        }
        connectedCallback() {
            this.fetchNewHandler = setInterval(() => this.table.fetchNew(), 60 * 1000);
            this.fillTable();
            window.addEventListener("resize", this.fillTable);
        }
        disconnectedCallback() {
            clearInterval(this.fetchNewHandler);
            window.removeEventListener("resize", this.fillTable);
        }
        toggleShowFiltered() {
            if (this.filterStyle.isConnected) {
                this.filterStyle.remove();
                this.showFilteredButton.textContent = "Hide filtered";
                this.table.loadCovers();
            }
            else {
                getStyleContainer(this).appendChild(this.filterStyle);
                this.showFilteredButton.textContent = "Show filtered";
            }
        }
    };
    ChapterTableContainer = __decorate$2([
        initializeCustomElement("div")
    ], ChapterTableContainer);

    let tagsCached = null;
    async function getTags() {
        if (tagsCached === null) {
            tagsCached = [];
            let tagsFetched = await fetchThrottled("https://api.mangadex.org/manga/tag");
            let json = await tagsFetched.json();
            for (let tag of json.data) {
                tagsCached.push(tag.attributes.name.en);
            }
        }
        return tagsCached;
    }
    class TagWeightInput extends HTMLInputElement {
        constructor(option) {
            super();
            this.option = option;
            this.onOptionChanged = () => {
                let v = this.option.get();
                this.value = v ?? "";
                if (v < 0) {
                    this.style.backgroundColor = "#f88";
                }
                else if (v > 0) {
                    this.style.backgroundColor = "#8f8";
                }
                else if (Number.isNaN(v)) {
                    this.style.backgroundColor = "#ff8";
                }
                else {
                    this.style.backgroundColor = "";
                }
            };
            this.onValueChanged = () => {
                this.option.set(this.value || undefined);
            };
        }
        connectedCallback() {
            this.addEventListener("input", this.onValueChanged);
            this.option.addChangeListener(this.onOptionChanged);
            this.onOptionChanged();
        }
        disconnectedCallback() {
            this.removeEventListener("input", this.onValueChanged);
            this.option.removeChangeListener(this.onOptionChanged);
        }
    }
    customElements.define("tag-weight-input", TagWeightInput, { extends: "input" });
    class TagWeightColumn {
        constructor(tags, option) {
            this.tags = tags;
            this.option = option;
            this.cells = [];
            for (let tag of tags) {
                let td = document.createElement("td");
                let opt = new ObjectField(option, tag);
                let input = new TagWeightInput(opt);
                td.appendChild(input);
                this.cells.push({ td: td, input: input });
            }
        }
        destroy() {
            for (let { input } of this.cells) {
                input.option.destroy();
            }
            this.cells = [];
        }
    }
    class TagWeightTable extends HTMLTableElement {
        constructor() {
            super();
            this.columns = [];
            this.delayed_construct();
            this.classList.add("tag-weight-table");
        }
        async delayed_construct() {
            this.createRow("Tag name");
            let tags = [...await getTags()];
            tags.sort();
            tags.push("shounen", "shoujo", "josei", "seinen", "rating:safe", "rating:suggestive", "rating:erotica", "rating:pornographic");
            for (let i = 0; i < FILTERING_TAG_WEIGHTS.length; ++i) {
                let opt = new ArrayField(FILTERING_TAG_WEIGHTS, i);
                this.columns.push(new TagWeightColumn(tags, opt));
            }
            for (let tag of tags) {
                this.createRow(tag);
            }
            for (let i = 0; i < this.columns.length; ++i) {
                {
                    let removeColTd = document.createElement("td");
                    let removeColBtn = document.createElement("button");
                    removeColBtn.addEventListener("click", () => this.removeColumn(i));
                    removeColBtn.textContent = "Remove";
                    removeColTd.appendChild(removeColBtn);
                    this.rows[0].appendChild(removeColTd);
                }
                let col = this.columns[i];
                for (let j = 0; j < col.cells.length; ++j) {
                    this.rows[j + 1].appendChild(col.cells[j].td);
                }
            }
            let addRowBtn = document.createElement("button");
            addRowBtn.addEventListener("click", () => this.addColumn());
            addRowBtn.textContent = "Add";
            this.rows[0].appendChild(document.createElement("td")).appendChild(addRowBtn);
        }
        addColumn() {
            this.destroy();
            FILTERING_TAG_WEIGHTS.push({});
            this.delayed_construct();
        }
        removeColumn(colIndex) {
            this.destroy();
            FILTERING_TAG_WEIGHTS.pop(colIndex);
            this.delayed_construct();
        }
        createRow(firstCol) {
            let tr = document.createElement("tr");
            let td = document.createElement("td");
            tr.appendChild(td);
            td.textContent = firstCol;
            this.appendChild(tr);
        }
        destroy() {
            this.innerHTML = ""; // Must be called before col.option.destroy because it calls cell.disconnectedCallback -> option.removeChangeListener
            for (let col of this.columns) {
                col.destroy();
                col.option.destroy();
            }
            this.columns = [];
        }
    }
    customElements.define("tag-weight-table", TagWeightTable, { extends: "table" });

    var __decorate$1 = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    let Dashboard = class Dashboard extends HTMLDivElement {
        constructor() {
            super();
            this.header = document.createElement("nav");
            this.content = document.createElement("div");
            this.recentChapterTable = null;
            this.tagWeightTable = null;
            this.hideOrigBodyStyle = createStyle(`
        #MDFDashboard {
            z-index: 99999;
            position: fixed;
            background-color: #fff;
        }
        body {
            overflow-y: hidden !important;
        }
    `);
            this.id = "MDFDashboard";
            this.content.id = "content";
            this.shadow = this.attachShadow({ mode: "open" });
            this.createHeader();
            this.shadow.appendChild(this.content);
            this.showRecent();
            addStyle(this.shadow, `
            nav {
                border-bottom: 3px solid black;
                position: fixed;
                width: 100vw;
            }
            #content {
                overflow-y: auto;
                width: 100vw;
                height: calc(100vh - 27px);
                margin-top: 27px;
            }
            .chapter-table {
                border-collapse: collapse;
                height: 1px;
            }
            .chapter-table tr {
                height: 100%;
            }
            .chapter-table td {
                border: 1px solid black;
                padding: 0 5px 0 5px;
                height: 100%;
            }
            .chapter-table img {
                height: 100%;
                width: 100px;
                object-fit: contain;
            }
            .chapter-table .filter-button {
                display: block; /* Makes filter buttons appear on separate line */
            }
            .chapter-table td:first-child {
                padding: 0;
                height: 100px; /* Minimum height for cover images */
            }
            .filter-indicator {
                display: none;
            }
            .filtered-manga .filter-indicator {
                display: initial;
            }
            .time-text {
                margin-right: 5px;
            }
            .tag-weight-table input {
                width: 50px;
            }
        `);
        }
        createHeader() {
            function createButton(text, callback) {
                let btn = document.createElement("button");
                btn.textContent = text;
                btn.addEventListener("click", callback);
                return btn;
            }
            this.header.appendChild(createButton("Recent updates", () => this.showRecent()));
            this.header.appendChild(createButton("Tags", () => this.showTags()));
            this.header.appendChild(createButton("Close", () => this.hide()));
            this.shadow.appendChild(this.header);
        }
        showRecent() {
            if (this.currentView) {
                this.content.removeChild(this.currentView);
                this.currentView = null;
            }
            if (this.recentChapterTable === null) {
                this.recentChapterTable = new ChapterTableContainer();
            }
            this.currentView = this.content.appendChild(this.recentChapterTable);
        }
        showTags() {
            if (this.currentView) {
                this.content.removeChild(this.currentView);
                this.currentView = null;
            }
            if (this.tagWeightTable === null) {
                this.tagWeightTable = new TagWeightTable();
            }
            this.currentView = this.content.appendChild(this.tagWeightTable);
        }
        hide() {
            this.remove();
            this.hideOrigBodyStyle.remove();
        }
        show() {
            document.body.appendChild(this);
            document.head.appendChild(this.hideOrigBodyStyle);
        }
    };
    Dashboard = __decorate$1([
        initializeCustomElement("div", "mdf-dashboard")
    ], Dashboard);
    let dashboard = new Dashboard();

    var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    let NavMenu = class NavMenu extends HTMLElement {
        constructor(addDashboardButton = true) {
            super();
            this.shadow = this.attachShadow({ mode: "open" });
            this.style.position = "fixed";
            this.style.top = "0";
            this.style.right = "0";
            this.style.zIndex = "99999";
            this.style.backgroundColor = "#fff";
            if (addDashboardButton) {
                this.emplaceButton("Dashboard", () => dashboard.show());
            }
            addStyle(this.shadow, `
            button {
                display: block;
                width: 100%;
            }
        `);
        }
        appendButton(button) {
            this.shadow.appendChild(button);
            /*let div = document.createElement("div");
            this.shadow.appendChild(div).appendChild(button);*/
        }
        appendChild(node) {
            return this.shadow.appendChild(node);
        }
        emplaceButton(text, callback) {
            let button = document.createElement("button");
            button.textContent = text;
            button.addEventListener("click", callback);
            this.appendButton(button);
        }
    };
    NavMenu = __decorate([
        initializeCustomElement()
    ], NavMenu);

    async function main$3() {
        let nav = new NavMenu();
        document.body.appendChild(nav);
        dashboard.show();
        return () => {
            dashboard.hide();
            nav.remove();
        };
    }

    // Returns whether the active element is writable by the user (i.e. is input, textbox, etc.)
    function isWritableElement(el) {
        if (el instanceof HTMLInputElement) {
            return el.type == "text";
        }
        return (el instanceof HTMLTextAreaElement) || el.isContentEditable;
    }
    // Returns a function that detaches the handler.
    function addKeyboardHandler(callbacks) {
        function handler(e) {
            if (e.altKey || e.ctrlKey || e.metaKey)
                return;
            if (e.target instanceof HTMLElement && isWritableElement(e.target))
                return;
            if (e.key in callbacks) {
                callbacks[e.key](e);
                e.preventDefault();
            }
        }
        addEventListener("keydown", handler);
        return () => removeEventListener("keydown", handler);
    }

    function getMangaId() {
        let m = location.pathname.match("^/title/([a-f0-9-]+)");
        if (!m)
            throw Error("Unknown mangaId");
        return m[1];
    }
    async function main$2() {
        // Create navmenu
        let menu = new NavMenu(false);
        document.body.appendChild(menu);
        // Get opened manga
        let mangaId = getMangaId();
        let manga = new Manga(mangaId);
        // Manga filter
        menu.appendButton(new FilterButton(manga.filtered));
        // Lang filter
        if (manga.language.get()) {
            menu.appendButton(new LanguageFilterButton(manga.language));
        }
        // Filter indicator
        menu.appendChild(new FilterIndicator(manga.filterStatus, new Map([[2, "Filtered by tags"]])));
        // Keyboard
        let removeKeyboardHandler = addKeyboardHandler({
            "c": function () {
                navigator.clipboard.writeText(manga.title.get()).then(() => "#0f0", () => "#f00").then(async (c) => {
                    let el = document.querySelector("div.title p") ?? document.body;
                    el.style.backgroundColor = c;
                    await new Promise(f => setTimeout(f, 200));
                    el.style.backgroundColor = "";
                });
            },
            "f": function () {
                manga.filtered.toggle();
            }
        });
        return function detach() {
            removeKeyboardHandler();
            menu.remove();
        };
    }

    async function updateOldMangaIds(logger) {
        logger.addLine("Updating old manga IDs to new format. Please wait...");
        // @ts-expect-error
        let keys = GM_listValues();
        let filteredKeys = [];
        for (let key of keys) {
            let id = Number(key);
            if (!Number.isFinite(id))
                continue;
            // @ts-expect-error
            let val = JSON.parse(GM_getValue(id));
            if (val.f) {
                filteredKeys.push(id);
                logger.addLine("Will update key " + id);
            }
            else {
                // @ts-expect-error
                GM_deleteValue(id);
                logger.addLine("Removed useless key " + id);
            }
        }
        logger.addLine("Fetching updated manga IDs...");
        let keyMap = new Map();
        while (filteredKeys.length) {
            logger.addLine(`Fetching keys: ${filteredKeys.length} remaining`);
            let response = await fetch("https://api.mangadex.org/legacy/mapping", {
                method: "POST",
                body: JSON.stringify({
                    type: "manga",
                    ids: filteredKeys.splice(0, 500)
                }),
                headers: new Headers({
                    "Content-Type": "application/json"
                })
            });
            logger.addLine("Fetch success");
            let json = await response.json();
            for (let entry of json) {
                if (entry.result != "ok")
                    throw Error("Fetch failed");
                let oldKey = entry.data.attributes.legacyId;
                let newKey = entry.data.attributes.newId;
                keyMap.set(oldKey, newKey);
            }
        }
        logger.addLine("Successfully fetched key map.");
        logger.addLine("Updating manga IDs...");
        for (let [oldKey, newKey] of keyMap.entries()) {
            let manga = new Manga(newKey);
            manga.filtered.set(true);
            logger.addLine(`Updated key ${oldKey} to ${newKey}.`);
            manga.destroy();
            // @ts-expect-error
            GM_deleteValue(oldKey);
        }
        logger.addLine("Key update complete.");
    }
    class VersionPopup extends HTMLDivElement {
        constructor() {
            super();
            this.classList.add("version-popup");
            this.show();
        }
        addLine(text) {
            let p = document.createElement("p");
            p.textContent = text;
            this.appendChild(p);
            p.scrollIntoView();
        }
        show() {
            document.body.appendChild(this);
        }
        hide() {
            document.body.removeChild(this);
        }
        static initialize() {
            let style = document.createElement("style");
            style.innerHTML = `
            .version-popup {
                position: fixed;
                top: 0;
                left: 0;
                height: 100%;
                width: 100%;
                z-index: 999999;
                background-color: #fff;
                overflow: scroll;
            }
        `;
            document.head.appendChild(style);
            customElements.define("version-popup", VersionPopup, { extends: "div" });
        }
    }
    async function main$1() {
        const newDbVersion = 22;
        // @ts-expect-error
        let oldDbVersion = GM_getValue("VERSION", 0);
        if (newDbVersion == oldDbVersion)
            return;
        VersionPopup.initialize();
        let popup = new VersionPopup();
        popup.addLine("Updating database. Please wait...");
        try {
            popup.addLine("Removing old options.");
            // @ts-expect-error
            GM_deleteValue("__OPTIONS");
            await updateOldMangaIds(popup);
        }
        catch (e) {
            popup.addLine("Error while updating manga IDs.");
            popup.addLine(e);
            popup.addLine(JSON.stringify(e));
            console.log(e);
            throw e;
        }
        popup.addLine("All updates finished.");
        popup.hide();
        // @ts-expect-error
        GM_setValue("VERSION", newDbVersion);
    }

    const mainMap = new Map([
        [/^\/$/, main$3],
        //[/^\/titles\/latest\/$/, mainLatest],
        [/^\/title\/[a-f0-9-]+/, main$2]
    ]);
    async function main() {
        await main$1();
        let cancelFuncs = [];
        function startPageMains() {
            for (let [k, f] of mainMap.entries()) {
                if (k.test(location.pathname)) {
                    cancelFuncs.push(f());
                }
            }
        }
        startPageMains();
        let currentPage = location.href;
        setInterval(async () => {
            if (location.href == currentPage)
                return;
            currentPage = location.href;
            for (let p of cancelFuncs)
                (await p)();
            startPageMains();
        });
    }
    main();

}());
