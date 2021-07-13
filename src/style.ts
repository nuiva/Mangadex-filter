export function getStyleContainer(context: Node) {
    let container = context.getRootNode();
    if (container instanceof Document) {
        return container.head;
    }
    return container;
}

export function addStyle(context: Node, styleText: string) {
    let style = document.createElement("style");
    style.innerHTML = styleText;
    getStyleContainer(context).appendChild(style);
    return style;
}
