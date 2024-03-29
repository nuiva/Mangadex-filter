import { ChapterTableContainer } from "./recentUpdates";
import { addStyle } from "./style";
import { TagWeightTable } from "./tagWeights";
import { createStyle, initializeCustomElement } from "./utils";

@initializeCustomElement("div", "mdf-dashboard")
class Dashboard extends HTMLDivElement {
    currentView: any
    header: HTMLElement = document.createElement("nav")
    content: HTMLDivElement = document.createElement("div")
    shadow: ShadowRoot
    recentChapterTable: ChapterTableContainer = null
    tagWeightTable: TagWeightTable = null
    private hideOrigBodyStyle = createStyle(`
        #MDFDashboard {
            z-index: 99999;
            position: fixed;
            background-color: #fff;
        }
        body {
            overflow-y: hidden !important;
        }
    `)
    constructor() {
        super();
        this.id = "MDFDashboard";
        this.content.id = "content";
        this.shadow = this.attachShadow({mode: "open"});
        this.createHeader();
        this.shadow.appendChild(this.content);
        this.showRecent();
        addStyle(this.shadow, `
            nav {
                border-bottom: 3px solid black;
                position: fixed;
                width: 100vw;
            }
            #content {
                overflow-y: auto;
                width: 100vw;
                height: calc(100vh - 27px);
                margin-top: 27px;
            }
            .chapter-table {
                border-collapse: collapse;
                height: 1px;
            }
            .chapter-table tr {
                height: 100%;
            }
            .chapter-table td {
                border: 1px solid black;
                padding: 0 5px 0 5px;
                height: 100%;
            }
            .chapter-table img {
                height: 100%;
                width: 100px;
                object-fit: contain;
            }
            .chapter-table .filter-button {
                display: block; /* Makes filter buttons appear on separate line */
            }
            .chapter-table td:first-child {
                padding: 0;
                height: 100px; /* Minimum height for cover images */
            }
            .filter-indicator {
                display: none;
            }
            .filtered-manga .filter-indicator {
                display: initial;
            }
            .time-text {
                margin-right: 5px;
            }
            .tag-weight-table input {
                width: 50px;
            }
        `);
    }
    createHeader() {
        function createButton(text: string, callback: () => void) {
            let btn = document.createElement("button");
            btn.textContent = text;
            btn.addEventListener("click", callback);
            return btn;
        }
        this.header.appendChild(createButton("Recent updates", () => this.showRecent()));
        this.header.appendChild(createButton("Tags", () => this.showTags()));
        this.header.appendChild(createButton("Close", () => this.hide()));
        this.shadow.appendChild(this.header);
    }
    showRecent() {
        if (this.currentView) {
            this.content.removeChild(this.currentView);
            this.currentView = null;
        }
        if (this.recentChapterTable === null) {
            this.recentChapterTable = new ChapterTableContainer();
        }
        this.currentView = this.content.appendChild(this.recentChapterTable);
    }
    showTags() {
        if (this.currentView) {
            this.content.removeChild(this.currentView);
            this.currentView = null;
        }
        if (this.tagWeightTable === null) {
            this.tagWeightTable = new TagWeightTable();
        }
        this.currentView = this.content.appendChild(this.tagWeightTable);
    }
    hide() {
        this.remove();
        this.hideOrigBodyStyle.remove();
    }
    show() {
        document.body.appendChild(this);
        document.head.appendChild(this.hideOrigBodyStyle);
    }
}

export let dashboard = new Dashboard();
