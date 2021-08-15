import { FiberRoot } from "../../../react-reconciler/src/ReactInternalTypes";

export type Container = (Element & {_reactRootContainer?: FiberRoot}) | (Document & {_reactRootContainer?: FiberRoot});

export type TimeoutHandle = any;

export type NoTimeout = -1;

export type SuspenseInstance = Comment & {_reactRetry?: () => void};


export const noTimeout = -1;

export const supportsHydration = true;
