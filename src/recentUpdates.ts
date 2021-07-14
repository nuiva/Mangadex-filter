import { ChapterAttributes, fetchCovers, fetchRecentChapters, GenericObject, MangaAttributes } from "./api"
import { FilterButton } from "./filterButton"
import { ImageTooltip } from "./imgTooltip"
import { Manga } from "./manga"
import { addStyle, getStyleContainer } from "./style"

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
        // Create chapter container
        this.chapterContainer = this.addTd();
        // Create title
        {
            let title = document.createElement("a");
            title.textContent = manga.title.get();
            title.href = `/title/${manga.id}`;
            this.addTd(title, new FilterButton(manga.filtered));
        }
        manga.filterStatus.addChangeListener(this.onFilterUpdate);
        this.onFilterUpdate();
    }
    addChapter(chapter: GenericObject<ChapterAttributes>) {
        if (this.chapters.has(chapter.id)) return;
        this.chapters.add(chapter.id);
        let chapterLink = document.createElement("a");
        chapterLink.href = `/chapter/${chapter.id}`;
        chapterLink.textContent = `v${chapter.attributes.volume ?? "_"}c${chapter.attributes.chapter ?? "_"} - ${chapter.attributes.title ?? "NO TITLE"}`
        this.chapterContainer.appendChild(document.createElement("div")).appendChild(chapterLink);
        this.timestamp = Math.max(this.timestamp, new Date(chapter.attributes.publishAt).getTime());
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
        if (this.chapters.has(chapter.id)) return;
        this.chapters.add(chapter.id);
        if (!this.mangaCache.has(manga.id)) {
            let manga_ = new Manga(manga.id);
            manga_.updateFrom(manga);
            let mangaRow = new MangaRow(manga_);
            this.mangaCache.set(manga.id, mangaRow);
            this.appendChild(mangaRow);
        }
        this.mangaCache.get(manga.id).addChapter(chapter);
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
    addMoreButton: HTMLButtonElement
    showFilteredButton: HTMLButtonElement
    filterStyle: HTMLStyleElement
    constructor() {
        super();
        this.table = new ChapterTable();
        this.table.fetchMore();
        this.addMoreButton = document.createElement("button");
        this.addMoreButton.textContent = "Fetch more";
        this.addMoreButton.addEventListener("click", () => this.table.fetchMore());
        this.showFilteredButton = document.createElement("button");
        this.showFilteredButton.textContent = "Show filtered";
        this.showFilteredButton.addEventListener("click", () => this.toggleShowFiltered());
        this.showFilteredButton.style.position = "absolute";
        this.showFilteredButton.style.top = "0";
        this.showFilteredButton.style.right = "0";
        this.appendChild(this.table);
        this.appendChild(this.addMoreButton);
        this.appendChild(this.showFilteredButton);
        this.filterStyle = addStyle(this, `
            .filtered-manga {
                display: none;
            }
        `);
        this.appendChild(new ImageTooltip("hover-tooltip"));
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
    }
}