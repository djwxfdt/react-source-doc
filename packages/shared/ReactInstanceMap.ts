type KeyObject = {_reactInternals?: any}

export function remove(key: KeyObject) {
  key._reactInternals = undefined;
}

export function get(key: KeyObject) {
  return key._reactInternals;
}

export function has(key: KeyObject) {
  return key._reactInternals !== undefined;
}

export function set(key: KeyObject, value: any) {
  key._reactInternals = value;
}
