
export interface GenericObject<AttributeType> {
    id: string
    type: string
    attributes: AttributeType
    relationships: Array<GenericObject<any>>
}

export interface TagAttributes {
    name: {
        en: string
    }
    group: string
}

export interface MangaAttributes {
    title: {
        en: string
        ja: string
    }
    altTitles: Array<{
        en: string
    }>
    description: {
        en: string
    }
    originalLanguage: string
    publicationDemographic: "shounen" | "shoujo" | "josei" | "seinen" | "none"
    status: "ongoing" | "completed" | "hiatus" | "cancelled"
    tags: Array<GenericObject<TagAttributes>>
    createdAt: string
    contentRating: "safe" | "suggestive" | "erotica" | "pornographic"
}

export interface ChapterAttributes {
    volume: string
    chapter: String
    title: string
    translatedLanguage: string
    hash: string
    publishAt: string
}

export interface ChapterList {
    result: String // hopefully "ok"
    response: String // usually "collection"
    data: Array<GenericObject<ChapterAttributes>>
};

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

export async function fetchRecentChapters(offset: number = 0):
    Promise<Array<{
        chapter: GenericObject<ChapterAttributes>,
        manga: GenericObject<MangaAttributes>
    }>>
{
    let response = await fetch(`https://api.mangadex.org/chapter?order[publishAt]=desc&limit=100&includes[]=manga&${getUserOptionRequestString()}includeFutureUpdates=0&offset=${offset}`);
    let json: ChapterList = await response.json();
    let returnValue: Array<{
        chapter: GenericObject<ChapterAttributes>,
        manga: GenericObject<MangaAttributes>
    }> = [];
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

function sleep(ms: number) {
    return new Promise(f => setTimeout(f, ms));
}

const throttleTime = 200;
let requestPromise = new Promise(f => f(undefined));
export function fetchThrottled(url: string) {
    let fetchPromise = requestPromise.then(() => fetch(url));
    requestPromise = fetchPromise.then(() => sleep(throttleTime));
    return fetchPromise;
}

export async function fetchCovers(...mangaIdArray: Array<string>) {
    let mangaIdToCover = new Map<string, string>();
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
