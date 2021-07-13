import { ObjectField, SetIndicator } from "../storage/src/storage";
import { FILTERED_LANGS } from "./options";

interface ToggleableOption {
    toggle: () => void
    get: () => boolean
    addChangeListener: (_: () => void) => void
}

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
    static initialize() {
        let style = document.createElement("style");
        style.innerHTML = `
            .${this.typeName} {
                padding: 5px;
                border-radius: 10px;
                height: 20px;
                text-align: center;
                vertical-align: middle;
                line-height: 12px;
            }
        `;
        document.head.appendChild(style);
        customElements.define(this.typeName, this, {extends: "button"});
    }
}

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
