import { Dashboard } from "./dashboard";
import { addStyle } from "./style";
import { initializeCustomElement } from "./utils";

@initializeCustomElement()
export class NavMenu extends HTMLElement {
    shadow: ShadowRoot
    constructor(addDashboardButton: boolean = true) {
        super();
        this.shadow = this.attachShadow({mode: "open"});
        this.style.position = "fixed";
        this.style.top = "0";
        this.style.right = "0";
        this.style.zIndex = "99999";
        this.style.backgroundColor = "#fff";
        if (addDashboardButton) {
            this.emplaceButton("Dashboard", Dashboard.show);
        }
        addStyle(this.shadow, `
            button {
                display: block;
                width: 100%;
            }
        `)
    }
    appendButton(button: HTMLButtonElement) {
        this.shadow.appendChild(button);
        /*let div = document.createElement("div");
        this.shadow.appendChild(div).appendChild(button);*/
    }
    appendChild<T extends Node>(node: T): T {
        return this.shadow.appendChild(node);
    }
    emplaceButton(text: string, callback: () => void) {
        let button = document.createElement("button");
        button.textContent = text;
        button.addEventListener("click", callback);
        this.appendButton(button);
    }
}
