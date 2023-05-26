/*!
 * eslint-plugin-simple-header, a license header plugin for ESLint.
 *
 * Written in 2023 by Rini
 *
 * To the extent possible under law, the author(s) have dedicated all copyright and
 * related and neighboring rights to this software to the public domain worldwide.
 *
 * This software is distributed without any warranty. You should have received a
 * copy of the CC0 Public Domain Dedication along with this software. If not, see
 * <http://creativecommons.org/publicdomain/zero/1.0/>.
 */

/** @type {import("eslint").Rule.RuleModule["create"]} */
const rule = (ctx) => {
    const src = /** @type {string} */(ctx.sourceCode.getText());
    const [srcHeader] = /^\s*(\/\*[^*].*?\*\/\s*)?/s.exec(src);

    let [header, options] = ctx.options;
    options ??= {};

    const templates = {
        year: ["\\d{4}", `${new Date().getFullYear()}`],
        ...options.templates,
    };

    if (header instanceof Array)
        header = header.join("\n");

    if (!options.plain) {
        header = ("\n" + header).replace(/(?<=\n).*/g, (m) => ` * ${m}`.trimEnd());
        header += "\n "; // space before */
    }

    // First replace: https://dev.mozilla.org/docs/JavaScript/Guide/Regular_Expressions#escaping
    const headerRegex = new RegExp(`^/\\*!?${
        header
            .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
            .replace(/\\\{(\w+)\\\}/g, (m, key) => templates[key]?.[0] ?? m)
    }\\*/$`);

    const defaultHeader = `/*${
        header.replace(/\{(\w+)\}/g, (m, key) => templates[key]?.[1] ?? m)
    }*/`;

    const trailingLines = src.slice(srcHeader.length).trim()
        ? 1 + (options.newlines ?? 1)
        : 1;

    if (!headerRegex.test(srcHeader.trim())) {
        ctx.report({
            message: srcHeader.trim() ? "Invalid header" : "Missing header",
            loc: { line: 1, column: 0 },
            fix: (fixer) =>
                fixer.replaceTextRange([0, srcHeader.length], defaultHeader + "\n".repeat(trailingLines)),
        });
    } else if (srcHeader.startsWith("\n") || /\n*$/.exec(srcHeader)[0].length !== trailingLines) {
        ctx.report({
            message: "Bad header spacing",
            loc: { line: 1, column: 0 },
            fix: (fixer) =>
                fixer.replaceTextRange([0, srcHeader.length], srcHeader.trim() + "\n".repeat(trailingLines)),
        });
    }

    return {};
};

const schema = [
    {
        required: true,
        oneOf: [
            { type: "string" },
            { type: "array", items: { type: "string" } },
        ],
    },
    {
        type: "object",
        additionalProperties: false,
        properties: {
            newlines: { type: "number", minimum: 0 },
            plain: { type: "boolean" },
            templates: {
                type: "object",
                additionalProperties: false,
                patternProperties: {
                    "^\\w+$": {
                        type: "array",
                        additionalProperties: false,
                        items: [{ type: "string" }, { type: "string" }],
                    },
                },
            },
        },
    },
];

/** @type {import("eslint").ESLint.Plugin} */
module.exports = {
    meta: {
        name: process.env.npm_package_name,
        version: process.env.npm_package_version,
    },
    rules: {
        header: {
            meta: { type: "layout", fixable: "code", schema },
            create: rule,
        },
    },
};
