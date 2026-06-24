import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

export interface BleDevice {
  name: string;
  address: string;
  rssi: number | null;
}

export interface BleService {
  uuid: string;
  characteristics: BleCharacteristic[];
}

export interface BleCharacteristic {
  uuid: string;
  properties: string[];
}

export interface BleReadResult {
  serviceUuid: string;
  charUuid: string;
  hex: string;
  base64: string;
}

export interface BleNotifyEvent {
  charUuid: string;
  hex: string;
  base64: string;
}

export async function startScan(): Promise<void> {
  return invoke("start_scan");
}

export async function stopScan(): Promise<void> {
  return invoke("stop_scan");
}

export async function connectDevice(address: string): Promise<void> {
  return invoke("connect_device", { address });
}

export async function disconnectDevice(): Promise<void> {
  return invoke("disconnect_device");
}

export async function discoverServices(): Promise<void> {
  return invoke("discover_services");
}

export async function readCharacteristic(
  serviceUuid: string,
  charUuid: string
): Promise<void> {
  return invoke("read_characteristic", { serviceUuid, charUuid });
}

export async function writeCharacteristic(
  serviceUuid: string,
  charUuid: string,
  data: number[]
): Promise<void> {
  return invoke("write_characteristic", { serviceUuid, charUuid, data });
}

export async function subscribeCharacteristic(
  serviceUuid: string,
  charUuid: string
): Promise<void> {
  return invoke("subscribe_characteristic", { serviceUuid, charUuid });
}

export function onDeviceFound(
  callback: (device: BleDevice) => void
): () => Promise<void> {
  let unlisten: UnlistenFn | undefined;
  const setup = listen<BleDevice>("ble://device-found", (event) => {
    callback(event.payload);
  }).then((fn) => {
    unlisten = fn;
  });

  return async () => {
    await setup;
    unlisten?.();
  };
}

export function onConnected(
  callback: (payload: { address: string }) => void
): () => Promise<void> {
  let unlisten: UnlistenFn | undefined;
  const setup = listen<{ address: string }>("ble://connected", (event) => {
    callback(event.payload);
  }).then((fn) => {
    unlisten = fn;
  });

  return async () => {
    await setup;
    unlisten?.();
  };
}

export function onDisconnected(
  callback: () => void
): () => Promise<void> {
  let unlisten: UnlistenFn | undefined;
  const setup = listen("ble://disconnected", () => {
    callback();
  }).then((fn) => {
    unlisten = fn;
  });

  return async () => {
    await setup;
    unlisten?.();
  };
}

export function onServicesDiscovered(
  callback: (payload: { services: BleService[] }) => void
): () => Promise<void> {
  let unlisten: UnlistenFn | undefined;
  const setup = listen<{ services: BleService[] }>("ble://services", (event) => {
    callback(event.payload);
  }).then((fn) => {
    unlisten = fn;
  });

  return async () => {
    await setup;
    unlisten?.();
  };
}

export function onReadResult(
  callback: (result: BleReadResult) => void
): () => Promise<void> {
  let unlisten: UnlistenFn | undefined;
  const setup = listen<BleReadResult>("ble://read-result", (event) => {
    callback(event.payload);
  }).then((fn) => {
    unlisten = fn;
  });

  return async () => {
    await setup;
    unlisten?.();
  };
}

export function onNotify(
  callback: (event: BleNotifyEvent) => void
): () => Promise<void> {
  let unlisten: UnlistenFn | undefined;
  const setup = listen<BleNotifyEvent>("ble://notify", (event) => {
    callback(event.payload);
  }).then((fn) => {
    unlisten = fn;
  });

  return async () => {
    await setup;
    unlisten?.();
  };
}

export function onBleError(
  callback: (message: string) => void
): () => Promise<void> {
  let unlisten: UnlistenFn | undefined;
  const setup = listen<string>("ble://error", (event) => {
    callback(event.payload);
  }).then((fn) => {
    unlisten = fn;
  });

  return async () => {
    await setup;
    unlisten?.();
  };
}
