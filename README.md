# Torque Ad Platform (CD_Ads)

## Run it on your Mac

**Easiest:** in Finder, double-click **`Start Torque.command`**. Your browser opens at http://localhost:8080.
(The first time, macOS may say it's from an unidentified developer: right-click the file → **Open** → **Open**.)

**From Terminal:**
```bash
cd ~/CD_Ads
python3 serve.py          # http://localhost:8080
PORT=9000 python3 serve.py   # if 8080 is busy
```
Press **Ctrl+C** to stop.

The server rebuilds the page from `src/` whenever you change a file there, so you can edit and refresh. It only listens on this computer (127.0.0.1).

## Connector demo (YouTube / Meta)

Double-click **`Run Connector Demo.command`**, or:
```bash
cd ~/CD_Ads/connector && python3 demo.py
```
Runs the audience sync → launch → monitor flow on 60,000 synthetic users. In this dry-run mode, every Google/Meta API call is printed and nothing is sent. See `connector/README.md` for going live.

## What's here

| Path | What it is |
|---|---|
| `src/` | Prototype source: `01_head.html` (layout, styles), `02_engine.js` (audiences, forecast, ad server, pacing), `03_ui.js` + `shell_render.js` (UI framework, navigation), `04_adv.js` (Advertiser console), `05_admin.js` (Admin console), `06_channels.js` (YouTube, Meta, publisher network), `07_publisher.js` (Publisher console) |
| `build.py` | Combines `src/` into `torque_prototype.html` |
| `serve.py` | Local server with auto-rebuild |
| `torque_prototype.html` | The built prototype; this file also opens directly in a browser |
| `connector/` | Python service that syncs audiences to Google/Meta, launches campaigns, and pulls results |
| `Torque_Ad_Platform_Spec.md` | Product and technical spec |

Requirements: Python 3.9+ (built into macOS once the Command Line Tools are installed). No other installs are needed for the prototype or the dry-run demo.
