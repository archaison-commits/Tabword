import * as vscode from "vscode";

type CompletionStage = "prefix" | "cycling" | "suggesting";

interface CompletionSession {
    documentUri: string;
    line: number;
    startCharacter: number;
    prefix: string;
    candidates: string[];
    candidateIndex: number;
    documentVersion: number;
    stage: CompletionStage;
}

let session: CompletionSession | undefined;

const CONTEXT_KEY = "tabword.canComplete";
const SUGGESTIONS_CONTEXT_KEY = "tabword.suggestionsVisible";
const MAX_SUGGESTIONS = 5;

export function activate(context: vscode.ExtensionContext): void {
    const next = vscode.commands.registerCommand("tabword.expand", async () => {
        await complete(1);
    });

    const previous = vscode.commands.registerCommand(
        "tabword.expandPrevious",
        async () => {
            await complete(-1);
        }
    );

    const dismissSuggestions = vscode.commands.registerCommand(
        "tabword.dismissSuggestions",
        async () => {
            if (session?.stage === "suggesting") {
                session.stage = "prefix";
            }
            await setSuggestionsVisible(false);
            await vscode.commands.executeCommand("hideSuggestWidget");
        }
    );

    const completionProvider = vscode.languages.registerCompletionItemProvider(
        [{ scheme: "file" }, { scheme: "untitled" }],
        {
            provideCompletionItems(document, position) {
                if (
                    !session ||
                    session.stage !== "suggesting" ||
                    document.uri.toString() !== session.documentUri ||
                    position.line !== session.line ||
                    position.character !==
                        session.startCharacter + session.prefix.length
                ) {
                    return undefined;
                }

                const editor = vscode.window.activeTextEditor;
                if (
                    !editor ||
                    editor.document !== document ||
                    !sessionIsStillValid(editor, session, session.documentVersion)
                ) {
                    return undefined;
                }

                const range = new vscode.Range(
                    session.line,
                    session.startCharacter,
                    session.line,
                    session.startCharacter + session.prefix.length
                );

                return session.candidates
                    .slice(0, MAX_SUGGESTIONS)
                    .map((candidate, index) => {
                        const item = new vscode.CompletionItem(
                            candidate,
                            vscode.CompletionItemKind.Text
                        );
                        item.insertText = candidate;
                        item.range = range;
                        item.filterText = candidate;
                        item.sortText = String(index).padStart(3, "0");
                        return item;
                    });
            }
        }
    );

    context.subscriptions.push(
        next,
        previous,
        dismissSuggestions,
        completionProvider,
        vscode.window.onDidChangeActiveTextEditor(() => {
            session = undefined;
            void setSuggestionsVisible(false);
            void refreshContext();
        }),
        vscode.window.onDidChangeTextEditorSelection(() => {
            void refreshContext();
        }),
        vscode.workspace.onDidChangeTextDocument(() => {
            void setSuggestionsVisible(false);
            void refreshContext();
        })
    );

    void refreshContext();
}

export function deactivate(): void {
    session = undefined;
}

async function complete(direction: 1 | -1): Promise<void> {
    const editor = vscode.window.activeTextEditor;

    if (!editor || !editor.selection.isEmpty) {
        session = undefined;
        await setCanComplete(false);
        await setSuggestionsVisible(false);
        return;
    }

    const position = editor.selection.active;
    const prefixInfo = getPrefixAtCursor(editor.document, position);

    if (!prefixInfo) {
        session = undefined;
        await setCanComplete(false);
        await setSuggestionsVisible(false);
        return;
    }

    const { prefix, startCharacter } = prefixInfo;
    const existingSession = sessionMatches(
        editor.document,
        position,
        startCharacter,
        prefix
    );

    if (direction === -1) {
        const candidates =
            existingSession && session
                ? session.candidates
                : findCandidates(editor.document, prefix);

        if (candidates.length === 0) {
            session = undefined;
            await setCanComplete(false);
            return;
        }

        const currentIndex =
            existingSession && session ? session.candidateIndex : -1;
        const nextIndex =
            currentIndex < 0
                ? candidates.length - 1
                : (currentIndex - 1 + candidates.length) % candidates.length;

        await replacePrefix(
            editor,
            position.line,
            startCharacter,
            prefix,
            candidates[nextIndex],
            candidates,
            nextIndex,
            "cycling"
        );
        return;
    }

    if (existingSession && session?.stage === "prefix") {
        await showSuggestions(session);
        return;
    }

    if (existingSession && session?.stage === "suggesting") {
        await showSuggestions(session);
        return;
    }

    if (existingSession && session?.stage === "cycling") {
        const nextIndex =
            (session.candidateIndex + 1) % session.candidates.length;

        await replacePrefix(
            editor,
            position.line,
            startCharacter,
            prefix,
            session.candidates[nextIndex],
            session.candidates,
            nextIndex,
            "cycling"
        );
        return;
    }

    const candidates = findCandidates(editor.document, prefix);

    if (candidates.length === 0) {
        session = undefined;
        await setCanComplete(false);
        return;
    }

    const commonPrefix = findCommonPrefix(candidates);

    if (commonPrefix === prefix) {
        session = {
            documentUri: editor.document.uri.toString(),
            line: position.line,
            startCharacter,
            prefix,
            candidates,
            candidateIndex: -1,
            documentVersion: editor.document.version,
            stage: "prefix"
        };
        await setCanComplete(true);
        return;
    }

    await replacePrefix(
        editor,
        position.line,
        startCharacter,
        prefix,
        commonPrefix,
        candidates,
        -1,
        "prefix"
    );
}

