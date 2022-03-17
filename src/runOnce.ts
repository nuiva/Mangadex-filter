let cache = new Set<CallableFunction>();

export function runOnce(f: CallableFunction) {
    if (cache.has(f)) return;
    cache.add(f);
    f();
}
