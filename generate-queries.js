const ArgumentParser = require('argparse').ArgumentParser;

const parser = new ArgumentParser({
  version: '0.0.1',
  addHelp:true,
  description: 'Query generator'
});

parser.addArgument(['--dataset'], { choices: [ 'baseline', 'iot', 'movielens', 'stocks' ], required: true});
parser.addArgument(['--db'], { choices: [ 'influxdb', 'opentsdb', 'kairosdb' ], required: true });

const args = parser.parseArgs();

const dataSet = args.dataset;
const db = args.db;

const host = '10.2.0.42';

const movieNames = [
  '12_Angry_Men_1957',
  'American_Nightmare',
  'Blues_Brothers_2_1998',
  'Bones_21',
  'Braddock_Missing_in_Action_III_1988',
  'Chasing_Amy_1997',
  'Children_of_Paradise_Les_enfants_du_paradis_1945',
  'Cobra_1925',
  'Easy_A_21',
  'Employee_of_the_Month_24',
  'Felon_28',
  'Gas',
  'Ice_Age_22',
  'Kevin__Perry_Go_Large_2',
  'Killing',
  'Lady_Jane_1986',
  'Majestic',
  'Zoom_26',
  'Tumbleweeds_1999',
  'Six_Days_Seven_Nights_1998',
];

iotTimeRanges = {
  oneWeek: [
    [ 1166289840, 1166289840 + 604800 ],
    [ 1166289840 + 14399940, 1166289840 + 14399940 + 604800 ],
    [ 1166289840 + 30000000, 1166289840 + 30000000 + 604800 ],
    [ 1166289840 + 40000000, 1166289840 + 40000000 + 604800 ],
    [ 1166289840 + 11111111, 1166289840 + 11111111 + 604800 ],
    [ 1166289840 + 22222222, 1166289840 + 22222222 + 604800 ],
    [ 1166289840 + 50000000, 1166289840 + 50000000 + 604800 ],
    [ 1166289840 + 44444444, 1166289840 + 44444444 + 604800 ],
  ],
  twoWeeks: [
    [ 1166289840, 1166289840 + 604800 * 2 ],
    [ 1166289840 + 14399940, 1166289840 + 14399940 + 604800 * 2 ],
    [ 1166289840 + 30000000, 1166289840 + 30000000 + 604800 * 2 ],
    [ 1166289840 + 40000000, 1166289840 + 40000000 + 604800 * 2 ],
    [ 1166289840 + 11111111, 1166289840 + 11111111 + 604800 * 2 ],
    [ 1166289840 + 22222222, 1166289840 + 22222222 + 604800 * 2 ],
    [ 1166289840 + 50000000, 1166289840 + 50000000 + 604800 * 2 ],
    [ 1166289840 + 44444444, 1166289840 + 44444444 + 604800 * 2 ],
  ],
  twelveWeeks: [
    [ 1166289840, 1166289840 + 604800 * 12 ],
    [ 1166289840 + 14399940, 1166289840 + 14399940 + 604800 * 12 ],
    [ 1166289840 + 30000000, 1166289840 + 30000000 + 604800 * 12 ],
    [ 1166289840 + 22222222, 1166289840 + 22222222 + 604800 * 12 ],
  ]
};

