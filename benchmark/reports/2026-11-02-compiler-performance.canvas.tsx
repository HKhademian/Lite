import { BarChart, Callout, H1, H2, Stack, Table, Text, useState } from 'cursor/canvas';
const data = {
  "date": "2026-11-02",
  "revision": "dc0028d7713f93d844d56a180bc6e6e42f92f68f",
  "environment": {
    "node": "v24.16.0",
    "nodeExecutable": "<redacted>",
    "platform": "<redacted>",
    "release": "27.0.0",
    "arch": "<redacted>",
    "cpu": "<redacted>",
    "logicalCpus": "<redacted>",
    "totalMemoryBytes": "<redacted>",
    "freeMemoryAtStartBytes": 70615040,
    "typescript": "7.0.2",
    "cc": "Apple clang version 21.0.0 (clang-2100.3.34.2)\nTarget: arm64-apple-darwin27.0.0\nThread model: posix\nInstalledDir: /Applications/Xcode.app/Contents/Developer/Toolchains/XcodeDefault.xctoolchain/usr/bin",
    "nodeOptions": "<redacted>",
    "nodeCompileCache": "",
    "pinnedNode": "26.13.0"
  },
  "availability": [
    {
      "compiler": "T00",
      "status": "available",
      "role": "handwritten TS parser/checker/interpreter; code generation measured as T00+S"
    },
    {
      "compiler": "T11",
      "status": "available",
      "role": "Lite-written TS compiler emitted as TS; exact snapshot hash recorded"
    },
    {
      "compiler": "C01",
      "status": "unavailable",
      "role": "planned first native compiler; no buildable self-hosted artifact"
    },
    {
      "compiler": "C11",
      "status": "unavailable",
      "role": "not defined in current bootstrap ledger; no runnable artifact found; C11 C language mode is not a compiler node"
    }
  ],
  "results": [
    {
      "workload": "report-1",
      "engines": [
        {
          "engine": "T00+S",
          "samples": 7,
          "medianWallMs": 126.540209,
          "minWallMs": 122.77674999999999,
          "maxWallMs": 131.03837499999997,
          "medianCompileMs": 5.816249999999997,
          "medianLoadMs": 94.968458,
          "medianCpuMs": 222.259,
          "medianPeakRssMiB": 138.46875
        },
        {
          "engine": "T11",
          "samples": 7,
          "medianWallMs": 70.91162500000019,
          "minWallMs": 70.2829999999999,
          "maxWallMs": 74.738292,
          "medianCompileMs": 1.9555829999999972,
          "medianLoadMs": 39.129166,
          "medianCpuMs": 85.254,
          "medianPeakRssMiB": 91.765625
        }
      ],
      "wallSpeedupT11": 1.784477636776758,
      "compileSpeedupT11": 2.9741770101294627
    },
    {
      "workload": "report-100",
      "engines": [
        {
          "engine": "T00+S",
          "samples": 7,
          "medianWallMs": 291.0080829999997,
          "minWallMs": 287.7935419999999,
          "maxWallMs": 297.5335,
          "medianCompileMs": 173.722917,
          "medianLoadMs": 92.509084,
          "medianCpuMs": 515.642,
          "medianPeakRssMiB": 140.109375
        },
        {
          "engine": "T11",
          "samples": 7,
          "medianWallMs": 101.61116699999911,
          "minWallMs": 99.6902500000001,
          "maxWallMs": 105.28408299999955,
          "medianCompileMs": 39.410833,
          "medianLoadMs": 39.359459,
          "medianCpuMs": 140.589,
          "medianPeakRssMiB": 97.078125
        }
      ],
      "wallSpeedupT11": 2.8639380059477344,
      "compileSpeedupT11": 4.407999115370132
    },
    {
      "workload": "report-1000",
      "engines": [
        {
          "engine": "T00+S",
          "samples": 7,
          "medianWallMs": 3032.7415420000034,
          "minWallMs": 2966.9057089999988,
          "maxWallMs": 3056.302834000002,
          "medianCompileMs": 2904.1547499999997,
          "medianLoadMs": 91.788792,
          "medianCpuMs": 3249.826,
          "medianPeakRssMiB": 190.546875
        },
        {
          "engine": "T11",
          "samples": 7,
          "medianWallMs": 3190.0136249999996,
          "minWallMs": 3128.9143750000003,
          "maxWallMs": 3208.3153329999986,
          "medianCompileMs": 3122.83925,
          "medianLoadMs": 38.72925,
          "medianCpuMs": 3243.152,
          "medianPeakRssMiB": 158.515625
        }
      ],
      "wallSpeedupT11": 0.9506986171571614,
      "compileSpeedupT11": 0.929972540213205
    },
    {
      "workload": "compiler-corpus",
      "engines": [
        {
          "engine": "T00+S",
          "samples": 7,
          "medianWallMs": 12386.531412999844,
          "minWallMs": 12219.965287999963,
          "maxWallMs": 12430.470249000064,
          "medianCompileMs": 1005.3596629999996,
          "medianLoadMs": 8850.269169000001,
          "medianCpuMs": 21535.985000000015,
          "medianPeakRssMiB": 140.484375
        },
        {
          "engine": "T11",
          "samples": 7,
          "medianWallMs": 6958.779583999989,
          "minWallMs": 6815.928010999996,
          "maxWallMs": 7007.657536000013,
          "medianCompileMs": 231.0737929999999,
          "medianLoadMs": 3783.647246999999,
          "medianCpuMs": 8241.855,
          "medianPeakRssMiB": 97.40625
        }
      ],
      "wallSpeedupT11": 1.7799861690517749,
      "compileSpeedupT11": 4.3508164640721505
    },
    {
      "workload": "benchmark:report-1",
      "comparableCodegen": false,
      "engines": [
        {
          "engine": "T00-frontend",
          "samples": 7,
          "medianWallMs": 72.17762500001118,
          "minWallMs": 71.12916700000642,
          "maxWallMs": 74.29999999998836,
          "medianCompileMs": 1.3697080000000028,
          "medianLoadMs": 38.393458,
          "medianCpuMs": 83.019,
          "medianPeakRssMiB": 89.390625
        }
      ]
    },
    {
      "workload": "benchmark:report-100",
      "comparableCodegen": false,
      "engines": [
        {
          "engine": "T00-frontend",
          "samples": 7,
          "medianWallMs": 72.18670900000143,
          "minWallMs": 70.74816699998337,
          "maxWallMs": 75.18249999999534,
          "medianCompileMs": 2.426833000000002,
          "medianLoadMs": 37.956959000000005,
          "medianCpuMs": 85.881,
          "medianPeakRssMiB": 90.46875
        }
      ]
    },
    {
      "workload": "benchmark:report-1000",
      "comparableCodegen": false,
      "engines": [
        {
          "engine": "T00-frontend",
          "samples": 7,
          "medianWallMs": 72.17345899998327,
          "minWallMs": 71.79633300000569,
          "maxWallMs": 75.39991600002395,
          "medianCompileMs": 6.164209,
          "medianLoadMs": 38.251416,
          "medianCpuMs": 105.2,
          "medianPeakRssMiB": 98.703125
        }
      ]
    },
    {
      "workload": "benchmark:S",
      "comparableCodegen": false,
      "engines": [
        {
          "engine": "T00-frontend",
          "samples": 7,
          "medianWallMs": 116.67204199999105,
          "minWallMs": 113.47608299998683,
          "maxWallMs": 123.37050000001909,
          "medianCompileMs": 50.807208,
          "medianLoadMs": 38.346000000000004,
          "medianCpuMs": 201.182,
          "medianPeakRssMiB": 139.453125
        }
      ]
    }
  ],
  "selfCompilation": [
    {
      "engine": "T00+S",
      "wallMs": 60006.801209,
      "status": null,
      "signal": "SIGTERM",
      "stdoutBytes": 0,
      "stdoutSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "stderrBytes": 0,
      "stderrSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "error": "ETIMEDOUT",
      "outcome": "timeout",
      "stderr": ""
    },
    {
      "engine": "T11",
      "wallMs": 60008.28554200003,
      "status": null,
      "signal": "SIGTERM",
      "stdoutBytes": 0,
      "stdoutSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "stderrBytes": 0,
      "stderrSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "error": "ETIMEDOUT",
      "outcome": "timeout",
      "stderr": ""
    }
  ],
  "pairedComparisons": 760,
  "samples": 7,
  "warmups": 1,
  "selfTimeoutMs": 60000
};
export default function CompilerPerformance() {
  const [metric, setMetric] = useState('wall');
  const results = data.results.filter(row => row.comparableCodegen !== false);
  const key = metric === 'wall' ? 'medianWallMs' : 'medianCompileMs';
  return <Stack gap={20} style={{padding:24,maxWidth:1120}}>
    <H1>Lite compiler performance · {data.date}</H1>
    <Text>{data.environment.cpu} · Node {data.environment.node} · {data.samples} fresh-process samples · Revision {data.revision.slice(0,12)}</Text>
    <Callout>T00+S and T11 emit identical TS for the measured inputs. T00 frontend is a separate parser/checker measurement. C01 and C11 have no runnable native artifacts.</Callout>
    <H2>Median TS compilation time</H2>
    <label>Timing measure <select value={metric} onChange={event => setMetric(event.target.value)}><option value="wall">Process wall time</option><option value="compile">Compilation after loading</option></select></label>
    <BarChart categories={results.map(row => row.workload)} series={['T00+S','T11'].map((engine,i) => ({name:engine,data:results.map(row => row.engines[i][key]),tone:i === 0 ? 'neutral' : 'info'}))} valueSuffix=" ms" height={300} showValues />
    <Text>Horizontal axis: workload (corpus = sum of 92 fresh processes). Vertical axis: median milliseconds. Source: this repository benchmark, {data.date}; {data.warmups} discarded filesystem warm-up pass(es), no persistent compiler warm-up.</Text>
    <Table headers={['Workload','T00+S wall ms','T11 wall ms','T00+S/T11 ratio','T00+S peak MiB','T11 peak MiB']} rows={results.map(row => [row.workload,row.engines[0].medianWallMs.toFixed(2),row.engines[1].medianWallMs.toFixed(2),row.wallSpeedupT11.toFixed(2)+'×',row.engines[0].medianPeakRssMiB.toFixed(1),row.engines[1].medianPeakRssMiB.toFixed(1)])} />
    <Text>Ratio below 1 means T11 is slower. Peak memory is median per-pass maximum RSS, not summed process memory.</Text>
    <H2>Compiler availability</H2>
    <Table headers={['Compiler','Status','Meaning']} rows={data.availability.map(row => [row.compiler,row.status,row.role])} />
    <H2>Full-source self-compilation probes</H2>
    <Table headers={['Engine','Outcome','Observed seconds']} rows={data.selfCompilation.map(row => [row.engine,row.outcome,(row.wallMs/1000).toFixed(2)])} />
    <Text>One fresh invocation each, limited to {data.selfTimeoutMs/1000} seconds. A timeout is censored: no successful self-build timing or ratio follows from it.</Text>
    <H2>T00 parser/checker context</H2>
    <Table headers={['Input','Median process wall ms','Median parser/checker ms']} rows={data.results.filter(row => row.comparableCodegen === false).map(row => [row.workload,row.engines[0].medianWallMs.toFixed(2),row.engines[0].medianCompileMs.toFixed(2)])} />
    <Text>{data.pairedComparisons} paired comparisons matched exact streams/status/signal. Artifact strict typecheck passed. Output equivalence does not establish full-language support. No generated-program runtime or TypeScript checking time is included.</Text>
  </Stack>;
}
