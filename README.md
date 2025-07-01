# Next.js Public Path Intellisense

Provides VSCode path completions for absolute paths (starting with `/`) pointing into the `public/` directory of Next.js projects. Only activates when `next.config.js` and a `public/` folder are present.

## Features

- Autocomplete files and folders under `public/` when editing `src` attributes in:
  - `<Image src="/..."/>`
  - `<img src="/..."/>`
  - `<video src="/..."/>`
  - `<source src="/..."/>`

## Installation

1. Clone this repository
2. Run `npm install`
3. Run `npm run compile`
4. Press `F5` in VSCode to launch the extension host

## Usage

Type `/` inside the `src` attribute of supported tags to get suggestions of files and folders from your `public/` directory.
