# `eslint-plugin-simple-header`

Simple to use license header plugin for ESLint.

## Installation

Add the following url as a dev dependency using your package manager (`pnpm add -D` or `yarn`, `npm` etc):

    git+https://codeberg.org/dissoc/eslint-plugin-simple-header.git

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

See the section below for more info on `templates`, and how to specify multiple header formats.

If a header is already present when running auto-fix, it will be replaced (note that JSDoc comments are still kept).
Additionally, the rule will still match the header if it starts with `/*!` instead of `/*`, which in many tools
indicates that the comment should not be removed (e.g. in bundlers like
[esbuild](https://esbuild.github.io/api/#legal-comments)).

## `header` options

The `simple-header/header` rule takes a variable amount of options. The last option might be an object, like so:

- `"file"` text file to use as a header. Note that it should not use comment syntax

- `"files"` like `"file"`, but you can specify multiple files

- `"templates"` configures what templates can be used in the header. It should be an object whose properties are tuples
  of `[pattern, default]`. When a template is used in the header (`{foo}`), the rule will accept any headers which match
  `pattern`, and when inserting headers via auto-fix, `default` will be used. By default, this includes `year`, which
  matches any four digit string and defaults to the current year.

- `"newlines"` how many blank lines should be added after the block comment (defaults to `1`)

- `"plain": false` automatically prefixes comment lines with asterisks, and adds leading whitespace: (this is the
  default)

      /*
       * A single line will be formatted like this.
       */

- `"plain": true` uses the header text as-is in the block comment

All other options are treated as possible headers. They might be strings, or arrays of strings, in which they will be
joined with newlines. If multiple headers are given, the first header is used as the default when auto-fixing.

It is technically possible to provide headers via the options array, plus `"file"` and `"files"`, and they will be
joined in that order. This behaviour is not encouraged. It is an error to not provide headers via any of these methods.
