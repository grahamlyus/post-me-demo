export type WorkletMethods = {
  setWorkerPort: (port: MessagePort) => void;
  sum: (
    x: number,
    y: number,
    onProgress: (p: number) => void
  ) => Promise<number>;
};

export type WorkletEvents = {};

export type WorkerMethods = {
  setWorkletPort: (port: MessagePort) => void;
  sum: (
    x: number,
    y: number,
    onProgress: (p: number) => void
  ) => Promise<number>;
};

export type WorkerEvents = {};

export type ParentMethods = {
  getTitle: () => string;
  setTitle: (title: string) => void;
};

export type ParentEvents = {
  ping: void;
};

export type ChildMethods = {
  getBackground: () => string;
  setBackground: (color: string) => void;
};

export type ChildEvents = {
  pong: void;
};
