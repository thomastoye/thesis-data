const csv = require('csv-stream')
const transform = require('stream-transform')
const fs = require('fs');

// Data point definition:
// { timestamp: 1111..., metric: '...', tags: [ { name: '...', value: '...' } ], value: 11... }

const dataSet = 'baseline'; // baseline | iot | movielens | stocks
const db = 'opentsdb'; // influxdb | opentsdb


const baselineRowToDataPoint = (row) => {
  return {
    timestamp: row.timestamp,
    metric: row.metric,
    value: row.value,
    tags: [ { name: 'tag1', value: row.tag1 }, { name: 'tag2', value: row.tag2 } ]
  };
};

const stockRowToDataPoint = (row) => {
  return {
    timestamp: row.timestamp,
    metric: row.metric,
    value: row.value === '?' ? 0 : row.value,
    tags: [ { name: 'stock', value: row.stock} ]
  };
};

const iotRowToDataPoint = (row) => ({
  timestamp: Math.floor(Number(row.timestamp)),
  metric: row.variable,
  value: row.value,
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

const databases = {
  influxdb: {
    toRow: (dp) => `${dp.metric},${filterEmptyTags(dp.tags).map(tag => tag.name + '=' + tag.value.replace(/ /g, '_').replace(/\"/g, '')).join(',')} ${dp.metric}=${dp.value} ${Math.round(dp.timestamp)}\n`
    // when to tags (drop trailing comma): toRow: (dp) => `${dp.metric} ${dp.metric}=${dp.value} ${Math.round(dp.timestamp)}\n`
  },
  opentsdb: {
    toRow: (dp) => {
      return JSON.stringify({
        metric: dp.metric,
        timestamp: dp.timestamp*1000,
        value: Number(dp.value),
        tags: filterEmptyTags(dp.tags),
      }) + '\n';
    }
  },
};

const line2dp = dataSets[dataSet].toDataPoint;
const dp2row = databases[db].toRow;

const csvStream = csv.createStream();
const inputFile = fs.createReadStream(dataSets[dataSet].dataSet);
const outputFile = fs.createWriteStream(`../data_sets/${dataSet}-${db}.txt`);

const transformer = transform((record, callback) => callback(null, dp2row(line2dp(record))), {
  parallel: 5
});

inputFile.pipe(csvStream).pipe(transformer).pipe(outputFile);

