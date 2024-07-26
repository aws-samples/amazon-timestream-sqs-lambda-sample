const { SQSClient, SendMessageBatchCommand } = require("@aws-sdk/client-sqs");
const sqs = new SQSClient({ apiVersion: '2012-11-05' });

const queueUrl = process.env.QUEUE_URL;

exports.handler = async (event) => {
    try {
        const timestamp = new Date().getTime().toString();
        const data = [
            { device_id: 'device1', sensor_id: 'sensor1', measurement_name: 'temperature', measurement_value: getRandomFloat(20, 30), timestamp: timestamp },
            { device_id: 'device1', sensor_id: 'sensor2', measurement_name: 'humidity', measurement_value: getRandomInt(50, 70), timestamp: timestamp },
            { device_id: 'device2', sensor_id: 'sensor1', measurement_name: 'temperature', measurement_value: getRandomFloat(18, 26), timestamp: timestamp },
            { device_id: 'device2', sensor_id: 'sensor2', measurement_name: 'humidity', measurement_value: getRandomInt(40, 60), timestamp: timestamp },
            { device_id: 'device3', sensor_id: 'sensor1', measurement_name: 'temperature', measurement_value: getRandomFloat(22, 28), timestamp: timestamp },
            { device_id: 'device3', sensor_id: 'sensor2', measurement_name: 'humidity', measurement_value: getRandomInt(55, 75), timestamp: timestamp }
        ];

        const messages = data.map(record => ({
            Id: `${record.device_id}-${record.sensor_id}-${Date.now()}`,
            MessageBody: JSON.stringify(record)
        }));

        const params = {
            QueueUrl: queueUrl,
            Entries: messages
        };

        const sendMessageBatchCommand = new SendMessageBatchCommand(params);
        const response = await sqs.send(sendMessageBatchCommand);
        console.log(response);

        return {
            statusCode: 200,
            body: 'Successfully generated and sent sample data to SQS'
        };
    } catch (error) {
        console.log('Error:', error);
        return {
            statusCode: 500,
            body: 'Error generating and sending sample data to SQS'
        };
    }
};

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomFloat(min, max) {
    return Math.random() * (max - min) + min;
}