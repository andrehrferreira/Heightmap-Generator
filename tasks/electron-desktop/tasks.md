# Electron Desktop - Tasks

## Phase 1: Setup & Configuration
- [ ] 1.1 Install Electron and electron-builder dependencies
- [ ] 1.2 Create electron/ directory structure
- [ ] 1.3 Configure electron-builder.json for multi-platform builds
- [ ] 1.4 Update package.json with Electron scripts
- [ ] 1.5 Configure Vite for Electron main/preload bundling

## Phase 2: Main Process
- [ ] 2.1 Create main.ts with window management
- [ ] 2.2 Implement custom frameless window
- [ ] 2.3 Create preload.ts with IPC bridge
- [ ] 2.4 Implement native menu integration
- [ ] 2.5 Add window state persistence (size, position)

## Phase 3: IPC Handlers
- [ ] 3.1 Implement file open/save dialogs
- [ ] 3.2 Implement direct file system read/write
- [ ] 3.3 Implement export to disk handlers
- [ ] 3.4 Add recent files tracking
- [ ] 3.5 Implement app settings persistence

## Phase 4: UI Integration
- [ ] 4.1 Update MenuBar for Electron window controls
- [ ] 4.2 Add platform detection utilities
- [ ] 4.3 Implement native context menus
- [ ] 4.4 Add drag-and-drop file support
- [ ] 4.5 Update keyboard shortcuts for desktop

## Phase 5: Build & Distribution
- [ ] 5.1 Configure Windows build (NSIS installer, portable)
- [ ] 5.2 Configure macOS build (DMG, app signing)
- [ ] 5.3 Configure Linux build (AppImage, deb)
- [ ] 5.4 Setup auto-update mechanism
- [ ] 5.5 Create release workflow (GitHub Actions)

## Phase 6: Testing & Polish
- [ ] 6.1 Test on Windows 10/11
- [ ] 6.2 Test on macOS (Intel + Apple Silicon)
- [ ] 6.3 Test on Ubuntu/Debian
- [ ] 6.4 Performance optimization
- [ ] 6.5 Final documentation update

