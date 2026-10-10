import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const braces = require("braces");
const apis = ["compile", "expand", "stringify"];
const rejected = { name: "SyntaxError", message: "Brace pattern nesting exceeds 100 levels" };

test("nested braces, parentheses, and mixed patterns fail before recursive walkers", () => {
  for (const [open, close] of [
    ["{", "}"],
    ["(", ")"],
    ["{(", ")}"],
  ]) {
    const input = open.repeat(2000) + "a,b" + close.repeat(2000);
    assert.throws(() => braces.parse(input), rejected);
    for (const api of apis) assert.throws(() => braces[api](input), rejected);
  }
});

test("direct AST inputs and cycles cannot bypass the depth bound", () => {
  for (const api of apis) {
    let ast = { type: "text", value: "x" };
    for (let index = 0; index < 1000; index++) ast = { type: "paren", nodes: [ast] };
    assert.throws(() => braces[api](ast), rejected);
    const cyclic = { type: "root", nodes: [] };
    cyclic.nodes.push(cyclic);
    assert.throws(() => braces[api](cyclic), rejected);
  }
  const cyclicParent = { type: "paren", nodes: [], queue: [] };
  cyclicParent.parent = cyclicParent;
  assert.throws(() => braces.expand({ type: "root", nodes: [cyclicParent] }), rejected);
});

test("normal glob, range, literal, escaping, and option behavior remains intact", () => {
  const cases = [
    ["src/**/*.{ts,tsx}", "src/**/*.(ts|tsx)", ["src/**/*.ts", "src/**/*.tsx"]],
    ["a/{b,c}/{1..3}", "a/(b|c)/([1-3])", ["a/b/1", "a/b/2", "a/b/3", "a/c/1", "a/c/2", "a/c/3"]],
    ["${a,b}", "${a,b}", ["${a,b}"]],
    ["{a}", "{a}", ["{a}"]],
    ["{{a,b},c}", "((a|b)|c)", ["a", "b", "c"]],
    ["(a/{b,c})", "(a/(b|c))", ["(a/b)", "(a/c)"]],
    ["a/{1..3..2}", "a/(1|3)", ["a/1", "a/3"]],
  ];
  for (const [input, compiled, expanded] of cases) {
    assert.equal(braces.compile(input), compiled);
    assert.deepEqual(braces.expand(input), expanded);
    assert.equal(braces.stringify(input), input);
    assert.equal(braces.stringify(input, { escapeInvalid: true }), input);
  }
  assert.deepEqual(braces.expand("{a,a,}", { nodupes: true, noempty: true }), ["a"]);
  assert.deepEqual(braces.expand("\\{a,b\\}"), ["{a,b}"]);
  assert.deepEqual(braces.expand('"{a,b}"'), ["{a,b}"]);
  const boundary = "{".repeat(100) + "a,b" + "}".repeat(100);
  for (const api of apis) assert.doesNotThrow(() => braces[api](boundary));
  const literal = "\\{".repeat(1000);
  for (const api of apis) assert.doesNotThrow(() => braces[api](literal));
});
