# SterileTouch™ OS-Level Virtual HID Bridge
## Zero-Integration Deployment for Locked-Down Hospital PACS

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Hospital Workstation Architecture               │
├───────────────────────────────┬────────────────────────────────────────┤
│ Hospital Desktop              │ SterileTouch Terminal                  │
├───────────────────────────────┼────────────────────────────────────────┤
│ • Sectra PACS / GE Centricity │ • Browser (Zero install, MediaPipe)    │
│ • Siemens Syngo / Horos / Mac │ • Tracks hand gestures at 60 FPS       │
│ • Locked OS (No plugin needed)│ • Intentional Clutch & Voice Assistant │
│                               │ • Sends WebSocket HID Packets          │
└───────────────────────────────┴────────────────────────────────────────┘
                                 │
                     Local WebSocket (127.0.0.1:8765)
                                 │
                                 ▼
         ┌────────────────────────────────────────────────┐
         │ steriletouch_bridge.py (Native OS Virtual HID) │
         │ Emulates Hardware Mouse Clicks, Scrolls & Keys │
         └────────────────────────────────────────────────┘
```

### Why Hospital IT Loves This:
1. **Zero Modifications to PACS:** No DLL injection, no browser extensions into clinical PACS, no security vulnerability flags.
2. **Standard USB Mouse/Keyboard Emulation:** The OS processes gestures as if a physical USB wireless pointer were connected.
3. **Works on Any PACS:** Sectra, Horos, OsiriX, Philips IntelliSpace, GE Centricity, Agfa, Epic EHR, Cerner.

### Quickstart (Windows / macOS / Linux)

```bash
# 1. Install lightweight dependencies (once)
pip install websockets pyautogui

# 2. Run the bridge
python bridge/steriletouch_bridge.py
```

When started, open SterileTouch in Chrome/Edge. The header will automatically show:
`🟢 OS HID Bridge: CONNECTED (Controlling Native Desktop OS)`.

---

### Mid-Air Gesture to OS PACS Mappings:

| Mid-Air Gesture | Native OS Action | PACS Clinical Result |
|---|---|---|
| **Point & Move** | `pyautogui.moveTo(x, y)` | Moves surgeon cursor across PACS window |
| **Dwell (850ms) or Pinch** | `pyautogui.click('left')` | Selects tool, sets caliper point, clicks button |
| **Air Swipe Left / Right** | `pyautogui.press('pageup' / 'pagedown')` | Traverses DICOM slice stack forward/backward |
| **Pinch & Vertical Move** | `pyautogui.scroll(delta)` | Continuous volumetric slice cine scrolling |
| **Voice "Bone Window"** | `pyautogui.press('w')` | Activates PACS window/level preset |
| **Sterile Freeze Fist** | Clutches tracking | Locks cursor so surgeon can reposition hand |
