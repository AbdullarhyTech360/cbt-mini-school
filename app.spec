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
        ('public_key.pem', '.'),
    ],
    hiddenimports=[
        'jinja2.ext',
        'flask.scaffold',
        'werkzeug.serving',
        'cryptography.hazmat.bindings._openssl',
        'cryptography.hazmat.primitives.ciphers.aes',
        'cryptography.hazmat.primitives.hashes',
        'cryptography.hazmat.primitives.asymmetric.padding',
        'cryptography.hazmat.primitives.serialization',
        'cryptography.exceptions',
        'fakeredis',
        'redis',
        'celery',
        'weasyprint',
        'pypdf',
        'docx',
        'xhtml2pdf',
        'utils.paths',
        'utils.machine_id',
        'utils.license_manager',
        'utils.license_display',
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
    icon='static/favicon.ico',
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
