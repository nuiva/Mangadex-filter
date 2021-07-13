import { Manga } from "./manga";

async function updateOldMangaIds(logger: VersionPopup) {
    logger.addLine("Updating old manga IDs to new format. Please wait...");
    // @ts-expect-error
    let keys = GM_listValues();
    let filteredKeys = [];
    for (let key of keys) {
        let id = Number(key);
        if (!Number.isFinite(id)) continue;
        // @ts-expect-error
        let val = JSON.parse(GM_getValue(id));
        if (val.f) {
            filteredKeys.push(id);
            logger.addLine("Will update key " + id);
        } else {
            // @ts-expect-error
            GM_deleteValue(id);
            logger.addLine("Removed useless key " + id);
        }
    }
    logger.addLine("Fetching updated manga IDs...")
    let keyMap = new Map<number,string>();
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
        logger.addLine("Fetch success")
        let json = await response.json();
        for (let entry of json) {
            if (entry.result != "ok") throw Error("Fetch failed");
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
    addLine(text: string) {
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
        customElements.define("version-popup", VersionPopup, {extends: "div"});
    }
}

export default async function main() {
    const newDbVersion = 22;
    // @ts-expect-error
    let oldDbVersion = GM_getValue("VERSION", 0);
    if (newDbVersion == oldDbVersion) return;
    VersionPopup.initialize();
    let popup = new VersionPopup();
    popup.addLine("Updating database. Please wait...");
    try {
        popup.addLine("Removing old options.");
        // @ts-expect-error
        GM_deleteValue("__OPTIONS");
        await updateOldMangaIds(popup);
    } catch (e) {
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