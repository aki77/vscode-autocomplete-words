import {
  TextDocument,
  CompletionItem,
  CompletionItemProvider,
  workspace,
  CompletionItemKind,
  Disposable,
  MarkdownString,
  WorkspaceConfiguration
} from "vscode";
import * as path from "path";
import pImmediate from "p-immediate";

interface Cache {
  document: TextDocument | null;
  items: CompletionItem[];
}

type WordSet = Set<string>;

const DEFAAULT_WORD_PATTERN = /(-?\d*\.\d\w*)|([^\`\~\!\@\#\$\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g;

export default class WordList implements CompletionItemProvider, Disposable {
  private cache: Cache = {
    document: null,
    items: []
  };

  private documents: WeakMap<TextDocument, WordSet> = new WeakMap();

  public constructor(private config: WorkspaceConfiguration) {}

  public dispose() {
    this.clearCache();
  }

  public async updateWords(document: TextDocument) {
    const documentPath = document.uri.path;
    // TODO: settings
    if (documentPath.endsWith(".git") || documentPath.endsWith(".	rendered")) {
      return;
    }

    const excludeFiles: string[] = this.config.get("excludeFiles", []);
    if (excludeFiles.includes(path.basename(documentPath))) {
      return;
    }

    if (this.cache.document !== document) {
      this.clearCache();
    }
    this.documents.set(document, await this.getWords(document));
  }

  public async provideCompletionItems(document: TextDocument) {
    if (document === this.cache.document) {
      return this.cache.items;
    }

    this.cache.document = document;
    this.cache.items = [
      ...(await this.buildOtherDocumentCompletionItems(document)),
      ...this.buildSuggestCompletionItems(document.languageId)
    ];

    return this.cache.items;
  }

  private async buildOtherDocumentCompletionItems(
    document: TextDocument
  ): Promise<CompletionItem[]> {
    return Array.from(await this.otherDocumentWords(document)).map(
      ([word, set]) => {
        const item = new CompletionItem(word, CompletionItemKind.Text);
        item.documentation = new MarkdownString(
          Array.from(set)
            .map(basename => `- ${basename}`)
            .join("\n")
        );
        // NOTE: low priority
        item.sortText = "\uffff" + "za";
        return item;
      }
    );
  }

  private buildSuggestCompletionItems(languageId: string): CompletionItem[] {
    const suggestWords: string[] = this.config.get(
      `languages.${languageId}.suggestWords`,
      []
    );

    return suggestWords.map(word => {
      const item = new CompletionItem(word, CompletionItemKind.Text);
      item.detail = "Suggest Words";
      // NOTE: low priority
      item.sortText = "\uffff" + "zb";
      return item;
    });
  }

  private async otherDocumentWords(document: TextDocument) {
    const words: Map<string, Set<string>> = new Map();
    const documents = workspace.textDocuments
      .filter(doc => doc !== document)
      .slice(0, this.config.get("maxDocumentCount", 10));

    for (const doc of documents) {
      await pImmediate();

      const wordSet = this.documents.get(doc);
      if (!wordSet) {
        continue;
      }

      const basename = path.basename(doc.uri.path);
      wordSet.forEach(word => {
        const set = words.get(word) || new Set();
        set.add(basename);
        words.set(word, set);
      });
    }

    return words;
  }

  private async getWords(document: TextDocument) {
    const words: WordSet = new Set();
    const wordPattern = this.createWordPattern(document.languageId);
    const minWordLength: number = this.config.get("minWordLength", 4);
    const ignoreWords: string[] = this.config.get(
      `languages.${document.languageId}.ignoreWords`,
      []
    );

    for await (const lineText of this.documentLines(document)) {
      let matches;
      let word;
      while ((matches = wordPattern.exec(lineText))) {
        word = matches[0];
        if (word.length >= minWordLength && !ignoreWords.includes(word)) {
          words.add(word);
        }
      }
    }

    return words;
  }

  private createWordPattern(languageId: string) {
    const wordPattern: string | undefined = this.config.get(
      `languages.${languageId}.wordPattern`
    );
    return wordPattern ? new RegExp(wordPattern, "g") : DEFAAULT_WORD_PATTERN;
  }

  private async *documentLines(document: TextDocument) {
    const lineCount = document.lineCount;
    if (this.config.get("maxLineCount", 999) < lineCount) {
      console.debug("large file!");
      return;
    }

    for (let i = 0; i < lineCount; i++) {
      await pImmediate();
      const line = document.lineAt(i);
      yield line.text;
    }
  }

  private clearCache() {
    this.cache.document = null;
    this.cache.items = [];
  }
}
