import * as vscode from "vscode";

interface CompletionSession {
    documentUri: string;
    line: number;
    startCharacter: number;
    prefix: string;
    candidates: string[];
    candidateIndex: number;
    documentVersion: number;
}

let session: CompletionSession | undefined;

const CONTEXT_KEY = "tabword.canComplete";

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

    context.subscriptions.push(
        next,
        previous,
        vscode.window.onDidChangeActiveTextEditor(() => {
            session = undefined;
            void refreshContext();
        }),
        vscode.window.onDidChangeTextEditorSelection(() => {
            void refreshContext();
        }),
        vscode.workspace.onDidChangeTextDocument(() => {
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
        return;
    }

    const position = editor.selection.active;
    const lineText = editor.document.lineAt(position.line).text;
    const beforeCursor = lineText.slice(0, position.character);
    const match = beforeCursor.match(/[A-Za-z_$][A-Za-z0-9_$]*$/);

    if (!match || !match[0]) {
        session = undefined;
        await setCanComplete(false);
        return;
    }

    const prefix = match[0];
    const startCharacter = position.character - prefix.length;
    const existingSession = sessionMatches(
        editor.document,
        position,
        startCharacter,
        prefix
    );

    let candidates: string[];
    let nextIndex: number;

    if (existingSession && session) {
        candidates = session.candidates;
        nextIndex =
            (session.candidateIndex + direction + candidates.length) %
            candidates.length;
    } else {
        candidates = findCandidates(editor.document, prefix);
        if (candidates.length === 0) {
            session = undefined;
            await setCanComplete(false);
            return;
        }

        nextIndex = direction === 1 ? 0 : candidates.length - 1;
    }

    const replacement = candidates[nextIndex];
    const range = new vscode.Range(
        position.line,
        startCharacter,
        position.line,
        position.character
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
        position.line,
        startCharacter + replacement.length
    );
    editor.selection = new vscode.Selection(newPosition, newPosition);

    session = {
        documentUri: editor.document.uri.toString(),
        line: position.line,
        startCharacter,
        prefix: replacement,
        candidates,
        candidateIndex: nextIndex,
        documentVersion: editor.document.version
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

        // Only expand to a longer word that begins with what the user typed.
        if (word.length > prefix.length && word.startsWith(prefix)) {
            found.add(word);
        }
    }

    return Array.from(found);
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

    if (
        session.documentUri !== document.uri.toString() ||
        session.line !== position.line ||
        session.startCharacter !== startCharacter ||
        session.prefix !== currentPrefix ||
        session.documentVersion !== document.version
    ) {
        return false;
    }

    return true;
}

async function refreshContext(): Promise<void> {
    const editor = vscode.window.activeTextEditor;

    if (!editor || !editor.selection.isEmpty) {
        session = undefined;
        await setCanComplete(false);
        return;
    }

    const position = editor.selection.active;
    const lineText = editor.document.lineAt(position.line).text;
    const beforeCursor = lineText.slice(0, position.character);
    const match = beforeCursor.match(/[A-Za-z_$][A-Za-z0-9_$]*$/);

    if (!match || !match[0]) {
        session = undefined;
        await setCanComplete(false);
        return;
    }

    const prefix = match[0];
    const startCharacter = position.character - prefix.length;

    if (sessionMatches(editor.document, position, startCharacter, prefix)) {
        await setCanComplete(true);
        return;
    }

    session = undefined;
    const candidates = findCandidates(editor.document, prefix);
    await setCanComplete(candidates.length > 0);
}

async function setCanComplete(value: boolean): Promise<void> {
    await vscode.commands.executeCommand("setContext", CONTEXT_KEY, value);
}
