import mainFrontpage from "./frontpage"
import mainTitlepage from "./titlepage"
import update from "./update"

const mainMap: Map<RegExp,() => Promise<CallableFunction>> = new Map([
    [/^\/$/, mainFrontpage],
    //[/^\/titles\/latest\/$/, mainLatest],
    [/^\/title\/[a-f0-9-]+/, mainTitlepage]
]);

async function main() {
    await update();
    let cancelFuncs: Array<Promise<CallableFunction>> = [];
    function startPageMains() {
        for (let [k,f] of mainMap.entries()) {
            if (k.test(location.pathname)) {
                cancelFuncs.push(f());
            }
        }
    }
    startPageMains();

    let currentPage = location.href;
    setInterval(async () => {
        if (location.href == currentPage) return;
        currentPage = location.href;
        for (let p of cancelFuncs) (await p)();
        startPageMains();
    })
}

main();

