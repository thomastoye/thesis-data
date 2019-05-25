const ArgumentParser = require('argparse').ArgumentParser;
const csv = require('csv-stream')
const transform = require('stream-transform')
const fs = require('fs');

const parser = new ArgumentParser({
  version: '0.0.1',
  addHelp:true,
  description: 'Data converter'
});

parser.addArgument(['--dataset', '--data-set'], { choices: [ 'baseline', 'iot', 'movielens', 'stocks' ], required: true});
parser.addArgument(['--db'], { choices: [ 'influxdb', 'opentsdb', 'kairosdb' ], required: true });
parser.addArgument(['--std-out'], { help: 'Write to std out instead of to file', defaultValue: false, constant: true, nargs: 0 });

const args = parser.parseArgs();

const dataSet = args.dataset;
const db = args.db;
const stdOut = Array.isArray(args.std_out);

// Data point definition:
// { timestamp: 1111..., metric: '...', tags: [ { name: '...', value: '...' } ], value: 11... }

const baselineRowToDataPoint = (row) => {
  return {
    timestamp: Math.floor(Number(row.timestamp)),
    metric: row.metric,
    value: row.value,
    tags: [ { name: 'tag1', value: row.tag1 }, { name: 'tag2', value: row.tag2 } ]
  };
};

const stockRowToDataPoint = (row) => {
  return {
    timestamp: Math.floor(Number(row.timestamp)),
    metric: row.metric,
    value: row.value === '?' ? 0 : row.value,
    tags: [ { name: 'stock', value: row.stock} ]
  };
};

const iotRowToDataPoint = (row) => ({
  timestamp: Math.floor(Number(row.timestamp)),
  metric: row.variable,
  value: row.value === '?' ? 0 : row.value,
  tags: [ ]
});

const movielensRowToDataPoint = (row) => ({
  timestamp: Math.floor(Number(row.timestamp)),
  metric: 'ratings',
  value: Number(row.value),
  tags: [
    { name: 'userid', value: row.userid },
    { name: 'title', value: row.title },
    { name: 'genres', value: row.genres },
    { name: 'imdbid', value: row.imdbid },
    { name: 'tmdbid', value: row.tmdbid }
  ]
});


const dataSets = {
  baseline: {
    dataSet: '../data_sets/baseline.csv',
    toDataPoint: baselineRowToDataPoint
  },
  iot: {
    dataSet: '../data_sets/iot.csv',
    toDataPoint: iotRowToDataPoint,
  },
  movielens: {
    dataSet: '../data_sets/movielens.csv',
    toDataPoint: movielensRowToDataPoint,
  },
  stocks: {
    dataSet: '../data_sets/stocks.csv',
    toDataPoint: stockRowToDataPoint,
  }
};

const filterEmptyTags = (tags) => tags.filter(tag => tag.name && tag.value);
const cleanTagValue = (value) => value.replace(/ /g, '_').replace(/\"/g, '').replace(/[^a-zA-Z_1-9]/g, '') || 'emtpy';

const databases = {
  influxdb: {
    toRow: (dp) => `${[ dp.metric, ...filterEmptyTags(dp.tags).map(tag => tag.name + '=' + cleanTagValue(tag.value)) ].join(',')} ${dp.metric}=${dp.value} ${Math.round(dp.timestamp) * 1000000000}\n`
  },
  opentsdb: {
    toRow: (dp) => {
      tags = {};
      filterEmptyTags(dp.tags).forEach(tag => tags[tag.name] = cleanTagValue(tag.value));

      if (Object.keys(tags).length === 0) {
        tags['notags'] = 'true';
      }

      return JSON.stringify({
        metric: dp.metric,
        timestamp: dp.timestamp*1000,
        value: Number(dp.value) || 0,
        tags,
      }) + '\n';
    }
  },
  kairosdb: {
    toRow: (dp) => {
      const tags = filterEmptyTags(dp.tags).map(tag => `${tag.name}=${cleanTagValue(tag.value)}`).join(' ') || 'notags=true';

      return `put ${dp.metric} ${dp.timestamp} ${Number(dp.value)} ${tags}\n`;
    },
  }
};

const line2dp = dataSets[dataSet].toDataPoint;
const dp2row = databases[db].toRow;

const csvStream = csv.createStream();
const inputFile = fs.createReadStream(dataSets[dataSet].dataSet);
const outputStream = stdOut ? process.stdout : fs.createWriteStream(`../data_sets/${dataSet}-${db}.txt`);

const transformer = transform((record, callback) => callback(null, dp2row(line2dp(record))), {
  parallel: 5
});

inputFile.pipe(csvStream).pipe(transformer).pipe(outputStream);

