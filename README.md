# Autocomplete Words

Create completion items from other open files.

## Motivation

[IntelliSense to find matches in all open files including word suggestions · Issue \#12115 · microsoft/vscode](https://github.com/microsoft/vscode/issues/12115)

## Features

![demo](https://i.gyazo.com/9a8280c0daef08f119d8c05ee18d21ca.gif)

## Extension Settings

This extension contributes the following settings:

- `autocompleteWords.minWordLength`: Minimum word length to keep in autocomplete list. (default: `4`)
- `autocompleteWords.maxLineCount`: Exclude files larger than the maximum number of lines. (default: `999`)
- `autocompleteWords.maxDocumentCount`: Maximum number of documents used for suggest. (default: `10`)
- `autocompleteWords.languages`: language settings. (default: See [package.json](https://github.com/aki77/vscode-autocomplete-words/blob/master/package.json#L29-L82))

## TODO

- [ ] Test
- [ ] Ignore file setting
