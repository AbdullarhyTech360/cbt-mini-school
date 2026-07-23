# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec file for CBT Mini School Flask application.
Includes all Python packages and static assets needed for a portable bundle.
"""

a = Analysis(
    ['app.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('templates', 'templates'),
        ('static', 'static'),
        ('models', 'models'),
        ('routes', 'routes'),
        ('services', 'services'),
        ('utils', 'utils'),
        ('scripts', 'scripts'),
        ('migrations', 'migrations'),
    ],
    hiddenimports=[
        'jinja2.ext',
        'flask.scaffold',
        'werkzeug.serving',
        'cryptography.hazmat.bindings._openssl',
        'cryptography.hazmat.primitives.ciphers.aes',
        'fakeredis',
        'redis',
        'celery',
        'weasyprint',
        'pypdf',
        'docx',
        'xhtml2pdf',
        'utils.paths',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure, a.zipped_data)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='app',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
