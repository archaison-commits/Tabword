# Tabword

**Terminal-style word completion for Visual Studio Code.**

Tabword completes words using matches already present in the active file. It keeps the first stage quiet and opens VS Code’s compact editor suggestion list directly beside your cursor.

<p align="center">
  <img src="images/tabword-icon.png" alt="Tabword icon" width="112">
</p>

## Why Tabword?

In a terminal, you can often type the beginning of a word and press `Tab` to complete it. Tabword brings a similar workflow to the VS Code editor, with a common-prefix step followed by an optional choice list.

For example, if your file contains:

```python
variable_1 = 10
variable_2 = 20
variable_3 = 30
```

and you type `varia` elsewhere in the same file:

1. Press `Tab`. Tabword expands the text to the longest common prefix: `variable_`.
2. Press `Tab` again. Tabword opens a compact suggestion list beside the cursor with up to five matches.
3. Use the Up/Down arrows to navigate the suggestions.
4. Press `Enter` or `Tab` to accept the highlighted suggestion, or click one.

## Features

- **Two-stage completion:** first complete the longest common prefix; press `Tab` again to see choices.
- **Current-file matching:** only words in the active document are considered.
- **Compact, cursor-local suggestions:** VS Code displays up to five choices in its native editor suggestion widget, next to the cursor.
- **Simple selection:** use Up/Down, Enter, Tab, or the mouse to choose a suggestion.
- **Easy dismissal:** Escape closes the suggestion list without changing the current prefix.
- **Space to continue typing:** Space closes the picker and inserts a normal space.
- **Reverse completion:** `Shift + Tab` cycles backward through matching words.
- **Indentation-friendly:** when Tabword has no matching completion, VS Code keeps its normal Tab and Shift+Tab behavior.
- **No external runtime for users:** installing the VSIX does not require Node.js, npm, Python, or manual `settings.json` changes.

## Install

### Install from a VSIX file

1. Download `tabword-0.2.4.vsix`.
2. Open **Visual Studio Code**.
3. Open the Command Palette with `Ctrl + Shift + P` (`Cmd + Shift + P` on macOS).
4. Run **Extensions: Install from VSIX...**.
5. Select the downloaded `tabword-0.2.4.vsix` file.
6. Reload VS Code if prompted.

The VSIX is the installable extension package. End users do not need to extract it, run npm, or compile anything.

### Marketplace

Marketplace availability depends on publication of this release. If the release is not listed there yet, install it using the VSIX instructions above.

## How to use it

1. Open a file in VS Code.
2. Make sure the file contains one or more longer words you want to reuse.
3. Type the beginning of one of those words elsewhere in the same file.
4. Press `Tab` to expand to the common prefix shared by the matches.
5. Press `Tab` again to open the suggestion picker.
6. Use the Up/Down arrows to navigate, then press `Enter` or `Tab`, or click a suggestion.
7. Press `Escape` to keep the current prefix, or press `Space` to insert a space and continue typing.

### Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Tab` | Complete the common prefix; on the next press, open suggestions |
| `Up` / `Down` | Navigate the suggestion list |
| `Enter` / `Tab` | Accept the highlighted suggestion |
| `Escape` | Close suggestions without changing the prefix |
| `Space` | Close suggestions and insert a space |
| `Shift + Tab` | Cycle backward through matching words |

Tabword only takes over Tab and Shift+Tab while a matching completion is available. Otherwise, the editor's normal indentation behavior remains in effect.

## What Tabword searches

Tabword searches the **active document only**. It does not search other open files, folders, or the entire workspace.

It recognizes identifier-style words made from:

- Letters (`a-z`, `A-Z`)
- Numbers (`0-9`)
- Underscores (`_`)
- Dollar signs (`$`)

Tabword is a lightweight word matcher, not a language parser. Matches may therefore come from comments, strings, or code.

## Settings and configuration

No configuration is required. Tabword does not change your indentation or formatting settings.

If you have customized keyboard shortcuts, another extension may take priority. Open **File → Preferences → Keyboard Shortcuts** (or press `Ctrl + K`, then `Ctrl + S`) and search for:

- `Tabword: Complete Next`
- `Tabword: Complete Previous`

## Troubleshooting

### Tab inserts indentation instead of completing a word

Tabword only intercepts `Tab` when it finds a longer matching word in the current document. Check that:

- The word already appears elsewhere in the same file.
- Your cursor is immediately after the partial word.
- The match starts with exactly the text you've typed.
- No custom keybinding or another extension is overriding Tabword.

### The suggestion picker does not open

The compact suggestion list opens on the **second** `Tab` press, after the first press has expanded the common prefix. If the first press already completed a single matching word, there may be no further choices to display.

### Shift + Tab no longer outdents

When a matching completion is available, `Shift + Tab` cycles backward through matches. When there is no active match, VS Code should handle it normally. If another keybinding has overridden it, inspect the Keyboard Shortcuts editor.

### The extension does not appear after installation

- Open the Extensions view (`Ctrl + Shift + X`).
- Search for **Tabword**.
- If it is not listed, run **Extensions: Install from VSIX...** again and select the `.vsix` package.
- Reload VS Code.

## Privacy

Tabword works locally in the VS Code editor. It does not send document contents to a server or require an account.

## For contributors

The source project is written in TypeScript and uses the VS Code Extension API. To build from source, contributors need Node.js and npm:

```bash
npm install
npm run compile
```

To create an installable VSIX package:

```bash
npm run package
```

These development tools are **not** required by people installing the packaged extension.

## License

MIT. See [LICENSE](LICENSE).


