#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CookbookStack } from '../lib/cookbook-stack';

const app = new cdk.App();

new CookbookStack(app, 'CookbookStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'us-east-1',
  },
  description: 'Cookbook app infrastructure: RDS, S3, CloudFront',
});
