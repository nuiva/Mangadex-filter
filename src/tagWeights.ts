import { ArrayField, ObjectField } from "../storage/src/storage";
import { fetchThrottled, GenericObject, TagAttributes } from "./api";
import { FILTERING_TAG_WEIGHTS } from "./options";

let tagsCached: Array<string> = null;
async function getTags(): Promise<Array<string>> {
    if (tagsCached === null) {
        tagsCached = [];
        let tagsFetched = await fetchThrottled("https://api.mangadex.org/manga/tag");
        let json: Array<{data: GenericObject<TagAttributes>}> = await tagsFetched.json();
        for (let tag of json) {
            tagsCached.push(tag.data.attributes.name.en);
        }
    }
    return tagsCached;
}

class TagWeightInput extends HTMLInputElement {
    constructor(public option: ObjectField) {
        super();
    }
    connectedCallback() {
        this.addEventListener("input", this.onValueChanged);
        this.option.addChangeListener(this.onOptionChanged);
        this.onOptionChanged();
    }
    disconnectedCallback() {
        this.removeEventListener("input", this.onValueChanged);
        this.option.removeChangeListener(this.onOptionChanged);
    }
    onOptionChanged = () => {
        let v = this.option.get();
        this.value = v ?? "";
        if (v < 0) {
            this.style.backgroundColor = "#f88";
        } else if (v > 0) {
            this.style.backgroundColor = "#8f8";
        } else if (Number.isNaN(v)) {
            this.style.backgroundColor = "#ff8";
        } else {
            this.style.backgroundColor = "";
        }
    }
    onValueChanged = () => {
        this.option.set(this.value || undefined);
    }
}
customElements.define("tag-weight-input", TagWeightInput, {extends: "input"});

class TagWeightColumn {
    cells: Array<{td: HTMLTableCellElement, input: TagWeightInput}> = []
    constructor(
        public tags: Array<string>,
        public option: ArrayField
    ) {
        for (let tag of tags) {
            let td = document.createElement("td");
            let opt = new ObjectField(option, tag);
            let input = new TagWeightInput(opt);
            td.appendChild(input);
            this.cells.push({td: td, input: input});
        }
    }
    destroy() {
        for (let {input} of this.cells) {
            input.option.destroy();
        }
        this.cells = [];
    }
}

export class TagWeightTable extends HTMLTableElement {
    columns: Array<TagWeightColumn> = []
    constructor() {
        super();
        this.delayed_construct();
        this.classList.add("tag-weight-table");
    }
    async delayed_construct() {
        this.createRow("Tag name");
        let tags = [...await getTags(), "shounen", "shoujo", "josei", "seinen"];
        tags.sort();
        for (let i = 0; i < FILTERING_TAG_WEIGHTS.length; ++i) {
            let opt = new ArrayField(FILTERING_TAG_WEIGHTS, i);
            this.columns.push(new TagWeightColumn(tags, opt));
        }
        for (let tag of tags) {
            this.createRow(tag);
        }
        for (let i = 0; i < this.columns.length; ++i) {
            {
                let removeColTd = document.createElement("td");
                let removeColBtn = document.createElement("button");
                removeColBtn.addEventListener("click", () => this.removeColumn(i));
                removeColBtn.textContent = "Remove";
                removeColTd.appendChild(removeColBtn);
                this.rows[0].appendChild(removeColTd);
            }
            let col = this.columns[i];
            for (let j = 0; j < col.cells.length; ++j) {
                this.rows[j+1].appendChild(col.cells[j].td);
            }
        }
        let addRowBtn = document.createElement("button");
        addRowBtn.addEventListener("click", () => this.addColumn());
        addRowBtn.textContent = "Add";
        this.rows[0].appendChild(document.createElement("td")).appendChild(addRowBtn);
    }
    addColumn() {
        this.destroy();
        FILTERING_TAG_WEIGHTS.push({});
        this.delayed_construct();
    }
    removeColumn(colIndex: number) {
        this.destroy();
        FILTERING_TAG_WEIGHTS.pop(colIndex);
        this.delayed_construct();
    }
    createRow(firstCol: string) {
        let tr = document.createElement("tr");
        let td = document.createElement("td");
        tr.appendChild(td);
        td.textContent = firstCol;
        this.appendChild(tr);
    }
    destroy() {
        this.innerHTML = ""; // Must be called before col.option.destroy because it calls cell.disconnectedCallback -> option.removeChangeListener
        for (let col of this.columns) {
            col.destroy();
            col.option.destroy();
        }
        this.columns = [];
    }
}
customElements.define("tag-weight-table", TagWeightTable, {extends: "table"});