export type Lanes = number;
export type Lane = number;
export type LaneMap<T> = Array<T>;


export const TotalLanes = 31;

/**
 * 二进制0
 */
export const NoLane: Lane = /*                          */ 0b0000000000000000000000000000000;

/**
 * NoLanes和NoLane虽然值一样，但含义不一样，NoLanes代表集合
 */
export const NoLanes: Lanes = /*                        */ 0b0000000000000000000000000000000;


export const NoTimestamp = -1;

export function createLaneMap<T>(initial: T): LaneMap<T> {
  // Intentionally pushing one by one.
  // https://v8.dev/blog/elements-kinds#avoid-creating-holes
  const laneMap = [];
  for (let i = 0; i < TotalLanes; i++) {
    laneMap.push(initial);
  }
  return laneMap;
}
