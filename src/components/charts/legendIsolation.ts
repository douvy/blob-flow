/**
 * Isolate-on-click legend behavior. Clicking a series shows only that series;
 * clicking the currently isolated series restores all of them.
 */
export function isolateLegendKey(
  hiddenKeys: Set<string>,
  allKeys: string[],
  clickedKey: string
): Set<string> {
  const visibleKeys = allKeys.filter((key) => !hiddenKeys.has(key));
  const isIsolated = visibleKeys.length === 1 && visibleKeys[0] === clickedKey;
  if (isIsolated) {
    return new Set();
  }
  return new Set(allKeys.filter((key) => key !== clickedKey));
}
