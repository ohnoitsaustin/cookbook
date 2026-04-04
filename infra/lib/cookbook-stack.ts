import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export class CookbookStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ── VPC ────────────────────────────────────────────────────────────────
    // Public subnets only — no NAT gateway avoids the ~$32/mo charge.
    // Amplify Hosting SSR Lambda connects to RDS via the public endpoint;
    // access is restricted to authenticated users via password + SSL.
    const vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        {
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
      ],
    });

    // ── RDS Security Group ──────────────────────────────────────────────────
    const dbSecurityGroup = new ec2.SecurityGroup(this, 'DbSecurityGroup', {
      vpc,
      description: 'Allow PostgreSQL access to cookbook RDS',
    });
    // Allow inbound Postgres from anywhere — credentials + SSL enforce access.
    // After deployment you can lock this to your Amplify region's IP range if desired.
    dbSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(5432),
      'PostgreSQL',
    );

    // ── RDS PostgreSQL ──────────────────────────────────────────────────────
    // Credentials are auto-generated and stored in Secrets Manager at /cookbook/db-credentials.
    // Retrieve them after deploy: aws secretsmanager get-secret-value --secret-id /cookbook/db-credentials
    const database = new rds.DatabaseInstance(this, 'Database', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16,
      }),
      // t4g.micro: cheapest option (~$13/mo), ARM-based, more than enough for a personal app
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
      credentials: rds.Credentials.fromGeneratedSecret('cookbookadmin', {
        secretName: '/cookbook/db-credentials',
      }),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      securityGroups: [dbSecurityGroup],
      databaseName: 'cookbook',
      multiAz: false,
      allocatedStorage: 20,
      storageType: rds.StorageType.GP2,
      publiclyAccessible: true,
      deletionProtection: true,
      backupRetention: cdk.Duration.days(7),
      storageEncrypted: true,
    });

    // ── S3 Bucket ───────────────────────────────────────────────────────────
    const imagesBucket = new s3.Bucket(this, 'ImagesBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN, // keep images if stack is destroyed
    });

    // ── CloudFront ──────────────────────────────────────────────────────────
    const oac = new cloudfront.S3OriginAccessControl(this, 'ImageOAC', {
      description: 'OAC for cookbook recipe images',
    });

    const distribution = new cloudfront.Distribution(this, 'ImagesCdn', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(imagesBucket, {
          originAccessControl: oac,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
      },
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // US, Canada, Europe
    });

    // ── IAM user for the app (S3 uploads) ───────────────────────────────────
    // Amplify Hosting Lambda functions already run with an execution role, but
    // that role can't directly reference a bucket that doesn't exist yet at
    // Amplify setup time. Using a dedicated IAM user + static credentials
    // (stored in Amplify env vars as APP_AWS_ACCESS_KEY_ID / APP_AWS_SECRET_ACCESS_KEY)
    // is simpler and avoids cross-service role confusion.
    const appUser = new iam.User(this, 'AppUser', {
      userName: 'cookbook-app',
    });
    imagesBucket.grantReadWrite(appUser);

    // Store the access key in Secrets Manager so the plaintext secret is never
    // visible in CloudFormation outputs.
    // Retrieve after deploy:
    //   aws secretsmanager get-secret-value --secret-id /cookbook/app-credentials
    const accessKey = new iam.CfnAccessKey(this, 'AppUserAccessKey', {
      userName: appUser.userName,
    });

    new secretsmanager.CfnSecret(this, 'AppCredentialsSecret', {
      name: '/cookbook/app-credentials',
      description: 'AWS credentials for the cookbook app to access S3',
      secretString: JSON.stringify({
        accessKeyId: accessKey.ref,
        secretAccessKey: accessKey.attrSecretAccessKey,
      }),
    });

    // ── Outputs ─────────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, 'DbEndpoint', {
      value: database.instanceEndpoint.hostname,
      description: 'DB_HOST — RDS endpoint to set in Amplify env vars',
    });

    new cdk.CfnOutput(this, 'DbSecretArn', {
      value: database.secret!.secretArn,
      description: 'Retrieve DB password: aws secretsmanager get-secret-value --secret-id /cookbook/db-credentials',
    });

    new cdk.CfnOutput(this, 'ImagesBucketName', {
      value: imagesBucket.bucketName,
      description: 'AWS_S3_BUCKET — set in Amplify env vars',
    });

    new cdk.CfnOutput(this, 'CloudFrontUrl', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'CLOUDFRONT_URL — set in Amplify env vars',
    });

    new cdk.CfnOutput(this, 'AppCredentialsSecretArn', {
      value: `/cookbook/app-credentials`,
      description: 'Retrieve APP_AWS_ACCESS_KEY_ID and APP_AWS_SECRET_ACCESS_KEY: aws secretsmanager get-secret-value --secret-id /cookbook/app-credentials',
    });
  }
}
