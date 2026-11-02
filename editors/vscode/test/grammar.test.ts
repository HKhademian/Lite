/// <reference lib="dom" />
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
import { test } from 'node:test';
import textmate from 'vscode-textmate';
import type { IToken } from 'vscode-textmate';
const { Registry, parseRawGrammar, INITIAL } = textmate;
import oniguruma from 'vscode-oniguruma';

const root = fileURLToPath(new URL('../', import.meta.url));
type Row = { line: string; tokens: IToken[] };
const registry = new Registry({
  onigLib: oniguruma.loadWASM(readFileSync(require.resolve('vscode-oniguruma/release/onig.wasm'))).then(() => ({
    createOnigScanner: patterns => new oniguruma.OnigScanner(patterns),
    createOnigString: text => new oniguruma.OnigString(text),
  })),
  loadGrammar: async scope => scope === 'source.lite'
    ? parseRawGrammar(readFileSync(path.join(root, 'syntaxes/lite.tmLanguage.json'), 'utf8'), 'lite.json') : null,
});
const ready = registry.loadGrammar('source.lite');

async function tokenize(source: string): Promise<Row[]> {
  const grammar = await ready;
  assert.ok(grammar);
  let state = INITIAL;
  return source.split('\n').map(line => {
    const result = grammar.tokenizeLine(line, state);
    assert.equal(result.stoppedEarly, false);
    state = result.ruleStack;
    return { line, tokens: result.tokens };
  });
}
function scopesAt(rows: Row[], line: number, needle: string) {
  const row = rows[line];
  assert.ok(row);
  const start = row.line.indexOf(needle);
  assert.notEqual(start, -1, needle);
  const token = row.tokens.find(token => token.startIndex <= start && start < token.endIndex);
  assert.ok(token, needle);
  return token.scopes;
}
function has(rows: Row[], line: number, needle: string, scope: string) { assert.ok(scopesAt(rows, line, needle).includes(scope), `${needle}: ${scope}`); }
function lacks(rows: Row[], line: number, needle: string, scope: string) { assert.ok(!scopesAt(rows, line, needle).includes(scope), `${needle}: unexpected ${scope}`); }

