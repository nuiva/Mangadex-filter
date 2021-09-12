import { FilterButton, LanguageFilterButton } from "./filterButton";
import { FilterIndicator, Manga } from "./manga";
import { NavMenu } from "./navMenu";
import { isWritableElement } from "./utils";

function getMangaId(): string {
    let m = location.pathname.match("^/title/(.*)$");
    if (!m) throw Error("Unknown mangaId");
    return m[1];
}

export default function main() {
    // Create navmenu
    NavMenu.initialize();
    let menu = new NavMenu(false);
    document.body.appendChild(menu);
    // Get opened manga
    let mangaId = getMangaId();
    let manga = new Manga(mangaId);
    // Manga filter
    {
        FilterButton.initialize();
        menu.appendButton(new FilterButton(manga.filtered));
    }
    // Lang filter
    if (manga.language.get()) {
        LanguageFilterButton.initialize();
        menu.appendButton(new LanguageFilterButton(manga.language));
    }
    // Filter indicator
    FilterIndicator.initialize();
    menu.appendChild(new FilterIndicator(manga.filterStatus, new Map([[2, "Filtered by tags"]])));
    // Copy title from keyboard
    addEventListener("keydown", (e: KeyboardEvent) => {
        if (!(e.target instanceof HTMLElement)) throw TypeError("Unknown event target type.");
        if (e.key != "c" || e.ctrlKey || e.altKey || e.metaKey || e.shiftKey || isWritableElement(e.target)) return;
        navigator.clipboard.writeText(manga.title.get()).then(
            () => "#0f0",
            () => "#f00"
        ).then(async c=>{
            let el = document.querySelector("div.title p") as HTMLElement ?? document.body;
            el.style.backgroundColor = c;
            await new Promise(f => setTimeout(f, 200));
            el.style.backgroundColor = "";
        });
    });
}