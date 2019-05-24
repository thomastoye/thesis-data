const ArgumentParser = require('argparse').ArgumentParser;

const parser = new ArgumentParser({
  version: '0.0.1',
  addHelp:true,
  description: 'Query generator'
});

parser.addArgument(['--dataset'], { choices: [ 'baseline', 'iot', 'movielens', 'stocks' ], required: true});
parser.addArgument(['--db'], { choices: [ 'influxdb', 'opentsdb' ], required: true });

const args = parser.parseArgs();

const dataSet = args.dataset;
const db = args.db;

const queries = {
  baseline: {
    influxdb: [
      `select * from benchmark where time > 1546300800000000000 and time < 1546300803000000000 and tag1 = 'TAG_1_8' and tag2 = 'TAG_2_6'`
    ],
    opentsdb: [
      `start=1546300800000&end=1546300803000&m=none:benchmark\{tag1=TAG_1_8,tag2=TAG_2_6\}`,
    ],
  },
  iot: {
    influxdb: [
      'select mean(globalactivepower) from globalactivepower where time > 1166289840000000000 and time < 1225689780000000000 group by time(2w)',
      'select mean(globalactivepower) from globalactivepower where time > 1166289840000000000 and time < 1225689780000000000 group by time(1d)',
    ],
    opentsdb: [
    ],
  },
  movielens: {
    influxdb: [
    ],
    opentsdb: [
    ],
  },
  stocks: {
    influxdb: [
    ],
    opentsdb: [
    ],
  }
};

let createLine;

if (db === 'influxdb') {
  createLine = (query) => `GET http://10.2.0.42:8086/query?db=benchmark_db&q=${encodeURIComponent(query)}`;
} else if (db === 'opentsdb') {
  createLine = (query) => `GET http://10.2.0.42:4242/api/query?${query}`;
}

queries[dataSet][db].forEach(query => console.log(createLine(query)));

