import { FilterButton, LanguageFilterButton } from "./filterButton";
import { addKeyboardHandler } from "./keyboard";
import { FilterIndicator, Manga } from "./manga";
import { NavMenu } from "./navMenu";

function getMangaId(): string {
    let m = location.pathname.match("^/title/([a-f0-9-]+)");
    if (!m) throw Error("Unknown mangaId");
    return m[1];
}

export default async function main(): Promise<CallableFunction> {
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
        "c": function(){
            navigator.clipboard.writeText(manga.title.get()).then(
                () => "#0f0",
                () => "#f00"
            ).then(async c=>{
                let el = document.querySelector("div.title p") as HTMLElement ?? document.body;
                el.style.backgroundColor = c;
                await new Promise(f => setTimeout(f, 200));
                el.style.backgroundColor = "";
            });
        },
        "f": function(){
            manga.filtered.toggle();
        }
    });
    return function detach() {
        removeKeyboardHandler();
        menu.remove()
    }
}
