
![Kafka to PostgreSQL stream](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/1co3ba4u2d1z1iolapd9.png)

Here, you will find a step-by-step tutorial on how to setup a local environment with a **Kafka** Docker container, where its **events** topic are streamed into a **PostgreSQL** table using `JdbcSinkConnector`.


## Setup Docker containers
![Docker containers diagram](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/r9w9wc1fbvxkhvso4pc0.png)


### Download `kafka-connect-jdbc`
`kafka-connect-jdbc` is a plugin that can be **mounted** into a Kafka Connect container. Technically, the plugin is a `.jar` file that, when added to the Kafka Connect application, it enables the communication with databases.

`kafka-connect-jdbc` can be downloaded from [confluent](https://www.confluent.io/hub/confluentinc/kafka-connect-jdbc) website. or be running bellow commands:
```
curl -O  https://d2p6pa21dvn84.cloudfront.net/api/plugins/confluentinc/kafka-connect-jdbc/versions/10.8.0/confluentinc-kafka-connect-jdbc-10.8.0.zip
unzip confluentinc-kafka-connect-jdbc-10.8.0.zip
rm confluentinc-kafka-connect-jdbc-10.8.0.zip
```
### Docker compose
Next to `confluentinc-kafka-connect-jdbc-10.8.0` folder. then run `docker-compose up`

Make sure that all the containers are up & running, `docker ps` should show **4 containers** having `up` status:
- schema-registry-1
- kafka-connect-1
- kafka_connect_postgresql-1
- kafka-1


### Configure Kafka connect
Kafka connect container offers a [rest API](https://docs.confluent.io/platform/current/connect/references/restapi.html) to manage its connectors. In the scope of this tutorial we are only interested on the `/connectors` API.
To get the list of active connectors run
```
curl http://localhost:8083/connectors
```
Right now the list is just empty. Go ahead and create a new connector:
```
curl -X POST -H "Content-Type: application/json" -d '{
	"name": "postgres-sink-connector",
	"config": {
		"connector.class": "io.confluent.connect.jdbc.JdbcSinkConnector",
		"tasks.max": "1",
		"topics": "video-game-topic",
		"connection.url": "jdbc:postgresql://kafka_connect_postgresql:5432/postgres",
		"connection.user": "kafka",
		"connection.password": "kafka",
		"table.name.format": "video_games",
		"insert.mode": "upsert",
		"pk.mode": "record_value",
		"pk.fields": "id",
		"batch.size": "1000",
		"key.converter": "org.apache.kafka.connect.storage.StringConverter",
		"value.converter": "io.confluent.connect.avro.AvroConverter",
		"value.converter.schemas.enable": "true",
		"value.converter.schema.registry.url": "http://schema-registry:8085",
		"auto.create": "true"
	}
}' http://localhost:8083/connectors
```

### Implement a producer
Now that the infrastructure is ready. It is time to write a simple node application having as role: send kafka messages.
Try sending some messages to kafka by running couple of times the `producer` script.
```
npm install
node producer.js
node producer.js
node producer.js
```

At this point the messages are sitting on a topic named `video-game-topic`. Kafka connect is configured to consume messages from that topic and write them into a table named `video_games` in `public` schema located in postgres DB.

```
docker-compose exec -it kafka_connect_postgresql psql -U kafka -d postgres
SELECT * FROM video_games;
```
![SQL Query](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/akk9d96ihgx4ipb6gf3n.png)

Notice that we found only one row in the table, even though three messages were sent to the **Kafka topic**. This is because we configured **JdbcSinkConnector** to use the id field from the message content as the primary key and set the insert mode to upsert. As a result, the first message triggered an insert query, while the other two messages triggered update queries.