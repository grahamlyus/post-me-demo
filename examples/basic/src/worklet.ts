import {
  ChildHandshake,
  DebugMessenger,
  debug,
  PortMessenger,
  RemoteHandle,
} from "post-me";
import { WorkerEvents, WorkerMethods, WorkletMethods } from "./types";

// Missing type declarations for Audio Worklets.
interface AudioWorkletProcessor {
  readonly port: MessagePort;
  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ): boolean;
}

// eslint-disable-next-line @typescript-eslint/no-redeclare
declare var AudioWorkletProcessor: {
  prototype: AudioWorkletProcessor;
  new (options?: AudioWorkletNodeOptions): AudioWorkletProcessor;
};

declare function registerProcessor(
  name: string,
  processorCtor: (new (
    options?: AudioWorkletNodeOptions
  ) => AudioWorkletProcessor) & {
    // parameterDescriptors?: AudioParamDescriptor[];
  }
): undefined;

declare var currentFrame: number;
declare var currentTime: number;
declare var sampleRate: number;

class Noise extends AudioWorkletProcessor {
  workerHandle?: RemoteHandle<WorkerMethods, WorkerEvents>;

  constructor() {
    super();

    let messenger = new PortMessenger({ port: this.port });
    // Optionally debug all the low level messages echanged
    const log = debug("post-me:worklet");
    messenger = DebugMessenger(messenger, log);

    const model: WorkletMethods = {
      setWorkerPort: async (port) => {
        let messenger = new PortMessenger({ port });
        const log = debug("post-me:worklet/worker");
        messenger = DebugMessenger(messenger, log);
        const connection = await ChildHandshake(messenger, model);
        this.workerHandle = connection.remoteHandle();
      },
      sum: (x, y, onProgress) => {
        return this.workerHandle!.call("sum", x, y, onProgress);
      },
    };

    // Start handshake with the parent
    ChildHandshake(messenger, model).then((_connection) => {});
  }

  process(inputs: Float32Array[][], outputs: Float32Array[][]) {
    const input = inputs[0];
    const output = outputs[0];

    for (let channel = 0; channel < output.length; ++channel) {
      const inputChannel = input[channel];
      const outputChannel = output[channel];
      for (let i = 0; i < outputChannel.length; ++i) {
        outputChannel[i] = inputChannel[i];
      }
    }

    return true;
  }
}

registerProcessor("noise", Noise);
