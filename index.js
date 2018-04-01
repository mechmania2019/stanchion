const { promisify } = require('util')

const mongoose = require('mongoose')
const { Team } = require('mm-schemas')(mongoose)
const amqp = require('amqplib');

const RABBITMQ_URI = process.env.RABBITMQ_URI ||'amqp://localhost';
const STANCHION_QUEUE = `stanchionQueue`;
const RUNNER_QUEUE = `runnerQueue`;
mongoose.connect(process.env.MONGO_URL)
mongoose.Promise = global.Promise

async function getLatestCompetitiorScripts() {
  let teams = await Team.find().populate('latestScript').exec()
  return teams.map(x => x.latestScript).filter(Boolean)
}

async function matchmake(id) {
  const competitorScripts = await getLatestCompetitiorScripts();
  return competitorScripts.map(({key}) => ([id, key]));
}

async function main() {
  const conn = await amqp.connect(RABBITMQ_URI);
  const ch = await conn.createChannel();

  // input
  ch.assertQueue(STANCHION_QUEUE, {durable: true});
  // output
  ch.assertQueue(RUNNER_QUEUE, {durable: true});

  ch.consume(STANCHION_QUEUE, async message => {
    const id = message.content.toString();

    (await matchmake(id)).forEach(match => {
      console.log('Queueing up', match)
      ch.sendToQueue(RUNNER_QUEUE, Buffer.from(JSON.stringify(match)), {persistent: true})
    })
    ch.ack(message)
  }, {noAck: false})
}

main()