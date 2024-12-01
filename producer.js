const {Kafka} = require('kafkajs')
const {SchemaRegistry, SchemaType} = require('@kafkajs/confluent-schema-registry')

const schema = {
    type: "record",
    name: "VideoGame",
    namespace: "video_game.avro",
    fields: [
        {name: "id", type: "int"},
        {name: "title", type: "string"},
        {name: "year", type: "int"},
    ]
}

const registry = new SchemaRegistry({host: 'http://localhost:8085/'})

const message = {id: 2, title: "Crash Bandicoot", year: 1997}

const kafka = new Kafka({clientId: "my-app", brokers: ["localhost:9092"]})
const producer = kafka.producer()
const produce = async (message) => {
    const {id} = await registry.register({
        type: SchemaType.AVRO,
        schema: JSON.stringify(schema)
    }, {subject: "video-game-topic-value"})
    await producer.connect()
    const encodedMessage = await registry.encode(id, message)
    console.log("sending message...")
    await producer.send({
        topic: 'video-game-topic',
        messages: [
            {
                key: message.id.toString(),
                value: encodedMessage
            },
        ],
    })
    console.log("message sent")
    await producer.disconnect()
}

produce(message).then(r => console.log("done")).catch(e => console.error(e))