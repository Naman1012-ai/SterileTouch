#!/usr/bin/env python3
"""
SterileTouch™ OS-Level Virtual HID Companion Bridge
====================================================
Zero-Integration Deployment Daemon for Hospital PACS & Workstations.

Translates mid-air sterile gestures and voice intents received over local WebSocket
into native OS Mouse and Keyboard events (controlling Sectra PACS, GE Centricity,
Siemens Syngo, Horos/OsiriX, Philips IntelliSpace, etc.) without requiring any
plugin or modifications to the hospital PACS.

Requirements:
    pip install websockets pyautogui

Usage:
    python steriletouch_bridge.py
"""

import asyncio
import json
import sys

try:
    import pyautogui
    # Configure safety limits for surgical stability
    pyautogui.FAILSAFE = True
    pyautogui.PAUSE = 0.005  # 5ms execution pause for smooth tracking
except ImportError:
    print("[ERROR] pyautogui is not installed. Run: pip install pyautogui")
    sys.exit(1)

try:
    import websockets
except ImportError:
    print("[ERROR] websockets is not installed. Run: pip install websockets")
    sys.exit(1)

PORT = 8765
SCREEN_W, SCREEN_H = pyautogui.size()

print("=" * 65)
print("  STERILETOUCH™ OS VIRTUAL HID COMPANION BRIDGE")
print(f"  Primary Display Resolution: {SCREEN_W}x{SCREEN_H}")
print(f"  Listening on: ws://127.0.0.1:{PORT}")
print("  Press Ctrl+C to stop.")
print("=" * 65)

async def handle_client(websocket):
    print(f"[BRIDGE] Connected to SterileTouch Web Terminal from {websocket.remote_address}")
    
    # Notify client of connected screen dimensions
    init_payload = {
        "status": "CONNECTED",
        "screenWidth": SCREEN_W,
        "screenHeight": SCREEN_H,
        "os": sys.platform
    }
    await websocket.send(json.dumps(init_payload))

    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                event_type = data.get("type")

                if event_type == "MOVE":
                    # Normalized 0..1 coordinates mapped to native OS display
                    norm_x = data.get("normX", 0.5)
                    norm_y = data.get("normY", 0.5)
                    target_x = int(norm_x * SCREEN_W)
                    target_y = int(norm_y * SCREEN_H)
                    pyautogui.moveTo(target_x, target_y)

                elif event_type == "CLICK":
                    button = data.get("button", "left")
                    pyautogui.click(button=button)

                elif event_type == "SCROLL":
                    # deltaY: positive scrolls down, negative scrolls up
                    delta = data.get("deltaY", 0)
                    pyautogui.scroll(int(delta * 2))

                elif event_type == "KEY":
                    key_code = data.get("code")
                    if key_code:
                        pyautogui.press(key_code)

                elif event_type == "HOTKEY":
                    keys = data.get("keys", [])
                    if keys:
                        pyautogui.hotkey(*keys)

            except json.JSONDecodeError:
                pass
            except Exception as e:
                # Silently catch occasional mouse boundary clips
                pass

    except websockets.exceptions.ConnectionClosed:
        print("[BRIDGE] SterileTouch client disconnected.")

async def main():
    async with websockets.serve(handle_client, "127.0.0.1", PORT):
        await asyncio.Future()  # run forever

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[BRIDGE] Server stopped by user.")
