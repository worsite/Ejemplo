#!/usr/bin/env python3
"""Genera versiones de un solo archivo en catalogo/dist/ (catalogo.html y admin.html).
Incrusta CSS, JavaScript y las imágenes del logo, así que se abren con doble clic o se suben a cualquier hosting.
Uso: python3 catalogo/build.py   (desde cualquier carpeta)"""
import base64
import re
from pathlib import Path

SRC = Path(__file__).resolve().parent
DIST = SRC / 'dist'

PAGES = {
    'catalogo.html': dict(html='index.html', css='styles.css', script='app.js',
                          modules=['menu.js', 'art.js', 'cart.js', 'util.js', 'orders.js', 'supabase.js', 'config.js', 'app.js'],
                          replace={}),
    'admin.html': dict(html='admin.html', css='admin.css', script='admin.js',
                       modules=['config.js', 'menu.js', 'art.js', 'cart.js', 'orders.js', 'util.js', 'supabase.js', 'menu-editor.js', 'admin.js'],
                       replace={'href="index.html"': 'href="catalogo.html"'}),   # el enlace "Ver el catálogo"
}

def bundle(files):
    parts = []
    for f in files:
        t = (SRC / f).read_text(encoding='utf-8')
        t = re.sub(r'^import .*?;\n', '', t, flags=re.M)
        t = re.sub(r'^export (const|function) ', r'\1 ', t, flags=re.M)
        assert not re.search(r'^(import|export) ', t, flags=re.M), f'quedó un import/export en {f}'
        parts.append(f'// ---- {f} ----\n{t}')
    return '\n'.join(parts)

def inline_images(html):
    def sub(m):
        data = base64.b64encode((SRC / m.group(1)).read_bytes()).decode()
        return f'data:image/png;base64,{data}'
    return re.sub(r'(assets/[\w-]+\.png)', sub, html)

DIST.mkdir(exist_ok=True)
for name, p in PAGES.items():
    html = (SRC / p['html']).read_text(encoding='utf-8')
    css_tag = f'<link rel="stylesheet" href="{p["css"]}">'
    js_tag = f'<script type="module" src="{p["script"]}"></script>'
    assert css_tag in html and js_tag in html, name
    js = bundle(p['modules'])
    for a, b in p['replace'].items():
        js = js.replace(a, b)
        html = html.replace(a, b)
    html = html.replace(css_tag, f'<style>\n{(SRC / p["css"]).read_text(encoding="utf-8")}\n</style>')
    html = html.replace(js_tag, f'<script type="module">\n{js}\n</script>')
    html = inline_images(html)
    (DIST / name).write_text(html, encoding='utf-8')
    print(f'{name}: {len(html) / 1024:.0f} KB')
