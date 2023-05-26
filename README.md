# `eslint-plugin-simple-header`

Simple to use license header plugin for ESLint.

## Installation

Add `eslint-plugin-simple-header` as a dev dependency using your package manager:

``` sh
$ pnpm add -D eslint-plugin-simple-header
# or yarn, npm etc
```

## Usage

Given the following configuration:

``` json
{
    "plugins": ["simple-header"],
    "rules": {
        "simple-header/header": [
            "error",
            [
                "Caterpillar, meow",
                "Copyright (c) {year} {author}",
                "",
                "SPDX-License-Identifier: CC0-1.0"
            ],
            { "templates": { "author": [".*", "cat"] } }
        ]
    }
}
```

The rule will match a header like this:

    /*
     * Caterpillar, meow
     * Copyright (c) 2023 Anyone
     *
     * SPDX-License-Identifier: CC0-1.0
     */

And when running auto-fix, will insert a header like so:

    /*
     * Caterpillar, meow
     * Copyright (c) 2023 cat
     *
     * SPDX-License-Identifier: CC0-1.0
     */

(Where 2023 is the current year, if you are from the future)

See the section below for more info on `templates`, how to specify multiple header formats, and how to use external
files for headers.

If a header is already present when auto-fixing, and it is not a JSDoc comment, it’ll be replaced. Additionally, the
rule will still match headers that start with `/*!` instead of `/*`, which in many tools indicates that the comment
should not be removed (e.g. in bundlers like [esbuild](https://esbuild.github.io/api/#legal-comments)).

## `header` options

The `simple-header/header` rule takes a variable amount of options. The last option might be an object, like so:

- `"file"` text file to use as a header. Trailing spaces will be trimmed on the end of the file, but otherwise the
  entire file is used as-is

- `"files"` like `"file"`, but you can specify multiple files

- `"templates"` configures what templates can be used in the header. It should be an object whose properties are tuples
  of `[pattern, default]`. When a template is used in the header (`{foo}`), the rule will accept any headers which match
  `pattern`, and when inserting headers via auto-fix, `default` will be used. By default, this includes `year`, which
  matches any four digit string and defaults to the current year.

- `"plain": false` automatically prefixes comment lines with asterisks, and adds leading whitespace: (this is the
  default)

      /*
       * A single line will be formatted like this.
       */

- `"plain": true` uses the header text as-is in the block comment, and allows you to include `/* */` in the header text
  to more precisely control spacing inside the block comment

- `"newlines"` how many blank lines should be added after the block comment (defaults to `1`)

- `"linebreak"` controls which line endings to use: `"unix"` for LF (default), `"windows"` for CRLF. Likely you will
  want to stick with the default.

  See also: the [`linebreak-style`](https://eslint.org/docs/latest/rules/linebreak-style) eslint rule

All other options are treated as possible headers. They might be strings, or arrays of strings, in which they will be
joined with newlines. If multiple headers are given, the first header is used as the default when auto-fixing.

It is technically possible to provide headers via the options array, plus `"file"` and `"files"`, and they will be
joined in that order. This behaviour is not encouraged. It is an error to not provide headers via any of these methods.
