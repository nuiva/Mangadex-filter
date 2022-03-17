export function sleep(ms: number) {
    return new Promise(f => setTimeout(f, ms));
}

// Returns the least index i such that list[i] > query
// list must be an ascendingly sorted array
export function binarySearch<T>(list: Array<number>, query: number) {
    let left = 0;
    let right = list.length;
    while (left < right - 1) {
        let i = left + Math.floor((right - left) / 2);
        if (query < list[i]) {
            right = i;
        } else {
            left = i;
        }
    }
    return left;
}

export function createStyle(css: string): HTMLStyleElement {
    let style = document.createElement("style");
    style.innerHTML = css;
    return style;
}

// Decorator
export function initializeCustomElement(parentTagName?: string, tagName?: string) {
    return function(cls: CustomElementConstructor & {name: string}) {
        customElements.define(tagName ?? cls.name.replaceAll(/([A-Z])/g, "-$1").replace(/^-/,"").toLowerCase(), cls, parentTagName && {extends: parentTagName});
    }
}
