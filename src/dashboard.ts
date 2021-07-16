import { ChapterTableContainer } from "./recentUpdates";
import { addStyle } from "./style";
import { TagWeightTable } from "./tagWeights";

let dashboardCache: Dashboard = null;
let origBody: HTMLBodyElement = null;
export class Dashboard extends HTMLBodyElement {
    currentView: any
    header: HTMLElement = document.createElement("nav")
    content: HTMLDivElement = document.createElement("div")
    shadow: ShadowRoot
    recentChapterTable: ChapterTableContainer = null
    tagWeightTable: TagWeightTable = null
    constructor() {
        super();
        this.id = "MDFDashboard";
        this.shadow = this.attachShadow({mode: "open"});
        this.createHeader();
        this.shadow.appendChild(this.content);
        this.showRecent();
        addStyle(this.shadow, `
            #MDFDashboard {
                background-color: #fff;
            }
            #MDFDashboard nav {
                border-bottom: 5px solid black;
            }
            #MDFDashboard nav button {
                padding: 3px;
            }
            #MDFDashboard table {
                border-collapse: collapse;
            }
            #MDFDashboard td {
                border: 1px solid black;
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
            ChapterTableContainer.initialize();
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
        document.body = origBody;
    }
    static show() {
        dashboardCache ??= new Dashboard();
        origBody = document.body as HTMLBodyElement;
        document.body = dashboardCache;
    }
    static initialized = false;
    static initialize() {
        if (this.initialized) {
            console.warn("Called Dashboard.initialize twice.");
            return;
        }
        this.initialized = true;
        customElements.define("mdf-dashboard", Dashboard, {extends: "body"});
    }
}
