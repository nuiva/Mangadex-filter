import { ObjectField, SetIndicator } from "../storage/src/storage";
import { FILTERED_LANGS } from "./options";
import { createStyle, initializeCustomElement } from "./utils";

interface ToggleableOption {
    toggle: () => void
    get: () => boolean
    addChangeListener: (_: () => void) => void
}

@initializeCustomElement("button")
export class FilterButton extends HTMLButtonElement {
    constructor(
        public filterOption: ToggleableOption
    ) {
        super();
        this.addEventListener("click", filterOption.toggle.bind(filterOption));
        filterOption.addChangeListener(this.onOptionChanged.bind(this));
        this.classList.add(FilterButton.typeName);
        this.onOptionChanged();
    }
    onOptionChanged() {
        if (this.filterOption.get()) {
            this.textContent = "Unfilter";
            this.style.backgroundColor = "#0f0";
        } else {
            this.textContent = "Filter";
            this.style.backgroundColor = "#f00";
        }
    }
    static typeName = "filter-button";
}
document.head.appendChild(createStyle(`
    .${FilterButton.typeName} {
        padding: 5px;
        border-radius: 10px;
        height: 20px;
        text-align: center;
        vertical-align: middle;
        line-height: 12px;
    }
`));

@initializeCustomElement("button")
export class LanguageFilterButton extends FilterButton {
    filterOption: SetIndicator
    constructor(language: ObjectField) {
        super(
            new SetIndicator(
                FILTERED_LANGS,
                language
            )
        );
        this.classList.add(LanguageFilterButton.typeName);
    }
    onOptionChanged() {
        if (this.filterOption.get()) {
            this.textContent = "Unfilter language";
            this.style.backgroundColor = "#0f0";
        } else {
            this.textContent = "Filter language";
            this.style.backgroundColor = "#f00";
        }
    }
    static typeName = "language-filter-button";
}
