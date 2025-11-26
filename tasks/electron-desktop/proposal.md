# Electron Desktop Application

## Why

The Heightmap Generator is currently a web-based application. Creating a desktop version using Electron provides several benefits:

1. **Offline Support**: Users can work without internet connection
2. **Native File System Access**: Direct file read/write operations without browser limitations
3. **Better Performance**: No browser overhead, direct hardware access for 3D rendering
4. **Native OS Integration**: System tray, file associations, native dialogs
5. **Distribution**: Can be packaged and distributed as a standalone application
6. **Professional UX**: Desktop apps feel more professional for tooling software

## What Changes

### Architecture

The application will be restructured to support both web and desktop builds:

```
├── electron/
│   ├── main.ts           # Electron main process
│   ├── preload.ts        # Preload script for IPC
│   └── ipc/              # IPC handlers
│       ├── file.ts       # File system operations
│       └── export.ts     # Export operations
├── web/src/              # Shared React UI (unchanged)
├── package.json          # Updated with Electron deps
└── electron-builder.json # Build configuration
```

### Features

1. **Native Title Bar**: Custom frameless window with VSCode-style menu bar
2. **File Operations**: Native open/save dialogs
3. **Export**: Direct export to disk without download prompts
4. **Auto-Updates**: Electron auto-updater integration
5. **Recent Files**: Track and display recently opened projects
6. **Keyboard Shortcuts**: Global shortcuts support

### Build Targets

- Windows (x64, arm64)
- macOS (x64, arm64, universal)
- Linux (AppImage, deb, rpm)

## Impact

- UI components designed to work in both web and desktop contexts
- IPC bridge for desktop-specific features
- Separate build scripts for web and desktop
- Documentation updates for desktop installation

## Technical Notes

- Uses `electron-builder` for packaging
- Shares the same React codebase with web version
- Main process handles file I/O and system integration
- Renderer process runs the React app
- Communication via IPC channels with typed interfaces

