import { FiberRoot } from "./ReactInternalTypes";

export type Container = (Element & {_reactRootContainer?: FiberRoot}) | (Document & {_reactRootContainer?: FiberRoot});

export type TimeoutHandle = any;

export type NoTimeout = -1;

export type SuspenseInstance = Comment & {_reactRetry?: () => void};
