/**
 * @fileoverview Modal component displaying all keyboard shortcuts for the extension.
 */

interface KeyboardShortcutsModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
}

interface Shortcut {
  keys: string[];
  description: string;
  category: string;
}

function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  if (!isOpen) return null;

  // Detect platform for correct key display
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modifierKey = isMac ? 'Option' : 'Alt';

  const shortcuts: Shortcut[] = [
    {
      keys: [`${modifierKey}+P`],
      description: 'Open extension popup',
      category: 'Navigation'
    },
    {
      keys: [`${modifierKey}+D`],
      description: 'Toggle drawing mode',
      category: 'Actions'
    },
    {
      keys: [`${modifierKey}+S`],
      description: 'Toggle sidebar',
      category: 'Navigation'
    },
    {
      keys: [`${modifierKey}+A`],
      description: 'Open annotations tab',
      category: 'Navigation'
    },
    {
      keys: ['Shift+?'],
      description: 'Show keyboard shortcuts',
      category: 'Help'
    },
    {
      keys: ['Ctrl+Z', 'Cmd+Z'],
      description: 'Undo (in drawing mode)',
      category: 'Drawing'
    },
    {
      keys: ['Ctrl+Y', 'Cmd+Shift+Z'],
      description: 'Redo (in drawing mode)',
      category: 'Drawing'
    },
    {
      keys: ['Escape'],
      description: 'Close modal or exit drawing mode',
      category: 'Navigation'
    }
  ];

  const categories = ['Navigation', 'Actions', 'Drawing', 'Help'];
  const shortcutsByCategory = categories.map(category => ({
    category,
    shortcuts: shortcuts.filter(s => s.category === category)
  }));

  const formatKey = (key: string) => {
    if (isMac) {
      return key
        .replace('Ctrl', '⌃')
        .replace('Cmd', '⌘')
        .replace('Shift', '⇧')
        .replace('Alt', '⌥')
        .replace('Option', '⌥');
    }
    return key;
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
    >
      <div
        className="bg-[#1F1F1F] border border-[#3F3F3F] rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 id="shortcuts-title" className="text-2xl font-bold text-white">
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Close keyboard shortcuts"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Shortcuts by Category */}
        <div className="space-y-6">
          {shortcutsByCategory.map(({ category, shortcuts: categoryShortcuts }) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wide">
                {category}
              </h3>
              <div className="space-y-2">
                {categoryShortcuts.map((shortcut, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-2 border-b border-[#2F2F2F] last:border-0"
                  >
                    <span className="text-white text-sm">{shortcut.description}</span>
                    <div className="flex items-center gap-2">
                      {shortcut.keys.map((key, keyIdx) => (
                        <div key={keyIdx} className="flex items-center gap-1">
                          {key.split('+').map((k, kIdx) => (
                            <kbd
                              key={kIdx}
                              className="px-2 py-1 bg-[#2A2A2A] border border-[#3F3F3F] rounded text-xs font-mono text-gray-300"
                            >
                              {formatKey(k.trim())}
                            </kbd>
                          ))}
                          {keyIdx < shortcut.keys.length - 1 && (
                            <span className="text-gray-500 text-xs mx-1">or</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-[#2F2F2F]">
          <p className="text-xs text-gray-500 text-center">
            Press <kbd className="px-2 py-1 bg-[#2A2A2A] border border-[#3F3F3F] rounded text-xs font-mono">Escape</kbd> or click outside to close
          </p>
        </div>
      </div>
    </div>
  );
}

export default KeyboardShortcutsModal;
