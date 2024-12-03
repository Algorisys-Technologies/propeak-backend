const amqp = require("amqplib");
const {
  rabbitMQ_exchangeName,
  rabbitMQ_connectionKey,
  companyCode
} = require('../config/config');

let exchangeName = rabbitMQ_exchangeName;

let connection;

async function connect() {
  try {
    console.log("connecting")
    connection = await amqp.connect(rabbitMQ_connectionKey);
    console.log("Connected to RabbitMQ");
  } catch (error) {
    console.error("Error connecting to RabbitMQ:", error.message);
    throw error;
  }
}

async function sendMessageToQueue(msg, qName, routingKey) {
  try {
    await connect()
    let msgQueue = companyCode + qName;
    routingKey = companyCode + routingKey;

    const channel = await connection.createChannel();
    await channel.assertExchange(exchangeName, "direct", { durable: true });
    await channel.assertQueue(msgQueue, { exclusive: false , durable: true});
    await channel.bindQueue(msgQueue, exchangeName, routingKey);

    const message = JSON.stringify(msg);
    channel.publish(exchangeName, routingKey, Buffer.from(message));

    console.log("Message sent to queue:", message);

    await channel.close();
    return message;
  } catch (error) {
    console.error("Error sending message to queue:", error.message);
    throw error;
  }
}

async function receiveMessageFromQueue(qName) {
  try {
    await connect()
    let q = companyCode + qName;
    const channel = await connection.createChannel();
    const msgOrFalse = await channel.get(q, {durable: true });

    let result = "No messages in queue";
    if (msgOrFalse !== false) {
      result = JSON.parse(msgOrFalse.content.toString());
      channel.ack(msgOrFalse);
    }

    await channel.close();
    return result;
  } catch (error) {
    console.error("Error receiving message from queue:", error.message);
    throw error;
  }
}

async function getQueueMessageCount(queueName) {
  try {
      // Connect to RabbitMQ server
      const connection = await amqp.connect(rabbitMQ_connectionKey);
      const channel = await connection.createChannel();

      // Check the queue
      const queueInfo = await channel.checkQueue(queueName);

      console.log(`Queue ${queueName} has ${queueInfo.messageCount} message(s)`);

      // Close the connection
      await channel.close();
      await connection.close();

      return queueInfo.messageCount;
  } catch (error) {
      console.error('Error checking queue:', error);
  }
}



module.exports = {
  connect,
  sendMessageToQueue,
  receiveMessageFromQueue,
  getQueueMessageCount
};



