import {
  WorkerMessenger,
  ParentHandshake,
  WindowMessenger,
  LocalHandle,
  RemoteHandle,
  DebugMessenger,
  debug,
  PortMessenger,
} from "post-me";
import {
  ParentMethods,
  ParentEvents,
  WorkerMethods,
  WorkerEvents,
  ChildMethods,
  ChildEvents,
  WorkletMethods,
  WorkletEvents,
} from "./types";

let currentTitle = "Parent";
const titleHeader = document.getElementById(
  "title-header"
) as HTMLHeadingElement;
titleHeader.innerHTML = currentTitle;

const numberInputA = document.getElementById(
  "number-input-a"
) as HTMLInputElement;
numberInputA.value = "2";
const numberInputB = document.getElementById(
  "number-input-b"
) as HTMLInputElement;
numberInputB.value = "3";
const numberInputC = document.getElementById(
  "number-input-c"
) as HTMLInputElement;
numberInputC.value = "";
const calculateBtn = document.getElementById(
  "calculate-btn"
) as HTMLButtonElement;

const countSpan = document.getElementById("count-span") as HTMLSpanElement;
const emitBtn = document.getElementById("emit-btn") as HTMLButtonElement;

const progressDiv = document.getElementById("progress-bar") as HTMLDivElement;

async function addWorklet() {
  const context = new AudioContext();
  await context.audioWorklet.addModule("worklet.js");
  const noise = new AudioWorkletNode(context, "noise");
  noise.connect(context.destination);

  let messenger = new PortMessenger({ port: noise.port });
  const log = debug("post-me:parentW");
  messenger = DebugMessenger(messenger, log);

  // Start handshake with the worklet
  const connection = await ParentHandshake(messenger, {}, 10, 1000);
  const remoteHandle: RemoteHandle<
    WorkletMethods,
    WorkletEvents
  > = connection.remoteHandle();

  return remoteHandle;
}

// Communicating with worker
async function addWorker() {
  const worker = new Worker("./worker.js");
  let messenger = new WorkerMessenger({ worker });
  // Optionally debug all the low level messages echanged
  const log = debug("post-me:parentW");
  messenger = DebugMessenger(messenger, log);

  // Start handshake with the worker
  const connection = await ParentHandshake(messenger, {}, 10, 1000);
  const remoteHandle: RemoteHandle<
    WorkerMethods,
    WorkerEvents
  > = connection.remoteHandle();

  return remoteHandle;
}

async function workerAndWorklet() {
  const workletHandle = await addWorklet();
  const workerHandle = await addWorker();

  const channel = new MessageChannel();
  workletHandle.customCall("setWorkerPort", [channel.port1], {
    transfer: [channel.port1],
  });
  workerHandle.customCall("setWorkletPort", [channel.port2], {
    transfer: [channel.port2],
  });

  calculateBtn.onclick = () => {
    const a = parseFloat(numberInputA.value);
    const b = parseFloat(numberInputB.value);
    numberInputC.value = "";

    const onProgress = (progress: number) => {
      progressDiv.style.width = `${progress * 100}%`;
      // const maxWidth = 25;
      // progressDiv.style.width = `${maxWidth * progress}rem`;
    };

    workletHandle.call("sum", a, b, onProgress).then((result) => {
      numberInputC.value = result.toString();
      progressDiv.style.width = `0`;
    });
  };
}

workerAndWorklet();

// Communicating with child iframe
{
  const model: ParentMethods = {
    getTitle: () => {
      return currentTitle;
    },
    setTitle: (title) => {
      currentTitle = title;
      titleHeader.innerHTML = title;
    },
  };

  // Arbitrary code to generate a child window we'll communicate with
  const childContainer = document.getElementById(
    "child-container"
  ) as HTMLDivElement;
  const childFrame = document.createElement("iframe");
  childFrame.src = "./child.html";
  childFrame.name = "child";
  childFrame.width = "100%";
  childFrame.height = "100%";
  childContainer.appendChild(childFrame);
  const childWindow = childFrame.contentWindow as Window;

  const colorInput = document.getElementById("color-input") as HTMLInputElement;

  // Create a Messenger to communicate with the child window
  let messenger = new WindowMessenger({
    localWindow: window,
    remoteWindow: childWindow,
    // both windows are on the same origin in this example,
    // if cross-origin, specify the actual origin, or '*' (not recommended)
    remoteOrigin: window.origin,
  });

  // Optional debug all the low level messages echanged
  const log = debug("post-me:parent0");
  messenger = DebugMessenger(messenger, log);

  // Start handshake with the iframe
  ParentHandshake(messenger, model, 10, 1000).then((connection) => {
    const remoteHandle: RemoteHandle<
      ChildMethods,
      ChildEvents
    > = connection.remoteHandle();
    const localHandle: LocalHandle<
      ParentMethods,
      ParentEvents
    > = connection.localHandle();

    remoteHandle.call("getBackground").then((color) => {
      colorInput.value = color;
    });

    colorInput.oninput = (ev: any) => {
      remoteHandle.call("setBackground", ev.target.value);
    };

    emitBtn.onclick = () => {
      localHandle.emit("ping", undefined);
    };

    let count = 0;
    countSpan.innerHTML = count.toString();
    remoteHandle.addEventListener("pong", () => {
      count += 1;
      countSpan.innerHTML = count.toString();
    });
  });
}
