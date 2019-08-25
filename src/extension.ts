import * as vscode from "vscode";
import WordList from "./WordList";

export function activate(context: vscode.ExtensionContext) {
  const wordList = new WordList(
    vscode.workspace.getConfiguration("autocompleteWords")
  );

  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(document => {
      wordList.updateWords(document);
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(document => {
      wordList.updateWords(document);
    })
  );

  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      { pattern: "**/*", scheme: "file" },
      wordList
    )
  );

  vscode.workspace.textDocuments.forEach(document => {
    wordList.updateWords(document);
  });

  context.subscriptions.push(wordList);
}

export function deactivate() {}
