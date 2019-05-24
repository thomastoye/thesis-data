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
      [ `select open from open where stock = 'PLACEHOLDER' and time < 483840000000000000`, ['wash', 'ltc', 'jbht', 'fdx'] ],
      [ `select min(close) from close where stock = 'PLACEHOLDER' and time < 483840000000000000`, ['umh', 'utx', 'ba', 'f', 'csco'] ],
      [ `select max(open) from open where stock = 'PLACEHOLDER' and time < 483840000000000000`, ['xom', 'cvx', 'mmm'] ],
      [ `select mean(high) from high where stock = 'PLACEHOLDER' and time < 483840000000000000 group by time(1w)`, ['gt', 'hon', 'duk', 'pdco', 'nvda'] ],
      [ `select sum(volume) from volume where stock = 'PLACEHOLDER' and time < 483840000000000000 group by time(4w)`, ['mrk', 'pg', 'cost'] ],
    ],
    opentsdb: [
      [ `start=0&end=483840000000&m=none:open\{stock=PLACEHOLDER\}`, ['wash', 'ltc', 'jbht', 'fdx'] ],
      [ `start=0&end=483840000000&m=min:0all-min:close\{stock=PLACEHOLDER\}`, ['umh', 'utx', 'ba', 'f', 'csco'] ],
      [ `start=0&end=483840000000&m=max:0all-max:open\{stock=PLACEHOLDER\}`, ['xom', 'cvx', 'mmm'] ],
      [ `start=0&end=483840000000&m=avg:1w-avg:high\{stock=PLACEHOLDER\}`, ['gt', 'hon', 'duk', 'pdco', 'nvda'] ],
      [ `start=0&end=483840000000&m=sum:4w-sum:volume\{stock=PLACEHOLDER\}`, ['mrk', 'pg', 'cost'] ],
    ],
  }
};

let encode;

if (db === 'influxdb') {
  encode = (query) => `GET http://10.2.0.42:8086/query?db=benchmark_db&q=${encodeURIComponent(query)}`;
} else if (db === 'opentsdb') {
  encode = (query) => `GET http://10.2.0.42:4242/api/query?${query}`;
}

const createLines = (query) => {
  if (typeof query === 'string') {
    return [ encode(query) ];
  } else {
    return query[1].map(placeholderValue => {
      return encode(query[0].replace('PLACEHOLDER', placeholderValue));
    });
  }
}

queries[dataSet][db].forEach(query => createLines(query).forEach(line => console.log(line)));

