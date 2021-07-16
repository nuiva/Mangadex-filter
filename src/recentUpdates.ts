import { ChapterAttributes, fetchCovers, fetchRecentChapters, GenericObject, MangaAttributes } from "./api"
import { FilterButton } from "./filterButton"
import { ImageTooltip } from "./imgTooltip"
import { FilterIndicator, Manga } from "./manga"
import { addStyle, getStyleContainer } from "./style"
import { TimeText } from "./timeText"

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
    static initialize() {
        customElements.define("chapter-row", ChapterRow, {extends: "div"});
        TimeText.initialize();
    }
}

class MangaRow extends HTMLTableRowElement {
    cover: HTMLImageElement
    coverFetched = false
    chapterContainer: HTMLTableCellElement
    chapters = new Set<string>()
    timestamp = 0 // Used for ordering rows, currently gets max publishTime from chapters
    constructor(public manga: Manga) {
        super();
        // Create cover
        this.cover = document.createElement("img");
        this.cover.classList.add("hover-tooltip");
        if (manga.cover.get()) this.setCover(manga.cover.get());
        this.addTd(this.cover);
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
        this.cover.src = `https://uploads.mangadex.org/covers/${this.manga.id}/${filename}.256.jpg`;
        this.manga.cover.set(filename);
        this.coverFetched = true;
    }
    static initialize() {
        ChapterRow.initialize();
        FilterButton.initialize();
        customElements.define("manga-row", MangaRow, {extends: "tr"});
    }
}

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
        for (let offset = 0, oldChapterFound = false; oldChapterFound === false; offset += 100) {
            for (let entry of await fetchRecentChapters(offset)) {
                oldChapterFound ||= this.mangaCache.get(entry.manga.id)?.chapters?.has?.(entry.chapter.id);
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
        for (let {chapter, manga} of chapters) {
            this.addChapter(chapter, manga);
        }
        await this.fetchCovers();
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
    static initialize() {
        MangaRow.initialize();
        customElements.define("chapter-table", ChapterTable, {extends: "table"});
    }
}

export class ChapterTableContainer extends HTMLDivElement {
    table: ChapterTable
    showFilteredButton: HTMLButtonElement
    filterStyle: HTMLStyleElement
    constructor() {
        super();
        this.table = new ChapterTable();
        this.table.fetchMore();
        // Fetch new
        let addNewButton = document.createElement("button");
        addNewButton.textContent = "Fetch new";
        addNewButton.addEventListener("click", () => {
            addNewButton.disabled = true;
            this.table.fetchNew().then(
                ()=>{addNewButton.disabled=false},
                ()=>{addNewButton.style.backgroundColor = "#f00"}
            );
        });
        // Fetch older
        let addMoreButton = document.createElement("button");
        addMoreButton.textContent = "Fetch older";
        addMoreButton.addEventListener("click", () => this.table.fetchMore());
        this.showFilteredButton = document.createElement("button");
        this.showFilteredButton.textContent = "Show filtered";
        this.showFilteredButton.addEventListener("click", () => this.toggleShowFiltered());
        this.showFilteredButton.style.position = "absolute";
        this.showFilteredButton.style.top = "0";
        this.showFilteredButton.style.right = "0";
        this.filterStyle = addStyle(this, `
            .filtered-manga {
                display: none;
            }
        `);
        this.append(
            addNewButton,
            this.table,
            addMoreButton,
            this.showFilteredButton,
            new ImageTooltip("hover-tooltip")
        );
    }
    toggleShowFiltered() {
        if (this.filterStyle.isConnected) {
            this.filterStyle.parentNode.removeChild(this.filterStyle);
            this.showFilteredButton.textContent = "Hide filtered";
        } else {
            getStyleContainer(this).appendChild(this.filterStyle);
            this.showFilteredButton.textContent = "Show filtered";
        }
    }
    static initialize() {
        ChapterTable.initialize();
        customElements.define("chapter-table-container", ChapterTableContainer, {extends: "div"});
        ImageTooltip.initialize();
        FilterIndicator.initialize();
    }
}