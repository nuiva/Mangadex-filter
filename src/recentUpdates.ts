import { Variable } from "../storage/src/storage"
import { ChapterAttributes, fetchCovers, fetchRecentChapters, GenericObject, MangaAttributes } from "./api"
import { FilterButton } from "./filterButton"
import { ImageTooltip } from "./imgTooltip"
import { FilterIndicator, Manga } from "./manga"
import { addStyle, getStyleContainer } from "./style"
import { TimeText } from "./timeText"
import { initializeCustomElement, sleep } from "./utils"

@initializeCustomElement("img")
class MangaCover extends HTMLImageElement {
    static fetchDelayPromise = new Promise<void>(f => f())
    constructor(public mangaId: string, public srcOption: Variable) {
        super();
        this.classList.add("hover-tooltip");
    }
    setCover = () => {
        if (!this.srcOption.get()) return;
        if (this.srcOption.get() == this.src) return;
        MangaCover.fetchDelayPromise = MangaCover.fetchDelayPromise.then(async () => {
            this.src = `https://uploads.mangadex.org/covers/${this.mangaId}/${this.srcOption.get()}.256.jpg`;
            await sleep(200);
        });
    }
    connectedCallback() {
        this.setCover();
        this.srcOption.addChangeListener(this.setCover);
    }
    disconnectedCallback() {
        this.srcOption.removeChangeListener(this.setCover);
    }
}

@initializeCustomElement("div")
class ChapterRow extends HTMLDivElement {
    timestamp: number
    constructor(public chapter: GenericObject<ChapterAttributes>) {
        super();
        let chapterLink = document.createElement("a");
        chapterLink.href = `/chapter/${chapter.id}`;
        chapterLink.textContent = `v${chapter.attributes.volume ?? "_"}c${chapter.attributes.chapter ?? "_"} - ${chapter.attributes.title ?? "NO TITLE"}`
        this.timestamp = new Date(chapter.attributes.publishAt).getTime();
        this.append(new TimeText(this.timestamp), chapterLink);
    }
}

@initializeCustomElement("tr")
class MangaRow extends HTMLTableRowElement {
    cover: HTMLImageElement
    coverFetched = false
    chapterContainer: HTMLTableCellElement
    chapters = new Set<string>()
    timestamp = 0 // Used for ordering rows, currently gets max publishTime from chapters
    constructor(public manga: Manga) {
        super();
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
    addChapter(chapter: GenericObject<ChapterAttributes>) {
        if (this.chapters.has(chapter.id)) return;
        this.chapters.add(chapter.id);
        let newRow = new ChapterRow(chapter);
        let i = 0;
        let rows = this.chapterContainer.children as HTMLCollectionOf<ChapterRow>
        while (i < rows.length && rows[i].timestamp > newRow.timestamp) ++i;
        this.chapterContainer.insertBefore(newRow, rows[i] ?? null);
        this.timestamp = Math.max(this.timestamp, newRow.timestamp);
    }
    onFilterUpdate = () => {
        if (this.manga.filterStatus.get()) {
            this.classList.add("filtered-manga");
        } else {
            this.classList.remove("filtered-manga");
            this.loadCover();
        }
    }
    addTd(...content: Array<HTMLElement>) {
        let td = document.createElement("td");
        for (let element of content) {
            td.appendChild(element);
        }
        return this.appendChild(td);
    }
    setCover(filename: string) {
        this.manga.cover.set(filename);
        this.coverFetched = true;
    }
    loadCover() {
        if (this.cover.isConnected) return;
        this.firstElementChild.appendChild(this.cover);
    }
}

@initializeCustomElement("table")
export class ChapterTable extends HTMLTableElement {
    mangaCache = new Map<string,MangaRow>();
    offset: number = 0
    chapters = new Set<string>();
    rows: HTMLCollectionOf<MangaRow>
    constructor() {
        super();
        this.classList.add("chapter-table");
    }
    addChapter(chapter: GenericObject<ChapterAttributes>, manga: GenericObject<MangaAttributes>) {
        if (this.chapters.has(chapter.id)) return false;
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
        if (mangaRow.timestamp > (mangaRow.previousSibling as MangaRow)?.timestamp ||
            mangaRow.timestamp < (mangaRow.nextSibling as MangaRow)?.timestamp) {
            let i = 0;
            while (i < this.rows.length && (this.rows[i].timestamp > mangaRow.timestamp || this.rows[i] === mangaRow)) ++i;
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
        for (let {chapter, manga} of chapters) {
            this.addChapter(chapter, manga);
        }
        await this.fetchCovers();
    }
    async fetchMore() {
        let oldOffset = this.offset;
        this.offset += 100;
        let chapters = await fetchRecentChapters(oldOffset);
        let added = [];
        for (let {chapter, manga} of chapters) {
            if (this.addChapter(chapter, manga)) {
                added.push({chapter, manga})
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
        let scrollEl = document.scrollingElement as HTMLElement;
        while (scrollEl.offsetHeight == scrollEl.scrollHeight) {
            if (!await this.fetchMoreVisible()) {
                return false;
            }
        }
        return true;
    }
    async fetchCovers() {
        let mangasToFetchSet = new Set<string>();
        for (let mangaRow of this.rows) {
            if (mangaRow.coverFetched == true) continue;
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
}

@initializeCustomElement("div")
export class ChapterTableContainer extends HTMLDivElement {
    table: ChapterTable
    showFilteredButton: HTMLButtonElement
    filterStyle: HTMLStyleElement
    fetchNewHandler: number
    fetchMorePromise: Promise<any> = new Promise(f => f(null))
    constructor() {
        super();
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
            this.showFilteredButton,
            this.table,
            addMoreButton,
            new ImageTooltip("hover-tooltip")
        );
    }
    fillTable = () => {
        this.fetchMorePromise = this.fetchMorePromise.then(() => this.table.fetchMoreUntilFullTable());
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
        } else {
            getStyleContainer(this).appendChild(this.filterStyle);
            this.showFilteredButton.textContent = "Show filtered";
        }
    }
}