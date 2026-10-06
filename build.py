"""Assemble src/ parts into torque_prototype.html. Run: python3 build.py"""
from pathlib import Path
src = Path(__file__).parent / "src"
parts = ["02_engine.js", "03_ui.js", "shell_render.js", "04_adv.js", "05_admin.js", "06_channels.js", "07_publisher.js"]
html = (src / "01_head.html").read_text() + "<script>\n" + "\n".join((src / p).read_text() for p in parts) + "\n</script>\n"
out = Path(__file__).parent / "torque_prototype.html"
out.write_text(html)
print(f"Wrote {out} ({len(html):,} bytes)")
