// Returns the least index i such that list[i] > query
// list must be an ascendingly sorted array
export function binarySearch<T>(list: Array<number>, query: number) {
    let left = 0;
    let right = list.length;
    while (left < right - 1) {
        let i = left + Math.floor((right - left) / 2);
        if (query < list[i]) {
            right = i;
        } else {
            left = i;
        }
    }
    return left;
}