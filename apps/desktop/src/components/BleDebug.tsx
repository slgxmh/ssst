import { createSignal, For, onCleanup } from "solid-js";
import * as ble from "../services/ble";

export default function BleDebug() {
  const [scanning, setScanning] = createSignal(false);
  const [connected, setConnected] = createSignal(false);
  const [devices, setDevices] = createSignal<ble.BleDevice[]>([]);
  const [services, setServices] = createSignal<ble.BleService[]>([]);
  const [logs, setLogs] = createSignal<string[]>([]);
  const [selectedAddress, setSelectedAddress] = createSignal<string>("");

  function log(message: string) {
    setLogs((prev) => [...prev.slice(-99), message]);
  }

  const cleanupFns: (() => Promise<void>)[] = [];

  cleanupFns.push(
    ble.onDeviceFound((device) => {
      setDevices((prev) => {
        const filtered = prev.filter((d) => d.address !== device.address);
        return [...filtered, device].sort((a, b) => (b.rssi ?? -100) - (a.rssi ?? -100));
      });
    })
  );
  cleanupFns.push(
    ble.onConnected((payload) => {
      setConnected(true);
      log(`已连接: ${payload.address}`);
    })
  );
  cleanupFns.push(
    ble.onDisconnected(() => {
      setConnected(false);
      setServices([]);
      log("已断开连接");
    })
  );
  cleanupFns.push(
    ble.onServicesDiscovered((payload) => {
      setServices(payload.services);
      log(`发现 ${payload.services.length} 个服务`);
    })
  );
  cleanupFns.push(
    ble.onReadResult((result) => {
      log(`读取 ${result.charUuid}: ${result.hex}`);
    })
  );
  cleanupFns.push(
    ble.onNotify((event) => {
      log(`Notify ${event.charUuid}: ${event.hex}`);
    })
  );
  cleanupFns.push(
    ble.onBleError((message) => {
      log(`错误: ${message}`);
    })
  );

  onCleanup(async () => {
    for (const fn of cleanupFns) {
      await fn();
    }
  });

  async function handleStartScan() {
    setDevices([]);
    setScanning(true);
    log("开始扫描...");
    try {
      await ble.startScan();
    } catch (e: unknown) {
      log(`扫描失败: ${e instanceof Error ? e.message : String(e)}`);
      setScanning(false);
    }
  }

  async function handleStopScan() {
    setScanning(false);
    try {
      await ble.stopScan();
      log("扫描已停止");
    } catch (e: unknown) {
      log(`停止扫描失败: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function handleConnect() {
    const address = selectedAddress();
    if (!address) {
      log("请先选择一个设备");
      return;
    }
    try {
      await ble.connectDevice(address);
    } catch (e: unknown) {
      log(`连接失败: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function handleDisconnect() {
    try {
      await ble.disconnectDevice();
    } catch (e: unknown) {
      log(`断开失败: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function handleDiscover() {
    try {
      await ble.discoverServices();
    } catch (e: unknown) {
      log(`发现服务失败: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return (
    <div class="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100vh-6rem)]">
      <div class="space-y-4 overflow-auto">
        <div class="card bg-base-100 shadow-sm">
          <div class="card-body">
            <h2 class="card-title">🔍 BLE 扫描</h2>
            <div class="flex gap-2">
              <button
                class="btn btn-primary btn-sm"
                onClick={handleStartScan}
                disabled={scanning()}
              >
                {scanning() ? "扫描中..." : "开始扫描"}
              </button>
              <button class="btn btn-sm" onClick={handleStopScan} disabled={!scanning()}>
                停止扫描
              </button>
            </div>

            <div class="mt-4 max-h-64 overflow-auto border border-base-300 rounded">
              <table class="table table-xs">
                <thead>
                  <tr>
                    <th>名称</th>
                    <th>地址</th>
                    <th>RSSI</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={devices()}>
                    {(device) => (
                      <tr
                        class={selectedAddress() === device.address ? "bg-primary/20" : ""}
                        onClick={() => setSelectedAddress(device.address)}
                      >
                        <td>{device.name}</td>
                        <td class="font-mono text-xs">{device.address}</td>
                        <td>{device.rssi ?? "N/A"}</td>
                        </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="card bg-base-100 shadow-sm">
          <div class="card-body">
            <h2 class="card-title">🔌 连接</h2>
            <div class="flex gap-2">
              <button class="btn btn-primary btn-sm" onClick={handleConnect} disabled={connected()}>
                连接选中设备
              </button>
              <button class="btn btn-sm" onClick={handleDisconnect} disabled={!connected()}>
                断开
              </button>
              <button class="btn btn-sm" onClick={handleDiscover} disabled={!connected()}>
                发现服务
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-4 h-full">
        <div class="card bg-base-100 shadow-sm flex-1 overflow-auto">
          <div class="card-body">
            <h2 class="card-title">📋 服务与特征</h2>
            <For each={services()}>
              {(service) => (
                <div class="mb-3">
                  <div class="font-mono text-xs text-primary mb-1">{service.uuid}</div>
                  <For each={service.characteristics}>
                    {(ch) => (
                      <div class="pl-4 text-xs font-mono">
                        {ch.uuid} [{ch.properties.join(", ")}]
                      </div>
                    )}
                  </For>
                </div>
              )}
            </For>
          </div>
        </div>

        <div class="card bg-base-100 shadow-sm h-1/2 overflow-auto">
          <div class="card-body">
            <h2 class="card-title">📝 日志</h2>
            <div class="font-mono text-xs space-y-1">
              <For each={logs()}>
                {(line) => <div>{line}</div>}
              </For>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
