Data pre-processing tools for my thesis.

## Running a benchmark

* Get the original data sets
* Pre-process, denormalize and inspect using `parse.ipynb`
* Convert data sets using `convert.js` (Python loads everything into RAM, which is slow or gets killed by the OOM reaper): `node convert.js --dataset=... --db=...`
* On the target, create the data containers
* Start one container and load the data from the client using `cat iot-opentsdb.txt | head -n1000000 | bulk_load_opentsdb -urls http://$HOST:4242`. The `head` can be omitted or increased, in this case it's used to ensure all DBs have the same data set. Make sure containers are ready before executing this command (e.g. OpenTSDB: add `sleep 90` before the command). For KairosDB, use the telnet loader then check size (`time cat data_sets/movielens-kairosdb.txt | head -n1000000 | nc -w 30 10.2.0.42 4242')
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

#### KairosDB with Cassandra

`docker-compose-kairosdb-cassandra-${DATASET}.yml`

```
version: "2"

networks:
  cass_net:
    driver: bridge

services:
  kairosdb-cassandra-$DATASET:
    image: elastisys/kairosdb:1.2.1
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "1"
    restart: always
    ports:
      - "8080:8080"
      - "4242:4242"
    networks:
      - cass_net
    environment:      
      - CASSANDRA_HOSTS=cassandra-$DATASET
      - CASSANDRA_PORT=9042

  cassandra-$DATASET:
    image: cassandra:3.11
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "1"
    restart: always
    ports:
      - "9042:9042"
    volumes:
      - ${PWD}/docker-volumes/cassandra-$DATASET:/var/lib/cassandra
    networks:
      - cass_net
    environment:
      - CASSANDRA_CLUSTER_NAME=test-cluster
```

#### KairosDB with ScyllaDB

`docker-compose-kairosdb-scylladb-${DATASET}.yml`

```
version: "2"

networks:
  cass_net:
    driver: bridge

services:
  kairosdb-scylladb-$DATASET:
    image: elastisys/kairosdb:1.2.1
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "1"
    restart: always
    ports:
      - "8080:8080"
      - "4242:4242"
    networks:
      - cass_net
    environment:      
      - CASSANDRA_HOSTS=scylladb-$DATASET
      - CASSANDRA_PORT=9042
# Use the following for data sets where you get batch errors / not all points could be loaded
# kairosdb.properties.template is the default from the container but with kairosdb.queue_processor.batch_size=${KAIROSDB_BATCH_SIZE} and kairosdb.queue_processor.min_batch_size=${KAIROSDB_MIN_BATCH_SIZE}
#      - KAIROSDB_BATCH_SIZE=100
#      - KAIROSDB_MIN_BATCH_SIZE=50
#    volumes:
#      - ${PWD}/kairosdb.properties.template:/opt/kairosdb/conf/kairosdb.properties.template

  scylladb-$DATASET:
    image: scylladb/scylla
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "1"
    restart: always
    ports:
      - "9042:9042"
    volumes:
      - ${PWD}/docker-volumes/scylladb-$DATASET:/var/lib/scylla
    networks:
      - cass_net
```

#### Using the Influx CLI to connect to a Docker container

Use `./influx-cli.sh <container-name>`. `influx-cli.sh`:

```
#!/bin/bash
echo $1

docker run -it --rm --link=${1} -e TERM=screen-256color influxdb:1.5 influx -host ${1}
```

### Logging Docker metrics

```
#!/bin/bash

# Usage: ./stats.sh name-of-container
# Logs metrics for a docker container to file in ./stats directory in CSV format
# Existing files will be overwritten

DURATION=300 # in seconds
START=$(date +%s)
END=$(expr $START + $DURATION)

echo $START
echo $END

# Add CSV header
echo "timestamp,container,memusage,memperc,cpuperc,netio,blkio" > ./stats/stats-${1}.csv

while [ $END -gt $(date +%s) ]
do
  docker stats --no-stream --format  "$(date +'%s'),{{ .Container }},{{ .MemUsage }},{{ .MemPerc }},{{ .CPUPerc }},{{ .NetIO }},{{ .BlockIO }}" $1 >> ./stats/stats-${1}.csv
done
```

### Smoke testing

```
# File created with node generate-queries.js --db=influxdb --dataset=stocks --output=siege > ./siege_urls/stocks-influxdb-siege.txt
$ http_load -parallel 10 -timeout 30 -seconds 30 ./siege_urls/stocks-influxdb-siege.txt
6426 fetches, 10 max parallel, 3.77533e+07 bytes, in 30 seconds
5875.08 mean bytes/connection
214.2 fetches/sec, 1.25844e+06 bytes/sec
msecs/connect: 0.244763 mean, 0.608 max, 0.106 min
msecs/first-response: 0.777712 mean, 19.781 max, 0.297 min
HTTP response codes:
  code 200 -- 6426
```

