## 0.3.0 - 2026-11-25

### Added
- Python member-completion trigger: pressing `Tab` immediately after a dotted identifier chain (for example, `math.` or `player.`) invokes VS Code's completion providers.
- Delegates Python member discovery to the installed Python language tooling (such as Pylance), preserving semantic completion instead of guessing members from document text.

### Compatibility
- Existing two-stage current-document word completion, reverse cycling, and compact suggestion behavior remain in place.
- Member completion is currently enabled only for Python documents; other languages are intentionally deferred until their provider behavior is tested.
- No number-key shortcuts, global keyboard listeners, or user-settings changes were introduced.

## 0.2.4 - 2026-11-25

### Fixed
- Corrected the VSIX runtime file layout: the extension entry point is now packaged at `extension/out/extension.js`, matching `main: ./out/extension.js`.
- Kept number-key selection removed; no numeric shortcuts or handlers are included.

### Kept
- Compact, cursor-local suggestion widget with up to five results.
- First-Tab common-prefix expansion and second-Tab suggestions.
- Arrow-key navigation, Enter/Tab acceptance, mouse selection, Escape dismissal, and Shift+Tab reverse completion.

## 0.2.3 - 2026-11-25

### Removed
- Removed number-key and numeric-keypad suggestion selection, including all related commands and keybindings.
- Number keys now retain their normal VS Code typing behavior while suggestions are visible.

### Kept
- Compact, cursor-local suggestion widget with up to five results.
- Arrow-key navigation, Enter/Tab acceptance, mouse selection, Escape dismissal, and Shift+Tab reverse completion.

## 0.2.2 - 2026-11-25

### Fixed
- Number keys 1-5 now accept the matching visible suggestion directly, without relying on the suggest widget's internal selection commands.
- Number shortcuts are active whenever Tabword's suggestion session is open, rather than depending on the widget visibility context key.
- Added support for numeric keypad keys 1-5.

## 0.2.1 - 2026-11-25

### Added
- Number-key selection: press 1–5 to accept the corresponding visible suggestion.
- Tab accepts the highlighted suggestion while the Tabword suggestion list is open.

### Changed
- Replaced the centered QuickPick with VS Code's native editor suggestion widget, anchored beside the cursor and limited to five results.
- Escape dismisses the suggestion list while preserving the current prefix.

# Changelog

## 0.2.0 - 2026-11-25

### Added
- Two-stage completion: the first `Tab` expands the typed text to the longest common prefix shared by matching words.
- A native VS Code QuickPick opens on the next `Tab` to show up to five matching completions.
- Use the arrow keys or mouse to choose a suggestion, then press `Enter` to accept it.
- Press `Escape` to dismiss suggestions without changing the completed prefix.
- Press `Space` while the picker is open to dismiss it and insert a space.
- Added validation for cursor line and character positions before accessing document lines.

### Changed
- Updated the README and installation instructions for the two-stage workflow.
- Retained `Shift + Tab` reverse cycling and normal editor indentation when Tabword has no active completion.
- Updated VSIX packaging exclusions so TypeScript source and development files are not included in the installable package.

## 0.1.2
- Quiet, current-document word completion.
- Tab to cycle forward and Shift+Tab to cycle backward.
- Preserve normal editor indentation when no completion is available.

## 0.1.1
- Prepare the extension for easier VSIX installation and Marketplace publishing.
- Improve setup, usage, shortcut, and troubleshooting documentation.
- Include a license and extension icon.

## 0.1.0
- Initial release.
- Complete words using matches from the current document.
- Use Tab to cycle forward and Shift+Tab to cycle backward.
- No suggestion popup.
