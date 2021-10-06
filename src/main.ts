import mainFrontpage from "./frontpage"
import mainTitlepage from "./titlepage"
import update from "./update"

const mainMap: Map<RegExp,CallableFunction> = new Map([
    [/^\/$/, mainFrontpage],
    //[/^\/titles\/latest\/$/, mainLatest],
    [/^\/title\/[a-f0-9-]+/, mainTitlepage]
]);

async function main() {
    await update();
    for (let [k,f] of mainMap.entries()) {
        if (k.test(location.pathname)) {
            f();
        }
    }
}

main();

