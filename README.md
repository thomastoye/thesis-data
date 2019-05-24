Data pre-processing tools for my thesis.

## Running a benchmark

* Get the original data sets
* Pre-process, denormalize and inspect using `parse.ipynb`
* Convert data sets using `convert.js` (Python loads everything into RAM, which is slow or gets killed by the OOM reaper): `node convert.js --dataset=... --db=...`
* On the target, create the data containers
* Start one container and load the data from the client using `cat iot-opentsdb.txt | head -n1000000 | bulk_load_opentsdb -urls http://$HOST:4242`. The `head` can be omitted or increased, in this case it's used to ensure all DBs have the same data set. Make sure containers are ready before executing this command (e.g. OpenTSDB: add `sleep 90` before the command)
* Complete data loading for all containers
* Start one container on the DB host
* Start monitoring container statistics on the DB host
* Run benchmark like `node generate-queries.js --dataset=... --db=... | ./vegeta attack -rate=50 -duration=100s > results.bin`
* Use `cat results.bin > ./vegeta report` to analyze client-side report

### Creating the data containers

```
for DS in iot stocks movielens baseline;
  do docker create --name influxdb-${DS} -v $PWD/influxdb.conf:/etc/influxdb/influxdb.conf -v $PWD/docker-volumes/influxdb-${DS}:/var/lib/influxdb -p 8086:8086 influxdb:1.5;
done

for DS in iot stocks movielens baseline;
  do docker create --name opentsdb-${DS} -v $(pwd)/opentsdb.conf:/etc/opentsdb/opentsdb.conf -v $PWD/docker-volumes/opentsdb-${DS}:/data/hbase -p 4242:4242 petergrace/opentsdb-docker:latest;
done
```

#### `influxdb.conf`

Default, except with `max-series-per-database = 1000000000`.

#### `opentsdb.conf`

Default, except with `tsd.http.request.enable_chunked = true` and `tsd.http.request.max_chunk = 4096000`.

