import { ChapterAttributes, fetchCovers, fetchRecentChapters, GenericObject, MangaAttributes } from "./api"
import { FilterButton } from "./filterButton"
import { ImageTooltip } from "./imgTooltip"
import { Manga } from "./manga"
import { addStyle, getStyleContainer } from "./style"

class ChapterRow extends HTMLTableRowElement {
    cover: HTMLImageElement
    chapterTitle: HTMLAnchorElement
    mangaTitle: HTMLAnchorElement
    filterButton: FilterButton
    coverFetched = false
    constructor(
        public chapter: GenericObject<ChapterAttributes>,
        public manga: Manga)
    {
        super();
        this.classList.add("chapter-row");
        this.cover = document.createElement("img");
        this.cover.classList.add("hover-tooltip");
        if (manga.cover.get()) this.setCover(manga.cover.get());
        this.chapterTitle = document.createElement("a");
        this.chapterTitle.href = `/chapter/${chapter.id}`;
        this.chapterTitle.textContent = `v${chapter.attributes.volume ?? "?"}c${chapter.attributes.chapter ?? "?"} - ${chapter.attributes.title ?? "NO TITLE"}`;
        this.mangaTitle = document.createElement("a");
        this.mangaTitle.href = `/title/${manga.id}`;
        this.mangaTitle.textContent = manga.title.get();
        this.filterButton = new FilterButton(manga.filtered);
        this.addTd(this.cover);
        this.addTd(this.chapterTitle);
        this.addTd(this.mangaTitle, this.filterButton);
        this.manga.filterStatus.addChangeListener(this.onFilterUpdate);
        this.onFilterUpdate();
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
        this.appendChild(td);
    }
    setCover(filename: string) {
        this.cover.src = `https://uploads.mangadex.org/covers/${this.manga.id}/${filename}.256.jpg`;
        this.manga.cover.set(filename);
        this.coverFetched = true;
    }
    static initialize() {
        FilterButton.initialize();
        customElements.define("chapter-row", ChapterRow, {extends: "tr"});
    }
}

export class ChapterTable extends HTMLTableElement {
    mangaCache = new Map<string,Manga>();
    offset: number = 0
    chapters = new Set<string>();
    addChapter(chapter: GenericObject<ChapterAttributes>, manga: GenericObject<MangaAttributes>) {
        if (this.chapters.has(chapter.id)) return;
        this.chapters.add(chapter.id);
        if (!this.mangaCache.has(manga.id)) {
            let manga_ = new Manga(manga.id);
            this.mangaCache.set(manga.id, manga_);
            manga_.updateFrom(manga);
        }
        let row = new ChapterRow(chapter, this.mangaCache.get(manga.id));
        this.appendChild(row);
        this.classList.add("chapter-table");
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
        for (let chapterRow of this.childNodes as NodeListOf<ChapterRow>) {
            if (chapterRow.coverFetched == true) continue;
            mangasToFetchSet.add(chapterRow.manga.id);
        }
        let coverMap = await fetchCovers(...mangasToFetchSet);
        for (let chapterRow of this.childNodes as NodeListOf<ChapterRow>) {
            if (coverMap.has(chapterRow.manga.id)) {
                chapterRow.setCover(coverMap.get(chapterRow.manga.id));
            }
        }
    }
    static initialize() {
        ChapterRow.initialize();
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