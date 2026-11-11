/**
 * SterileTouch OS Virtual HID Bridge Service
 *
 * Connects to localhost:8765 companion daemon to send native OS mouse/keyboard events.
 * Enables zero-integration control over legacy hospital PACS (Sectra, Horos, GE, Siemens).
 */

export interface OsBridgeStatus {
  isConnected: boolean;
  screenWidth?: number;
  screenHeight?: number;
  os?: string;
  lastSentEvent?: string;
}

export type OsBridgeStatusListener = (status: OsBridgeStatus) => void;

class OsBridgeService {
  private socket: WebSocket | null = null;
  private isConnected: boolean = false;
  private screenWidth: number = 1920;
  private screenHeight: number = 1080;
  private os: string = 'unknown';
  private listeners: OsBridgeStatusListener[] = [];
  private reconnectTimer: number | null = null;
  private lastSentTime: number = 0;
  private readonly THROTTLE_MOVE_MS: number = 16; // 60 FPS OS mouse updates

  constructor() {
    if (typeof window !== 'undefined') {
      this.initConnection();
    }
  }

  public initConnection() {
    if (typeof WebSocket === 'undefined') return;

    try {
      this.socket = new WebSocket('ws://127.0.0.1:8765');

      this.socket.onopen = () => {
        this.isConnected = true;
        this.notify();
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.status === 'CONNECTED') {
            this.screenWidth = data.screenWidth || 1920;
            this.screenHeight = data.screenHeight || 1080;
            this.os = data.os || 'unknown';
            this.notify();
          }
        } catch {}
      };

      this.socket.onclose = () => {
        this.isConnected = false;
        this.notify();
        this.scheduleReconnect();
      };

      this.socket.onerror = () => {
        this.isConnected = false;
        this.notify();
      };
    } catch {
      this.isConnected = false;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    if (typeof window === 'undefined') return;

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.initConnection();
    }, 5000);
  }

  public getStatus(): OsBridgeStatus {
    return {
      isConnected: this.isConnected,
      screenWidth: this.screenWidth,
      screenHeight: this.screenHeight,
      os: this.os,
    };
  }

  public onStatusChange(listener: OsBridgeStatusListener) {
    this.listeners.push(listener);
    listener(this.getStatus());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(lastEvent?: string) {
    const status: OsBridgeStatus = {
      isConnected: this.isConnected,
      screenWidth: this.screenWidth,
      screenHeight: this.screenHeight,
      os: this.os,
      lastSentEvent: lastEvent,
    };
    this.listeners.forEach((l) => l(status));
  }

  public sendMouseMove(normX: number, normY: number) {
    if (!this.isConnected || !this.socket || this.socket.readyState !== WebSocket.OPEN) return;

    const now = performance.now();
    if (now - this.lastSentTime < this.THROTTLE_MOVE_MS) return;
    this.lastSentTime = now;

    this.socket.send(
      JSON.stringify({
        type: 'MOVE',
        normX,
        normY,
      })
    );
  }

  public sendMouseClick(button: 'left' | 'right' | 'middle' = 'left') {
    if (!this.isConnected || !this.socket || this.socket.readyState !== WebSocket.OPEN) return;

    this.socket.send(
      JSON.stringify({
        type: 'CLICK',
        button,
      })
    );
    this.notify(`CLICK (${button})`);
  }

  public sendMouseScroll(deltaY: number) {
    if (!this.isConnected || !this.socket || this.socket.readyState !== WebSocket.OPEN) return;

    this.socket.send(
      JSON.stringify({
        type: 'SCROLL',
        deltaY,
      })
    );
    this.notify(`SCROLL (${deltaY > 0 ? 'DOWN' : 'UP'})`);
  }

  public sendKeyPress(code: string) {
    if (!this.isConnected || !this.socket || this.socket.readyState !== WebSocket.OPEN) return;

    this.socket.send(
      JSON.stringify({
        type: 'KEY',
        code,
      })
    );
    this.notify(`KEY: ${code}`);
  }
}

export const osBridgeService = new OsBridgeService();
