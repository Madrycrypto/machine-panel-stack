# -*- mode: python ; coding: utf-8 -*-

ctk_path = '/Users/maciejmostowski/Documents/machine-panel-stack/machine_panel_2/venv2/lib/python3.14/site-packages/customtkinter'

a = Analysis(
    ['main.py'],
    pathex=[],
    binaries=[],
    datas=[
        (ctk_path, 'customtkinter'),
        ('config.ini', '.'),
        ('failures.json', '.'),
    ],
    hiddenimports=['customtkinter', 'darkdetect', 'requests', 'PIL'],
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
    name='Panel_Maszyny',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
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
    name='Panel_Maszyny',
)
app = BUNDLE(
    coll,
    name='Panel_Maszyny.app',
    icon=None,
    bundle_identifier='com.maciej.panelmaszyny',
)
