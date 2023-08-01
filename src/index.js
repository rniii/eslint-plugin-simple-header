/*
 * eslint-plugin-simple-header, a license header plugin for ESLint
 * Written in 2023 by Rini
 *
 * To the extend possible by law, the author has dedicated all copyright
 * and related rights to this software to the public domain worldwide.
 * This software is distributed without any warranty. You should have
 * received a copy of the CC0 Public Domain Dedication along with this
 * software. If not, see <https://creativecommons.org/publicdomain/zero/1.0/>
 *
 * SPDX-License-Identifier: CC0-1.0
 */

const fs = require("node:fs");

const mapLines = (text, f) => text.split("\n").map(f).join("\n");

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function isComment(text, syntax) {
    if (Array.isArray(syntax))
        return text.startsWith(syntax[0]) && text.endsWith(syntax[1]);

    return text.split("\n").every((x) => x.startsWith(syntax));
}

function makeComment(text, syntax, decor) {
    if (isComment(text, syntax))
        return text;

    if (Array.isArray(syntax))
        return syntax[0] + decor[0]
            + mapLines(text, (x) => (decor[1] + x).trimEnd())
            + decor[2] + syntax[1];

    return mapLines(text, (x) => (syntax + decor + x).trimEnd());
}

function matchHeader(srcHeader, headers, templates) {
    for (const header of headers) {
        const body = escapeRegex(header)
            .replace(/\\\{(\w+)\\\}/g, (m, key) => templates[key]?.[0] ?? m);

        if (new RegExp(`^${body}$`).test(srcHeader))
            return true;
    }

    return false;
}

function makeHeader(headers, templates) {
    return headers[0].replace(/\{(\w+)\}/g, (m, key) => templates[key]?.[1] ?? m);
}

function stripExclamations(header, syntax) {
    if (Array.isArray(syntax)) {
        if (header.startsWith(syntax[0] + "!"))
            return syntax[0] + header.slice(syntax[0].length + 1);

        return header;
    }

    return mapLines(header, (x) =>
        x.startsWith(syntax + "!")
            ? syntax + x.slice(syntax.length + 1)
            : x,
    );
}

function findHeader(src, syntax) {
    let pat;
    if (Array.isArray(syntax))
        pat = String.raw`^\s*(${escapeRegex(syntax[0])}.*?${escapeRegex(syntax[1])}\s*)?`;
    else
        pat = String.raw`^\s*(${escapeRegex(syntax)}[^\n]*\n)*\s*`;

    const match = new RegExp(pat, "s").exec(src)[0];
    if (match.startsWith("/**"))
        return "";
    return match;
}

/** @type {import("eslint").Rule.RuleModule["create"]} */
function create(ctx) {
    const options = ctx.options[0];
    const syntax = options.syntax ?? ["/*", "*/"];
    const decor = options.decor ?? (Array.isArray(syntax) ? ["\n", " * ", "\n "] : " ");
    const templates = {
        year: ["\\d{4}", `${new Date().getFullYear()}`],
        ...options.templates,
    };
    const newlines = options.newlines ?? 1;
    /** @type {string[]} */
    const rawHeaders = options.files?.map((f) => fs.readFileSync(f, "utf8").trim())
        ?? [Array.isArray(options.text) ? options.text.join("\n") : options.text];

    /** @type {string} */
    const src = ctx.sourceCode.getText();
    const srcHeader = findHeader(src, syntax);
    const headers = rawHeaders.map((raw) => makeComment(raw, syntax, decor));
    const trailingLines = "\n".repeat(src.slice(srcHeader.length).trim() ? 1 + newlines : 1);

    if (!matchHeader(stripExclamations(srcHeader.trim(), syntax), headers, templates)) {
        ctx.report({
            message: srcHeader.trim() ? "Invalid header" : "Missing header",
            loc: { line: 1, column: 0 },
            fix(fixer) {
                const header = makeHeader(headers, templates) + trailingLines;
                return fixer.replaceTextRange([0, srcHeader.length], header);
            },
        });
    } else if (!srcHeader.startsWith(syntax[0]) || /\n*$/.exec(srcHeader)[0] !== trailingLines) {
        ctx.report({
            message: "Bad header spacing",
            loc: { line: 1, column: 0 },
            fix(fixer) {
                const header = srcHeader.trim() + trailingLines;
                return fixer.replaceTextRange([0, srcHeader.length], header);
            },
        });
    }

    return {};
}

/** @type {import("@types/json-schema").JSONSchema4[]} */
const validSyntax = [
    {
        properties: {
            syntax: { type: "string" },
            decor: { type: "string" },
        },
    },
    {
        properties: {
            syntax: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 2 },
            decor: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 3 },
        },
    },
];

/** @type {import("@types/json-schema").JSONSchema4[]} */
const validSources = [
    {
        required: ["files"],
        properties: { files: { type: "array", items: { type: "string" }, minItems: 1 } },
    },
    {
        required: ["text"],
        properties: { text: { oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }] } },
    },
];

/** @type {import("@types/json-schema").JSONSchema4[]} */
const schema = [{
    type: "object",
    additionalProperties: false,
    allOf: [{ anyOf: validSyntax }, { oneOf: validSources }],
    properties: {
        syntax: true,
        decor: true,
        files: true,
        text: true,
        templates: {
            type: "object",
            additionalProperties: false,
            patternProperties: {
                "^\\w+$": {
                    type: "array",
                    items: { type: "string" },
                    minItems: 2, maxItems: 2,
                },
            },
        },
        newlines: { type: "number", minimum: 0 },
    },
}];

/** @type {import("eslint").ESLint.Plugin} */
module.exports = {
    meta: {
        name: process.env.npm_package_name,
        version: process.env.npm_package_version,
    },
    rules: {
        header: {
            meta: { type: "layout", fixable: "code", schema },
            create,
        },
    },
};
