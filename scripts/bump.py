#!/usr/bin/env python3
"""Stamp a new version on every script, stylesheet and module import, so browsers load the
update at once instead of mixing cached old files with new ones. Run before each push."""
import re, time, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
v = str(int(time.time()))
for f in [root / 'index.html', *sorted((root / 'js').glob('*.js'))]:
    s = f.read_text()
    s2 = re.sub(r"""((?:from\s+|import\s+|src=|href=)['"](?:\./|js/|css/)[\w./-]+\.(?:js|css))(?:\?v=\d+)?(['"])""", rf"\1?v={v}\2", s)
    if s2 != s: f.write_text(s2)
print('version', v)
