import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as AmazonTimestreamSqsLambdaSample from '../lib/amazon-timestream-sqs-lambda-sample-stack';

test('Items Created', () => {
    const app = new cdk.App();
    const stack = new AmazonTimestreamSqsLambdaSample.AmazonTimestreamSqsLambdaSampleStack(app, 'TestStack');
    const template = Template.fromStack(stack);
  
    template.resourceCountIs('AWS::SQS::Queue', 1);
  
    template.resourceCountIs('AWS::Lambda::Function', 2);
  
    template.resourceCountIs('AWS::Timestream::Database', 1);
  
    template.resourceCountIs('AWS::Timestream::Table', 1);
  });
