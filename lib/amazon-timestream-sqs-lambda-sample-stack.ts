import * as cdk from 'aws-cdk-lib';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import * as timestream from 'aws-cdk-lib/aws-timestream';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';

export class AmazonTimestreamSqsLambdaSampleStack extends cdk.Stack {
  private queue: cdk.aws_sqs.Queue;
  private database: cdk.aws_timestream.CfnDatabase;
  private table: cdk.aws_timestream.CfnTable;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.createSQSQueue();
    this.createTimestreamDatabase();
    this.createProcessSQSQueueLambda();
    this.createSampleDataLambda();
  }

  private createSQSQueue() {
    this.queue = new sqs.Queue(this, 'TimestreamDataSQSQueue', {
      queueName: process.env.CDK_SAMPLE_TIMESTREAM_DATA_QUEUE || 'TimestreamDataSQSQueue',
      visibilityTimeout: cdk.Duration.seconds(300)
    });

    new cdk.CfnOutput(this, 'SQSQueueName', { value: this.queue.queueName });
  }

  private createTimestreamDatabase() {
    const databaseName = process.env.CDK_SAMPLE_TIMESTREAM_DATABASE_NAME || 'SampleTimestreamDB';
    const tableName = process.env.CDK_SAMPLE_TIMESTREAM_TABLE_NAME || 'SampleTimestreamTable';

    new cdk.CfnOutput(this, 'TimestreamDatabaseName', { value: databaseName });
    new cdk.CfnOutput(this, 'TimestreamTableName', { value: tableName });

    this.database = new timestream.CfnDatabase(this, 'TimestreamDatabase', {
      databaseName
    });
    this.database.applyRemovalPolicy(RemovalPolicy.DESTROY);

    this.table = new timestream.CfnTable(this, 'TimestreamTable', {
      databaseName: databaseName,
      tableName: tableName,
      retentionProperties: {
        memoryStoreRetentionPeriodInHours: '24',
        magneticStoreRetentionPeriodInDays: '30',
      },
    });
    this.table.node.addDependency(this.database);
    this.table.applyRemovalPolicy(RemovalPolicy.DESTROY);
  }

  private createProcessSQSQueueLambda() {
    const processSQSFunction = new lambda.Function(this, 'TimestreamSQSLambdaProcessor', {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'sqstotimestream.handler',
      code: lambda.Code.fromAsset('lambda'),
      environment: {
        QUEUE_URL: this.queue.queueUrl,
        DATABASE_NAME: this.database.databaseName || '',
        TABLE_NAME: this.table.tableName || ''
      }
    });

    new cdk.CfnOutput(this, 'ProcessSQSLambdaFunctionName', { value: processSQSFunction.functionName });

    // Define an inline policy for the Timestream database
    const processSQSFunctionPolicy = new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'timestream:WriteRecords'
          ],
          resources: [this.table.attrArn],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'timestream:DescribeEndpoints'
          ],
          resources: ["*"],
        }),
      ],
    });

    // Attach the policy to the Lambda function's execution role
    processSQSFunction.role?.attachInlinePolicy(new iam.Policy(this, 'TimestreamLambdaWritePolicy', {
      document: processSQSFunctionPolicy
    }));

    this.queue.grantConsumeMessages(processSQSFunction);

    processSQSFunction.addEventSource(
      new SqsEventSource(this.queue, {
        batchSize: 100,
        maxBatchingWindow: Duration.seconds(60)
      })
    );
  }

  private createSampleDataLambda() {
    const sampleDataFunction = new lambda.Function(this, 'TimestreamSQSLambdaSampleData', {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'sampledatapushtosqs.handler',
      code: lambda.Code.fromAsset('lambda'),
      environment: {
        QUEUE_URL: this.queue.queueUrl
      }
    });

    new cdk.CfnOutput(this, 'SampleDataLambdaFunctionName', { value: sampleDataFunction.functionName });
    new cdk.CfnOutput(this, 'SampleDataCLICommand', { value: 'aws lambda invoke --function-name ' + sampleDataFunction.functionName + ' --payload {} output.json' });

    this.queue.grantSendMessages(sampleDataFunction);
  }
}