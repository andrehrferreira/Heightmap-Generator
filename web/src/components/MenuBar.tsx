import React, { useState, useRef, useEffect } from 'react';
import { useProject } from '../hooks/useProject';
import { useExport } from '../hooks/useExport';
import { useGenerator } from '../context/GeneratorContext';

interface MenuItem {
  label: string;
  shortcut?: string;
  onClick?: () => void;
  disabled?: boolean;
  separator?: boolean;
}

interface Menu {
  label: string;
  items: MenuItem[];
}

interface MenuDropdownProps {
  menu: Menu;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onHover: () => void;
  anyOpen: boolean;
}

const MenuDropdown: React.FC<MenuDropdownProps> = ({
  menu,
  isOpen,
  onOpen,
  onClose,
  onHover,
  anyOpen,
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        className={`px-3 py-1 text-[13px] rounded-sm transition-colors ${
          isOpen
            ? 'bg-neutral-700 text-white'
            : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
        }`}
        onClick={() => (isOpen ? onClose() : onOpen())}
        onMouseEnter={() => anyOpen && onHover()}
      >
        {menu.label}
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-0.5 min-w-[200px] bg-neutral-800 border border-neutral-700 rounded-md shadow-xl z-50 py-1">
          {menu.items.map((item, index) =>
            item.separator ? (
              <div key={index} className="h-px bg-neutral-700 my-1" />
            ) : (
              <button
                key={index}
                className={`w-full flex items-center justify-between px-3 py-1.5 text-[13px] text-left transition-colors ${
                  item.disabled
                    ? 'text-neutral-600 cursor-not-allowed'
                    : 'text-neutral-300 hover:bg-neutral-700 hover:text-white'
                }`}
                onClick={() => {
                  if (!item.disabled && item.onClick) {
                    item.onClick();
                    onClose();
                  }
                }}
                disabled={item.disabled}
              >
                <span>{item.label}</span>
                {item.shortcut && (
                  <span className="text-[11px] text-neutral-500 ml-4">{item.shortcut}</span>
                )}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
};

export const MenuBar: React.FC = () => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const { saveProject, loadProject } = useProject();
  const { exportHeightmapPNG, exportLayersPNG, exportMetadata } = useExport();
  const { generate, viewMode, setViewMode } = useGenerator();

  const menus: Menu[] = [
    {
      label: 'File',
      items: [
        { label: 'New Project', shortcut: 'Ctrl+N', onClick: () => window.location.reload() },
        { label: 'Open Project...', shortcut: 'Ctrl+O', onClick: loadProject },
        { label: 'Save Project', shortcut: 'Ctrl+S', onClick: saveProject },
        { separator: true },
        { label: 'Export Heightmap PNG', onClick: exportHeightmapPNG },
        { label: 'Export Layers PNG', onClick: exportLayersPNG },
        { label: 'Export Metadata JSON', onClick: exportMetadata },
        { separator: true },
        { label: 'Exit', onClick: () => window.close(), disabled: true },
      ],
    },
    {
      label: 'Edit',
      items: [
        { label: 'Undo', shortcut: 'Ctrl+Z', disabled: true },
        { label: 'Redo', shortcut: 'Ctrl+Y', disabled: true },
        { separator: true },
        { label: 'Clear All', onClick: () => window.location.reload() },
      ],
    },
    {
      label: 'View',
      items: [
        { 
          label: '3D Preview', 
          shortcut: '1', 
          onClick: () => setViewMode('3d'),
        },
        { 
          label: 'Heightmap', 
          shortcut: '2', 
          onClick: () => setViewMode('2d'),
        },
        { 
          label: 'Layers', 
          shortcut: '3', 
          onClick: () => setViewMode('layers'),
        },
        { separator: true },
        { label: 'Reset Camera', shortcut: 'R', disabled: true },
        { label: 'Zoom In', shortcut: 'Ctrl++', disabled: true },
        { label: 'Zoom Out', shortcut: 'Ctrl+-', disabled: true },
      ],
    },
    {
      label: 'Generate',
      items: [
        { label: 'Generate Heightmap', shortcut: 'F5', onClick: generate },
        { separator: true },
        { label: 'Regenerate with Same Seed', disabled: true },
        { label: 'Generate Random Seed', disabled: true },
      ],
    },
    {
      label: 'Help',
      items: [
        { label: 'Documentation', onClick: () => window.open('/docs', '_blank'), disabled: true },
        { label: 'Keyboard Shortcuts', shortcut: 'Ctrl+K Ctrl+S', disabled: true },
        { separator: true },
        { label: 'About Heightmap Generator', disabled: true },
      ],
    },
  ];

  return (
    <div className="flex items-center h-8 bg-neutral-900 border-b border-neutral-800 px-2 select-none">
      {/* App icon and title */}
      <div className="flex items-center gap-2 mr-4">
        <div className="flex items-center justify-center w-5 h-5">
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-neutral-400" fill="currentColor">
            <path d="M3 3h18v18H3V3zm2 2v14h14V5H5zm2 2h10v2H7V7zm0 4h10v2H7v-2zm0 4h6v2H7v-2z" />
          </svg>
        </div>
      </div>

      {/* Menus */}
      <div className="flex items-center gap-0.5">
        {menus.map((menu) => (
          <MenuDropdown
            key={menu.label}
            menu={menu}
            isOpen={openMenu === menu.label}
            onOpen={() => setOpenMenu(menu.label)}
            onClose={() => setOpenMenu(null)}
            onHover={() => setOpenMenu(menu.label)}
            anyOpen={openMenu !== null}
          />
        ))}
      </div>

      {/* Spacer and title */}
      <div className="flex-1 flex items-center justify-center">
        <span className="text-[13px] text-neutral-500">Heightmap Generator</span>
      </div>

      {/* Window controls placeholder (for Electron - hidden in web) */}
      {typeof window !== 'undefined' && (window as any).electron && (
        <div className="flex items-center gap-1 ml-2 -webkit-app-region-no-drag">
          <button className="w-11 h-8 flex items-center justify-center hover:bg-neutral-800 transition-colors">
            <svg className="w-4 h-4 text-neutral-400" viewBox="0 0 16 16" fill="currentColor">
              <path d="M14 8v1H3V8h11z" />
            </svg>
          </button>
          <button className="w-11 h-8 flex items-center justify-center hover:bg-neutral-800 transition-colors">
            <svg className="w-4 h-4 text-neutral-400" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3 3v10h10V3H3zm9 9H4V4h8v8z" />
            </svg>
          </button>
          <button className="w-11 h-8 flex items-center justify-center hover:bg-red-600 transition-colors">
            <svg className="w-4 h-4 text-neutral-400" viewBox="0 0 16 16" fill="currentColor">
              <path d="M7.116 8l-4.558 4.558.884.884L8 8.884l4.558 4.558.884-.884L8.884 8l4.558-4.558-.884-.884L8 7.116 3.442 2.558l-.884.884L7.116 8z" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

