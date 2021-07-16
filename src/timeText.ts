export class TimeText extends HTMLTimeElement {
    static thresholds: Array<[number,string]> = [
        [1, "ms"],
        [1000, "s"],
        [1000 * 60, "min"],
        [1000 * 60 * 60, "h"],
        [1000 * 60 * 60 * 24, "d"]
    ];
    timeoutID: number = null
    constructor(public timestamp: number) {
        super();
        this.classList.add("time-text");
        this.title = new Date(timestamp).toISOString();
    }
    connectedCallback() {
        this.onTimeout();
    }
    disconnectedCallback() {
        clearTimeout(this.timeoutID);
    }
    onTimeout = () => {
        let diff = this.timestamp - Date.now();
        let sign = Math.sign(diff);
        diff = Math.abs(diff);
        let i = 0;
        while (i < TimeText.thresholds.length && TimeText.thresholds[i][0] < diff) ++i;
        i = Math.max(0, i-1);
        let multiplier = Math.floor(diff / TimeText.thresholds[i][0]);
        this.textContent = multiplier + TimeText.thresholds[i][1] + (sign == -1 ? " ago" : "");
        let untilNext = sign === 1 ?
            diff - multiplier * TimeText.thresholds[i][0] + 1 :
            (multiplier + 1) * TimeText.thresholds[i][0] - diff;
        this.timeoutID = setTimeout(this.onTimeout, untilNext);
    }
    static initialize() {
        customElements.define("time-text", TimeText, {extends: "time"});
    }
}