const queries = {
  baseline: {
    influxdb: [
      `select * from benchmark where time > 1546300800000000000 and time < 1546300803000000000 and tag1 = 'TAG_1_8' and tag2 = 'TAG_2_6'`
    ],
    opentsdb: [
      `start=1546300800000&end=1546300803000&m=none:benchmark\{tag1=TAG_1_8,tag2=TAG_2_6\}`,
    ],
    kairosdb: [
      JSON.stringify({ start_absolute: 1546300800000, end_absolute: 1546300803000, metrics: [ { name: "benchmark", tags: { tag1: 'TAG_1_8', tag2: 'TAG_2_6' } } ] }),
    ]
  },
  iot: {
    influxdb: [
      [ 'select mean(globalactivepower) from globalactivepower where PLACEHOLDER', iotTimeRanges.oneWeek.map(range => `time > ${range[0]}000000000 and time < ${range[1]}000000000`) ],
      [ 'select mean(globalactivepower) from globalactivepower where PLACEHOLDER group by time(1d)', iotTimeRanges.twoWeeks.map(range => `time > ${range[0]}000000000 and time < ${range[1]}000000000`) ],
      [ 'select mean(globalactivepower) from globalactivepower where PLACEHOLDER group by time(7d)', iotTimeRanges.twelveWeeks.map(range => `time > ${range[0]}000000000 and time < ${range[1]}000000000`) ],
    ],
    opentsdb: [
      [ `PLACEHOLDER&m=avg:0all-avg:globalactivepower`, iotTimeRanges.oneWeek.map(range => `start=${range[0]}000&end=${range[1]}000`) ],
      [ `PLACEHOLDER&m=avg:1d-avg:globalactivepower`, iotTimeRanges.twoWeeks.map(range => `start=${range[0]}000&end=${range[1]}000`) ],
      [ `PLACEHOLDER&m=avg:7d-avg:globalactivepower`, iotTimeRanges.twelveWeeks.map(range => `start=${range[0]}000&end=${range[1]}000`) ],
    ],
    kairosdb: [
      [ `{ PLACEHOLDER, metrics: [ { name: "globalactivepower", aggregators: [ { name: 'avg', sampling: { unit: 'weeks', value: 1 } } ] } ] }`,  iotTimeRanges.oneWeek.map(range => `start_absolute: ${range[0]}000, end_absolute: ${range[1]}000`) ],
      [ `{ PLACEHOLDER, metrics: [ { name: "globalactivepower", aggregators: [ { name: 'avg', sampling: { unit: 'days', value: 1 } } ] } ] }`,  iotTimeRanges.twoWeeks.map(range => `start_absolute: ${range[0]}000, end_absolute: ${range[1]}000`) ],
      [ `{ PLACEHOLDER, metrics: [ { name: "globalactivepower", aggregators: [ { name: 'avg', sampling: { unit: 'weeks', value: 1 } } ] } ] }`,  iotTimeRanges.twelveWeeks.map(range => `start_absolute: ${range[0]}000, end_absolute: ${range[1]}000`) ],
    ]
  },
  movielens: {
    influxdb: [
      [ `select mean(ratings) from ratings where title = 'PLACEHOLDER'`, movieNames.slice(0,14) ],
      [ `select mean(ratings) from ratings where imdbid = 'PLACEHOLDER'`, ['75686', '113189'] ],
      [ `select * from ratings where userid = 'PLACEHOLDER'`, ['4635'] ],
      [ `select mean(ratings) from ratings where title = 'PLACEHOLDER' group by time(365d)`, movieNames.slice(14, 17) ],
    ],
    opentsdb: [
      [ `start=0&m=avg:0all-avg:ratings{title=PLACEHOLDER}`, movieNames.slice(0, 14) ],
      [ `start=0&m=avg:0all-avg:ratings{imdbid=PLACEHOLDER}`, ['75686', '113189'] ],
      [ `start=0&m=avg:ratings{userid=PLACEHOLDER}`, ['4635'] ],
      [ `start=0&m=avg:365d-avg:ratings{title=PLACEHOLDER}`, movieNames.slice(14, 17) ],
    ],
    kairosdb: [
      [ `{ start_absolute: 0, metrics: [ {name: "ratings", tags: { title: 'PLACEHOLDER' }, aggregators: [ { name: 'avg', sampling: { unit: 'years', value: 25} } ] }] }`, movieNames.slice(0,14) ],
      [ `{ start_absolute: 0, metrics: [ {name: "ratings", tags: { imdbid: 'PLACEHOLDER' }, aggregators: [ { name: 'avg', sampling: { unit: 'years', value: 20 } } ] }] }`, ['75686', '113189']],
      [ `{ start_absolute: 0, metrics: [ {name: "ratings", tags: { userid: 'PLACEHOLDER' } }] }`, ['4635']],
      [ `{ start_absolute: 0, metrics: [ {name: "ratings", tags: { title: 'PLACEHOLDER' }, aggregators: [ { name: 'avg', sampling: { unit: 'days', value: 365 } } ] }] }`, movieNames.slice(14, 17) ],
    ]
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
      [ `start=0&end=483840000000&m=none:open{stock=PLACEHOLDER}`, ['wash', 'ltc', 'jbht', 'fdx'] ],
      [ `start=0&end=483840000000&m=min:0all-min:close{stock=PLACEHOLDER}`, ['umh', 'utx', 'ba', 'f', 'csco'] ],
      [ `start=0&end=483840000000&m=max:0all-max:open{stock=PLACEHOLDER}`, ['xom', 'cvx', 'mmm'] ],
      [ `start=0&end=483840000000&m=avg:1w-avg:high{stock=PLACEHOLDER}`, ['gt', 'hon', 'duk', 'pdco', 'nvda'] ],
      [ `start=0&end=483840000000&m=sum:4w-sum:volume{stock=PLACEHOLDER}`, ['mrk', 'pg', 'cost'] ],
    ],
    kairosdb: [
      [ `{ start_absolute: 0, absolute_end: 483840000000, metrics: [ {name: "open", tags: { stock: 'PLACEHOLDER' } }] }`, ['wash', 'ltc', 'jbht', 'fdx']],
      [ `{ start_absolute: 0, absolute_end: 483840000000, metrics: [ {name: "close", tags: { stock: 'PLACEHOLDER' }, aggregators: [ {name: 'min', sampling: { unit: 'years', value: 10 } } ] }] }`, ['umh', 'utx', 'ba', 'f', 'csco']],
      [ `{ start_absolute: 0, absolute_end: 483840000000, metrics: [ {name: "open", tags: { stock: 'PLACEHOLDER' }, aggregators: [ {name: 'max', sampling: { unit: 'years', value: 10 } } ] }] }`, ['xom', 'cvx', 'mmm']],
      [ `{ start_absolute: 0, absolute_end: 483840000000, metrics: [ {name: "high", tags: { stock: 'PLACEHOLDER' }, aggregators: [ {name: 'avg', sampling: { unit: 'weeks', value: 1 } } ] }] }`, ['gt', 'hon', 'duk', 'pdco', 'nvda']],
      [ `{ start_absolute: 0, absolute_end: 483840000000, metrics: [ {name: "volume", tags: { stock: 'PLACEHOLDER' }, aggregators: [ {name: 'sum', sampling: { unit: 'weeks', value: 4 } } ] }] }` ,['mrk', 'pg', 'cost']],
    ],
  }
};

let encode;

if (db === 'influxdb') {
  encode = (query) => `GET http://${host}:8086/query?db=benchmark_db&q=${encodeURIComponent(query)}`;
} else if (db === 'opentsdb') {
  encode = (query) => `GET http://${host}:4242/api/query?${query}`;
} else if (db === 'kairosdb') {
  encode = (query) => `GET http://${host}:8080/api/v1/datapoints/query?query=${encodeURIComponent(query)}`;
}

const createLines = (query) => {
  if (typeof query === 'string') {
    // String, no placeholders
    return [ encode(query) ];
  } else {
    // List, in the form ['query with PLACEHOLDER', ['value1', 'value2', ...]]
    return query[1].map(placeholderValue => {
      return encode(query[0].replace('PLACEHOLDER', placeholderValue));
    });
  }
}

queries[dataSet][db].forEach(query => createLines(query).forEach(line => console.log(line)));

