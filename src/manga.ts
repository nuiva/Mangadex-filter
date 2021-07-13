import { BoolWrapper, GMOption, ObjectField, JsonSetWrapper, Variable, ArrayWrapper, SetIndicator } from "../storage/src/storage";
import { GenericObject, MangaAttributes } from "./api";
import { FILTERED_LANGS, FILTERING_TAG_WEIGHTS } from "./options";

class TagFilteredBool extends BoolWrapper {
    constructor(public tags: JsonSetWrapper) {
        super(new Variable(false));
        FILTERING_TAG_WEIGHTS.addChangeListener(this.onWeightChanged);
        this.tags.addChangeListener(this.onWeightChanged);
        this.onWeightChanged();
    }
    onWeightChanged = () => {
        for (let rule of FILTERING_TAG_WEIGHTS) {
            let w = 0;
            for (let tag of this.tags) {
                w += Number(rule[tag] ?? 0);
            }
            if (w <= -1) {
                return super.set(true);
            }
        }
        return super.set(false);
    }
    destroy() {
        FILTERING_TAG_WEIGHTS.removeChangeListener(this.onWeightChanged);
        this.tags.removeChangeListener(this.onWeightChanged);
        super.destroy();
    }
}

class FilterStatus extends Variable {
    filtered: BoolWrapper
    tagFiltered: TagFilteredBool
    langFiltered: SetIndicator
    constructor(
        filtered: BoolWrapper,
        tags: JsonSetWrapper,
        language: ObjectField
    ) {
        super(0);
        this.filtered = filtered;
        this.tagFiltered = new TagFilteredBool(tags);
        this.filtered.addChangeListener(this.onVariableChange);
        this.tagFiltered.addChangeListener(this.onVariableChange);
        this.langFiltered = new SetIndicator(FILTERED_LANGS, language);
        this.langFiltered.addChangeListener(this.onVariableChange);
        this.onVariableChange();
    }
    onVariableChange = () => {
        if (this.filtered.get()) {
            return this.set(1);
        }
        if (this.tagFiltered.get()) {
            return this.set(2);
        }
        if (this.langFiltered.get()) {
            return this.set(3);
        }
        this.set(0);
    }
    destroy() {
        this.filtered.removeChangeListener(this.onVariableChange);
        this.tagFiltered.destroy();
        super.destroy();
    }
}

export class FilterIndicator extends HTMLParagraphElement {
    static filterTexts = new Map<number, string>([
        [0, "Not filtered"],
        [1, "Filtered"],
        [2, "Filtered by tags"],
        [3, "Filtered by language"]
    ]);
    constructor(public filterStatus: FilterStatus, public filterTexts: Map<number, string> = FilterIndicator.filterTexts) {
        super();
        this.filterStatus.addChangeListener(this.update);
        this.update();
    }
    update = () => {
        this.textContent = this.filterTexts.get(this.filterStatus.get()) ?? "";
    }
    static initialize() {
        customElements.define("filter-indicator", FilterIndicator, {extends: "p"});
    }
}

export class Manga {
    static updateInterval = 30 * 24 * 60 * 60 * 1000;
    variable: GMOption
    title: ObjectField
    filtered: BoolWrapper
    tags: JsonSetWrapper
    lastUpdate: ObjectField
    demographic: ObjectField
    language: ObjectField
    //hentai: BoolWrapper
    filterStatus: FilterStatus
    cover: ObjectField
    constructor(public id: string) {
      this.variable = new GMOption(String(id));
      this.title = new ObjectField(this.variable, "b");
      this.filtered = new BoolWrapper(new ObjectField(this.variable, "f"));
      this.tags = new JsonSetWrapper(new ArrayWrapper(new ObjectField(this.variable, "t")));
      this.lastUpdate = new ObjectField(this.variable, "u");
      this.demographic = new ObjectField(this.variable, "e");
      this.language = new ObjectField(this.variable, "l");
      //this.hentai = new BoolWrapper(new ObjectField(this.variable, "h"));
      this.filterStatus = new FilterStatus(this.filtered, this.tags, this.language);
      this.cover = new ObjectField(this.variable, "c");
    }
    updateFrom(json: GenericObject<MangaAttributes>) {
        console.assert(this.id === json.id);
        this.title.set(json.attributes.title.en);
        let tags = new Set<string>();
        for (let tag of json.attributes.tags) {
            tags.add(tag.attributes.name.en);
        }
        this.tags.set(tags);
        this.lastUpdate.set(Date.now());
        this.demographic.set(json.attributes.publicationDemographic);
        this.language.set(json.attributes.originalLanguage);
    }
    destroy() {
        this.cover.destroy();
        this.filterStatus.destroy();
        this.language.destroy();
        this.demographic.destroy();
        this.lastUpdate.destroy();
        this.tags.destroy();
        this.filtered.destroy();
        this.title.destroy();
        this.variable.destroy();
    }
}
