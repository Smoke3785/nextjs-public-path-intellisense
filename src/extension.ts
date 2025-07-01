import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

// Configurable options
const ADD_COMPLETION_SUFFIX = false;

function nextConfigExists(root: string): boolean {
  return [
    "next.config.js",
    "next.config.mjs",
    "next.config.ts",
    "next.config.mts",
    "next.config.cjs",
  ].some((name) => fs.existsSync(path.join(root, name)));
}

function publicFolderExists(root: string): boolean {
  return fs.existsSync(path.join(root, "public"));
}

function getNextRoot(folders?: vscode.WorkspaceFolder[]): string | null {
  if (!folders) return null;
  const root = folders[0].uri.fsPath;

  if (!publicFolderExists(root)) return null;
  if (!nextConfigExists(root)) return null;

  return root;
}

/**
 * Grab everything from the last '<' (that doesn't have a matching '>' yet)
 * up to the cursor position, across multiple lines.
 */
function getTagPrefix(
  document: vscode.TextDocument,
  position: vscode.Position
): string {
  let { line } = position;
  let char = position.character;
  let accumulated = "";
  let foundOpen = false;

  while (line >= 0 && !foundOpen) {
    const textLine = document.lineAt(line).text;
    const sliceEnd = line === position.line ? char : textLine.length;
    const sub = textLine.slice(0, sliceEnd);
    const lastOpen = sub.lastIndexOf("<");

    if (lastOpen !== -1) {
      // we found the start of the tag
      accumulated = sub.slice(lastOpen) + accumulated;
      foundOpen = true;
    } else {
      // prepend this entire line (plus newline) and keep going up
      accumulated = sub + "\n" + accumulated;
      line--;
    }
  }

  return accumulated;
}

/**
 * Loosened regex to match higher order components which ultimately resolve to
 * dom components like <Image> or <video> with a src attribute.
 * TODO: Make this configurable?
 */
const REGEX_PATTERNS = {
  STRICT: /<\s*(?:Image|img|video|source)\b[^>]*\bsrc\s*=\s*["']([^"']*)$/,
  LOOSE: /<\s*[A-Za-z][A-Za-z0-9]*\b[^>]*\bsrc\s*=\s*['\"]([^'\"]*)$/,
};

function getSelectedRegex() {
  // This will be configurable in the future, but is hardcoded for now
  return REGEX_PATTERNS.LOOSE;
}

function providerFactory(
  publicDir: string,
  TAG_REGEX: RegExp
): vscode.Disposable {
  return vscode.languages.registerCompletionItemProvider(
    [
      { language: "javascriptreact", scheme: "file" },
      { language: "typescriptreact", scheme: "file" },
    ],
    {
      provideCompletionItems: (document, position) => {
        const linePrefix = getTagPrefix(document, position);

        const match = linePrefix.match(TAG_REGEX);
        if (!match) return;

        const currentPath = match[1];
        if (!currentPath.startsWith("/")) return;

        // Compute directory relative to public
        const parts = currentPath.slice(1).split("/");
        const dir = path.join(publicDir, ...parts.slice(0, -1));
        if (!fs.existsSync(dir)) return;

        const entries = fs.readdirSync(dir);
        const items = entries.map((name) => {
          const full = path.join(dir, name);
          const isDir = fs.statSync(full).isDirectory();

          const completionName = isDir ? name + "/" : name;
          const completionType = isDir
            ? vscode.CompletionItemKind.Folder
            : vscode.CompletionItemKind.File;

          const item = new vscode.CompletionItem(
            completionName,
            completionType
          );

          // If a directory is selected, add a trailing slash then trigger the next suggestions.
          if (isDir) {
            item.insertText = name + "/";
            item.command = {
              command: "editor.action.triggerSuggest",
              title: "Re-trigger suggestions",
            };
          } else {
            item.insertText = name;
          }

          return item;
        });

        return items;
      },
    },
    "/"
  );
}

export function activate(context: vscode.ExtensionContext) {
  const root = getNextRoot(vscode.workspace.workspaceFolders);
  if (!root) return;

  const publicDir = path.join(root, "public");

  const selectedRegex = getSelectedRegex();
  const provider = providerFactory(publicDir, selectedRegex);

  context.subscriptions.push(provider);
}

export function deactivate() {}
