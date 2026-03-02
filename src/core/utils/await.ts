export function awaitMS(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}