function getPrefixAtCursor(
    document: vscode.TextDocument,
    position: vscode.Position
): { prefix: string; startCharacter: number } | undefined {
    if (position.line < 0 || position.line >= document.lineCount) {
        return undefined;
    }

    const lineText = document.lineAt(position.line).text;

    if (position.character < 0 || position.character > lineText.length) {
        return undefined;
    }

    const beforeCursor = lineText.slice(0, position.character);
    const match = beforeCursor.match(/[A-Za-z_$][A-Za-z0-9_$]*$/);

    if (!match || !match[0]) {
        return undefined;
    }

    return {
        prefix: match[0],
        startCharacter: position.character - match[0].length
    };
}

async function replacePrefix(
    editor: vscode.TextEditor,
    line: number,
    startCharacter: number,
    oldPrefix: string,
    replacement: string,
    candidates: string[],
    candidateIndex: number,
    stage: CompletionStage
): Promise<void> {
    if (line < 0 || line >= editor.document.lineCount) {
        session = undefined;
        await setCanComplete(false);
        return;
    }

    const range = new vscode.Range(
        line,
        startCharacter,
        line,
        startCharacter + oldPrefix.length
    );

    const didEdit = await editor.edit((builder) => {
        builder.replace(range, replacement);
    });

    if (!didEdit) {
        session = undefined;
        await setCanComplete(false);
        return;
    }

    const newPosition = new vscode.Position(
        line,
        startCharacter + replacement.length
    );
    editor.selection = new vscode.Selection(newPosition, newPosition);

    session = {
        documentUri: editor.document.uri.toString(),
        line,
        startCharacter,
        prefix: replacement,
        candidates,
        candidateIndex,
        documentVersion: editor.document.version,
        stage
    };

    await setCanComplete(true);
}

function findCandidates(
    document: vscode.TextDocument,
    prefix: string
): string[] {
    const text = document.getText();
    const wordPattern = /[A-Za-z_$][A-Za-z0-9_$]*/g;
    const found = new Set<string>();

    let match: RegExpExecArray | null;
    while ((match = wordPattern.exec(text)) !== null) {
        const word = match[0];

        if (word.length > prefix.length && word.startsWith(prefix)) {
            found.add(word);
        }
    }

    return Array.from(found);
}

function findCommonPrefix(candidates: string[]): string {
    if (candidates.length === 0) {
        return "";
    }

    let commonPrefix = candidates[0];

    for (const candidate of candidates.slice(1)) {
        while (!candidate.startsWith(commonPrefix)) {
            commonPrefix = commonPrefix.slice(0, -1);

            if (commonPrefix.length === 0) {
                return "";
            }
        }
    }

    return commonPrefix;
}

async function showSuggestions(
    currentSession: CompletionSession
): Promise<void> {
    currentSession.stage = "suggesting";
    await setSuggestionsVisible(true);
    await vscode.commands.executeCommand("editor.action.triggerSuggest");
}

function sessionIsStillValid(
    editor: vscode.TextEditor,
    currentSession: CompletionSession,
    expectedVersion: number
): boolean {
    if (
        vscode.window.activeTextEditor !== editor ||
        session !== currentSession ||
        editor.document.uri.toString() !== currentSession.documentUri ||
        editor.document.version !== expectedVersion ||
        currentSession.documentVersion !== expectedVersion ||
        currentSession.line < 0 ||
        currentSession.line >= editor.document.lineCount ||
        currentSession.startCharacter < 0 ||
        currentSession.startCharacter + currentSession.prefix.length >
            editor.document.lineAt(currentSession.line).text.length
    ) {
        return false;
    }

    const range = new vscode.Range(
        currentSession.line,
        currentSession.startCharacter,
        currentSession.line,
        currentSession.startCharacter + currentSession.prefix.length
    );

    return editor.document.getText(range) === currentSession.prefix;
}

function sessionMatches(
    document: vscode.TextDocument,
    position: vscode.Position,
    startCharacter: number,
    currentPrefix: string
): boolean {
    if (!session) {
        return false;
    }

    return (
        session.documentUri === document.uri.toString() &&
        session.line === position.line &&
        session.startCharacter === startCharacter &&
        session.prefix === currentPrefix &&
        session.documentVersion === document.version
    );
}

async function refreshContext(): Promise<void> {
    const editor = vscode.window.activeTextEditor;

    if (!editor || !editor.selection.isEmpty) {
        session = undefined;
        await setCanComplete(false);
        await setSuggestionsVisible(false);
        return;
    }

    const position = editor.selection.active;
    const prefixInfo = getPrefixAtCursor(editor.document, position);

    if (!prefixInfo) {
        session = undefined;
        await setCanComplete(false);
        await setSuggestionsVisible(false);
        return;
    }

    if (
        sessionMatches(
            editor.document,
            position,
            prefixInfo.startCharacter,
            prefixInfo.prefix
        )
    ) {
        await setCanComplete(true);
        return;
    }

    session = undefined;
    const candidates = findCandidates(editor.document, prefixInfo.prefix);
    await setCanComplete(candidates.length > 0);
    await setSuggestionsVisible(false);
}

async function setCanComplete(value: boolean): Promise<void> {
    await vscode.commands.executeCommand("setContext", CONTEXT_KEY, value);
}

async function setSuggestionsVisible(value: boolean): Promise<void> {
    await vscode.commands.executeCommand(
        "setContext",
        SUGGESTIONS_CONTEXT_KEY,
        value
    );
}
