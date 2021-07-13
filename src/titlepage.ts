import { FilterButton, LanguageFilterButton } from "./filterButton";
import { FilterIndicator, Manga } from "./manga";
import { NavMenu } from "./navMenu";

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
}