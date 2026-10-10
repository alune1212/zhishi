import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import process from "node:process";

const require = createRequire(import.meta.url);
const root = dirname(require.resolve("braces/package.json"));
if (require("braces/package.json").version !== "3.0.3") {
  throw new Error("Review the braces backport before changing its upstream version");
}

// shortcut: npm audit still flags upstream 3.0.3; remove this backport after an official fixed release.
const guard = "throw new SyntaxError('Brace pattern nesting exceeds 100 levels');";
const patches = [
  {
    file: "parse.js",
    hash: "e572166565f15fa6ad9865ae49d678218e32aabfd1b3720f6d0d43d39800d310",
    edits: [
      [
        "const push = node => {",
        `const push = node => {\n    if (node.nodes && stack.length > 100) ${guard}`,
      ],
    ],
  },
  {
    file: "utils.js",
    hash: "b5a7596aa67730412b3c029ef09e84e6b67b8e445cffd35d1d295549c89066c7",
    edits: [
      [
        "exports.isInteger = num => {",
        `exports.assertDepth = ast => {
  const pending = [{ node: ast, depth: 0 }];
  const depths = new WeakMap();
  while (pending.length) {
    const { node, depth } = pending.pop();
    if (depth > 101) ${guard}
    if (!node || !node.nodes || (depths.get(node) ?? -1) >= depth) continue;
    depths.set(node, depth);
    for (const child of node.nodes) pending.push({ node: child, depth: depth + 1 });
  }
};

exports.isInteger = num => {`,
      ],
    ],
  },
  {
    file: "compile.js",
    hash: "dc98f22eee3d511785d92a00758d5f0d48efed5f5813bdecc2de430c529b5c9f",
    edits: [
      [
        "const compile = (ast, options = {}) => {",
        "const compile = (ast, options = {}) => {\n  utils.assertDepth(ast);",
      ],
    ],
  },
  {
    file: "stringify.js",
    hash: "379f22d77bfa1478341ccd49c5e4267464aabcbba03558bab332aac23fc6f23a",
    edits: [
      [
        "module.exports = (ast, options = {}) => {",
        "module.exports = (ast, options = {}) => {\n  utils.assertDepth(ast);",
      ],
    ],
  },
  {
    file: "expand.js",
    hash: "41ccc196ebfa7b7781a634e721eb744e4e7bcb54cba427a7e3d6806a1b9e58f7",
    edits: [
      [
        "const expand = (ast, options = {}) => {",
        "const expand = (ast, options = {}) => {\n  utils.assertDepth(ast);",
      ],
      [
        "while (p.type !== 'brace' && p.type !== 'root' && p.parent) {",
        `let parentDepth = 0;\n    while (p.type !== 'brace' && p.type !== 'root' && p.parent) {\n      if (++parentDepth > 100) ${guard}`,
      ],
      [
        "while (block.type !== 'brace' && block.type !== 'root' && block.parent) {",
        `let blockDepth = 0;\n    while (block.type !== 'brace' && block.type !== 'root' && block.parent) {\n      if (++blockDepth > 100) ${guard}`,
      ],
    ],
  },
];

const files = patches.map(({ file, hash, edits }) => {
  const path = join(root, "lib", file);
  const source = readFileSync(path, "utf8");
  const original = edits.reduce((text, [before, after]) => text.replace(after, before), source);
  if (createHash("sha256").update(original).digest("hex") !== hash) {
    throw new Error(`Unexpected braces source: ${file}`);
  }
  return {
    path,
    source: edits.reduce((text, [before, after]) => text.replace(before, after), original),
  };
});
for (const { path, source } of files) writeFileSync(path, source);
process.stdout.write("braces backport verified: parser and AST nesting bounded\n");
