# -*- mode: python ; coding: utf-8 -*-
# PyInstaller spec for machine_server (FastAPI + uvicorn)

import os

HERE = '/Users/maciejmostowski/Documents/machine-panel-stack/machine_server'
STATIC_DIR = os.path.join(HERE, 'static')

a = Analysis(
    [os.path.join(HERE, 'main.py')],
    pathex=[HERE],
    binaries=[],
    datas=[
        # Include all static web files (dashboard, PWA panels)
        (STATIC_DIR, 'static'),
        # Config file
        (os.path.join(HERE, 'config.ini'), '.'),
        # .env file (contains webhooks + API keys)
        (os.path.join(HERE, '.env'), '.'),
    ],
    hiddenimports=[
        'uvicorn',
        'uvicorn.logging',
        'uvicorn.loops',
        'uvicorn.loops.auto',
        'uvicorn.protocols',
        'uvicorn.protocols.http',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.websockets',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.lifespan',
        'uvicorn.lifespan.on',
        'uvicorn.main',
        'fastapi',
        'starlette',
        'starlette.staticfiles',
        'starlette.middleware.cors',
        'sqlalchemy',
        'sqlalchemy.dialects.sqlite',
        'sqlalchemy.orm',
        'pydantic',
        'requests',
        'pytz',
        'dotenv',
        'google.genai',
        'pandas',
        'email.mime.text',
        'email.mime.multipart',
        # local modules
        'models',
        'database',
        'wechat_service',
        'generate_report',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='Serwer_Maszyn',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,   # Console window - shows server logs
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='Serwer_Maszyn',
)
app = BUNDLE(
    coll,
    name='Serwer_Maszyn.app',
    icon=None,
    bundle_identifier='com.maciej.serwermaszyn',
)
