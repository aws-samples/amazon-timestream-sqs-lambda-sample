const AWS = require('aws-sdk');
const sqs = new AWS.SQS({ apiVersion: '2012-11-05' });
const timestreamWrite = new AWS.TimestreamWrite();

const queueUrl = process.env.QUEUE_URL;
const databaseName = process.env.DATABASE_NAME;
const TableName = process.env.TABLE_NAME;

exports.handler = async (event, context) => {
    try {
        const records = event.Records;

        const timestreamRecords = records.map(record => {
            const data = JSON.parse(record.body);
            const dimensions = [
                { Name: 'device_id', Value: data.device_id },
                { Name: 'sensor_id', Value: data.sensor_id }
            ];

            const measureName = data.measurement_name;
            const measureValue = data.measurement_value;

            return {
                Dimensions: dimensions,
                MeasureName: measureName,
                MeasureValue: measureValue.toString(),
                MeasureValueType: 'DOUBLE',
                Time: data.timestamp
            };
        });

        // Define the parameters for the Timestream write API
        const params = {
            DatabaseName: databaseName,
            TableName: TableName,
            Records: timestreamRecords
        };

        await timestreamWrite.writeRecords(params).promise();

        // Delete the processed messages from the SQS queue
        const deleteParams = {
            QueueUrl: queueUrl,
            Entries: records.map(record => ({
                Id: record.messageId,
                ReceiptHandle: record.receiptHandle
            }))
        };

        await sqs.deleteMessageBatch(deleteParams).promise();

        return {
            statusCode: 200,
            body: 'Successfully wrote records to Timestream and deleted messages from SQS'
        };
    } catch (error) {
        console.log('Error:', error);
        return {
            statusCode: 500,
            body: 'Error writing records to Timestream'
        };
    }
};
