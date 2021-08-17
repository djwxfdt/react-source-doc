
declare interface isArray {
  (a: mixed) : boolean
}

const isArrayImpl = Array.isArray;

// eslint-disable-next-line no-redeclare
function isArray(a: mixed): boolean {
  return isArrayImpl(a);
}

export default isArray;
