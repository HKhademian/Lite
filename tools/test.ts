import { loadCase, loadCases, verifyScenario } from './cases.ts';

export function testCases(filter = '', file?: string): { count: number; failures: number; pending: number } {
  let failures = 0;
  let count = 0;
  let pending = 0;
  for (const fixture of file === undefined ? loadCases(filter) : [loadCase(file)]) {
    for (const scenario of fixture.definition.cases) {
      if (fixture.definition.pending !== undefined) {
        pending++;
        console.log(`PENDING ${fixture.definition.id}/${scenario.name}: ${fixture.definition.pending}`);
        continue;
      }
      count++;
      try {
        verifyScenario(fixture, scenario);
        console.log(`PASS ${fixture.definition.id}/${scenario.name}`);
      } catch (error) {
        failures++;
        console.error(`FAIL ${fixture.definition.id}/${scenario.name}: ${error instanceof Error ? error.message : error}`);
      }
    }
  }
  console.log(`${count - failures}/${count} scenarios passed`);
  if (pending) console.log(`${pending} scenarios pending`);
  if (failures || (pending > 0 && (file !== undefined || count === 0))) process.exitCode = 1;
  return { count, failures, pending };
}

if (import.meta.main) {
  try {
    const [selection, ...extra] = process.argv.slice(2);
    if (extra.length) throw new Error('usage: lite test --cases [FILTER|FILE.case.json]');
    testCases(selection?.endsWith('.json') ? '' : selection, selection?.endsWith('.json') ? selection : undefined);
  } catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
