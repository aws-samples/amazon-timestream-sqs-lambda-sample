#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AmazonTimestreamSqsLambdaSampleStack } from '../lib/amazon-timestream-sqs-lambda-sample-stack';

const app = new cdk.App();
new AmazonTimestreamSqsLambdaSampleStack(app, process.env.CDK_SAMPLE_STACK_ID || 'AmazonTimestreamSqsLambdaSampleStack', {
  env: {
    account: process.env.CDK_SAMPLE_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_SAMPLE_REGION || process.env.CDK_DEFAULT_REGION
  }
});