"""Run the Torque prototype locally.

    python3 serve.py            # http://localhost:8080
    PORT=9000 python3 serve.py  # another port

Rebuilds torque_prototype.html from src/ automatically whenever a file in src/
has changed, so you can edit and just refresh the browser.
Only listens on 127.0.0.1 (this computer), not your network.
"""
import http.server
import os
import subprocess
import sys
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"
OUT = ROOT / "torque_prototype.html"
PORT = int(os.environ.get("PORT", "8080"))


def rebuild_if_needed():
    newest = max(p.stat().st_mtime for p in SRC.iterdir() if p.is_file())
    if not OUT.exists() or newest > OUT.stat().st_mtime:
        subprocess.run([sys.executable, str(ROOT / "build.py")], check=True)


class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path in ("/", "/index.html"):
            try:
                rebuild_if_needed()
            except Exception as e:  # show the build error in the browser
                self.send_error(500, f"Build failed: {e}")
                return
            body = OUT.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        self.send_error(404, "Open http://localhost:%d/" % PORT)

    def log_message(self, fmt, *args):
        pass


if __name__ == "__main__":
    rebuild_if_needed()
    url = f"http://localhost:{PORT}/"
    try:
        server = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    except OSError:
        sys.exit(f"Port {PORT} is busy. Try: PORT=9000 python3 serve.py")
    print(f"\n  Torque prototype running at {url}\n  Edit files in src/ and refresh the browser.\n  Press Ctrl+C to stop.\n")
    if os.environ.get("NO_BROWSER") != "1":
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  Stopped.")
