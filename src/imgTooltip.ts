import { initializeCustomElement } from "./utils";

@initializeCustomElement("img")
export class ImageTooltip extends HTMLImageElement {
    currentTarget: HTMLImageElement = null
    constructor(public targetClass: string) {
        super();
        this.style.position = "fixed";
        this.style.zIndex = "999999";
        this.addEventListener("load", this.onLoad);
    }
    connectedCallback() {
        this.parentNode.addEventListener("mouseover", this.onMouseover);
        this.parentNode.addEventListener("mouseout", this.onMouseout);
        this.hidden = true;
    }
    disconnectedCallback() {
        this.parentNode.removeEventListener("mouseover", this.onMouseover);
        this.parentNode.removeEventListener("mouseout", this.onMouseout);
    }
    onMouseover = (e: MouseEvent) => {
        if (!(e.target instanceof HTMLImageElement) || !e.target.classList.contains(this.targetClass)) return;
        this.currentTarget = e.target;
        this.src = e.target.src;
    }
    onMouseout = (e: MouseEvent) => {
        if (e.target !== this.currentTarget) return;
        this.currentTarget = null;
        this.hidden = true;
    }
    onLoad = () => {
        if (this.currentTarget === null) return; // Image loaded after mouseout
        this.hidden = false;
        let coords = this.currentTarget.getBoundingClientRect();
        this.style.top = Math.min(coords.top, window.innerHeight - this.height) + "px";
        this.style.left = coords.right + 5 + "px";
    }
}
