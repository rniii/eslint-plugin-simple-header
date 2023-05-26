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

const fs = require("node:fs");

/** @type {import("eslint").Rule.RuleModule["create"]} */
const rule = (ctx) => {
    const options = [...ctx.options];
    const src = /** @type {string} */(ctx.sourceCode.getText());
    const [srcHeader] = /^\s*(\/\*[^*].*?\*\/\s*)?/s.exec(src);
    const trimmedSrcHeader = srcHeader.trim();

    const optionsObj = typeof ctx.options.at(-1) != "string" && !(ctx.options.at(-1) instanceof Array)
        ? options.pop()
        : {};
    const headers = options;

    if (optionsObj.file)
        headers.push(fs.readFileSync(optionsObj.file, "utf8").trimEnd());
    if (optionsObj.files)
        headers.push(...optionsObj.files.map((file) =>
            fs.readFileSync(file, "utf8").trimEnd()));
    if (!headers.length)
        throw Error("No headers given!");

    for (const [i, header] of headers.entries())
        if (header instanceof Array)
            headers[i] = header.join("\n");

    if (!options.plain) {
        for (const [i, header] of headers.entries()) {
            headers[i] = ("\n" + header).replace(/(?<=\n).*/g, (m) => ` * ${m}`.trimEnd()) + "\n ";
        }
    }

    const templates = {
        year: ["\\d{4}", `${new Date().getFullYear()}`],
        ...optionsObj.templates,
    };

    // First replace: https://dev.mozilla.org/docs/JavaScript/Guide/Regular_Expressions#escaping
    const patterns = headers.map((header) => new RegExp(`^/\\*!?${
        header
            .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
            .replace(/\\\{(\w+)\\\}/g, (m, key) => templates[key]?.[0] ?? m)
    }\\*/$`));

    const defaultHeader = `/*${
        headers[0].replace(/\{(\w+)\}/g, (m, key) => templates[key]?.[1] ?? m)
    }*/`;

    const trailingLines = src.slice(srcHeader.length).trim()
        ? 1 + (optionsObj.newlines ?? 1)
        : 1;

    if (!patterns.some((re) => re.test(trimmedSrcHeader))) {
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
                fixer.replaceTextRange([0, srcHeader.length], trimmedSrcHeader + "\n".repeat(trailingLines)),
        });
    }

    return {};
};

const headerSchema = {
    oneOf: [
        { type: "string" },
        { type: "array", items: { type: "string" } },
    ],
};

const optionSchema = {
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
        file: { type: "string" },
        files: { type: "array", items: { type: "string" } },
    },
};

const schema = {
    type: "array",
    items: { oneOf: [headerSchema, optionSchema] },
};

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
