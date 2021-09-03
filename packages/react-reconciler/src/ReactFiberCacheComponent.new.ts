export type Cache = Map<() => mixed, mixed>;

export type SpawnedCachePool = {
  parent: Cache,
  pool: Cache,
};