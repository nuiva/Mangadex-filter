
// Returns whether the active element is writable by the user (i.e. is input, textbox, etc.)
export function isWritableElement(el: HTMLElement) {
    if (el instanceof HTMLInputElement) {
        return el.type == "text";
    }
    return (el instanceof HTMLTextAreaElement) || el.isContentEditable;
}

// Returns a function that detaches the handler.
export function addKeyboardHandler(callbacks: {[index: string]: CallableFunction}): CallableFunction {
    function handler(e: KeyboardEvent) {
        if (e.altKey || e.ctrlKey || e.metaKey) return;
        if (e.target instanceof HTMLElement && isWritableElement(e.target)) return;
        if (e.key in callbacks) {
            callbacks[e.key](e);
            e.preventDefault();
        }
    }
    addEventListener("keydown", handler);
    return () => removeEventListener("keydown", handler);
}