test('ordinary Lite declarations, calls, scalar types, literals and Unicode identifiers', async () => {
  const rows = await tokenize('double := fn(n: Int): Int { n * 2 }\nvar شمارنده := 1.25e-3;\nreport(double(4));\nif true and not false { return Unit; }');
  has(rows, 0, 'double', 'entity.name.function.lite');
  has(rows, 0, 'fn', 'storage.type.lite');
  has(rows, 0, 'Int', 'support.type.lite');
  has(rows, 1, 'var', 'storage.modifier.lite');
  has(rows, 1, 'شمارنده', 'variable.other.lite');
  has(rows, 1, '1.25e-3', 'constant.numeric.lite');
  has(rows, 2, 'report', 'entity.name.function.call.lite');
  has(rows, 3, 'if', 'keyword.control.lite');
  has(rows, 3, 'and', 'keyword.operator.word.lite');
  has(rows, 3, 'Unit', 'constant.language.lite');
  const list = await tokenize('values: mut List<Int> = []; push_back(mut values, 1);');
  has(list, 0, 'List', 'support.type.lite');
  has(list, 0, 'mut', 'storage.modifier.lite');
  has(list, 0, 'push_back', 'entity.name.function.call.lite');
  const inferred = await tokenize('mut args := inputArgs();\nvar mut other := inputArgs();');
  has(inferred, 0, 'mut', 'storage.modifier.lite');
  has(inferred, 0, 'args', 'variable.other.lite');
  has(inferred, 1, 'var', 'storage.modifier.lite');
  has(inferred, 1, 'mut', 'storage.modifier.lite');
  has(inferred, 1, 'other', 'variable.other.lite');
  has(inferred, 0, 'inputArgs', 'entity.name.function.call.lite');
  const manifest = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')) as { contributes: { languages: [{ extensions: string[]; icon: Record<string, string> }] } };
  assert.deepEqual(manifest.contributes.languages[0].extensions, ['.lt', '.lts', '.lite']);
  for (const icon of Object.values(manifest.contributes.languages[0].icon)) {
    assert.ok(existsSync(path.join(root, icon)), icon);
  }
});
test('multiline strings and escaped quotes keep comment/keyword text inside the string', async () => {
  const rows = await tokenize('message := "if /* not a comment\n\\"quoted\\" and // text"; report(1);');
  has(rows, 0, 'if', 'string.quoted.double.lite');
  lacks(rows, 0, 'if', 'keyword.control.lite');
  has(rows, 1, '\\"', 'constant.character.escape.lite');
  has(rows, 1, '//', 'string.quoted.double.lite');
  has(rows, 1, 'report', 'entity.name.function.call.lite');
});
test('ordinary comments nest; quotes do not shield inner delimiters', async () => {
  const rows = await tokenize('/* outer " /* inner */ still outer\nreturn 1; */ report(2);');
  has(rows, 0, 'still', 'comment.block.lite');
  has(rows, 1, 'return', 'comment.block.lite');
  lacks(rows, 1, 'return', 'keyword.control.lite');
  has(rows, 1, 'report', 'entity.name.function.call.lite');
});
test('raw fences use the exact hash count and ignore ordinary delimiters', async () => {
  const rows = await tokenize('/*## raw\n#*/ shorter\n###*/ longer\n/* " if */ remains raw\n##*/ report(2);');
  for (const [line, text] of ([[1, 'shorter'], [2, 'longer'], [3, 'if']] as const)) has(rows, line, text, 'comment.block.raw.lite');
  has(rows, 4, 'report', 'entity.name.function.call.lite');
  const one = await tokenize('/*# ##*/ still raw #*/ report(1);');
  has(one, 0, 'still', 'comment.block.raw.lite');
  has(one, 0, 'report', 'entity.name.function.call.lite');
});
test('raw comments nested in ordinary comments resume their enclosing comment', async () => {
  const rows = await tokenize('/* outer /*# unmatched /* and */ #*/ outer again */ report(3);');
  has(rows, 0, 'unmatched', 'comment.block.raw.lite');
  has(rows, 0, 'again', 'comment.block.lite');
  lacks(rows, 0, 'again', 'comment.block.raw.lite');
  has(rows, 0, 'report', 'entity.name.function.call.lite');
});
test('no line comments, invented builtin classification, or keyword matches within identifiers', async () => {
  const rows = await tokenize('// report(1); returning := 2; if_نام := 3; trueValue := 4; textAt("a", 0);');
  has(rows, 0, 'report', 'entity.name.function.call.lite');
  lacks(rows, 0, 'report', 'comment.block.lite');
  for (const name of ['returning', 'if_نام', 'trueValue']) has(rows, 0, name, 'variable.other.lite');
  lacks(rows, 0, 'returning', 'keyword.control.lite');
  has(rows, 0, 'textAt', 'entity.name.function.call.lite');
  lacks(rows, 0, 'textAt', 'support.function.lite');
});
test('long operators stay intact; leading-dot access is not a fractional literal', async () => {
  const operators = ['=!=', '<!=', '>!=', '<!', '>!', '<=', '>=', '==', '<', '>', ':/=', ':%=', ':/', ':%', ':='];
  const rows = await tokenize(operators.join(' ') + ' @outer .5 0.5');
  const operatorTokens = rows[0]!.tokens.filter(t => t.scopes.includes('keyword.operator.lite'))
    .map(t => rows[0]!.line.slice(t.startIndex, t.endIndex));
  assert.deepEqual(operatorTokens, operators);
  has(rows, 0, '@outer', 'entity.name.label.lite');
  lacks(rows, 0, '5 0.5', 'constant.numeric.lite');
  has(rows, 0, '0.5', 'constant.numeric.lite');
});
test('unfinished comments and multiline strings stay open without guessing a terminator', async () => {
  for (const source of ['/* open\nreport(1);', '/*### open\n##*/ report(1);']) {
    const rows = await tokenize(source);
    assert.ok(scopesAt(rows, 1, 'report').some(scope => scope.startsWith('comment.block')));
  }
  const rows = await tokenize('"open\nreport(1);');
  has(rows, 1, 'report', 'string.quoted.double.lite');
});
test('tokenize project samples and indexed examples using the real TextMate engine', async () => {
  let files = 0;
  async function visit(dir: string): Promise<void> {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) await visit(file);
      else if (entry.isFile() && /\.lts?$/.test(entry.name)) {
        const rows = await tokenize(readFileSync(file, 'utf8'));
        assert.ok(rows.length > 0, file);
        files++;
      }
    }
  }
  await visit(path.join(root, '../../samples'));
  await visit(path.join(root, '../../examples'));
  assert.ok(files >= 25, `expected lessons and examples, got ${files}`);
});
