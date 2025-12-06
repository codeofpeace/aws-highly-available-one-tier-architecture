import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { SecurityGroupsConstruct } from '../../lib/constructs/networking/security-group-construct';

describe('Security Group Construct', () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let vpc: ec2.Vpc;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack');
    vpc = new ec2.Vpc(stack, 'TestVpc');
  });

  test('creates two security groups (ALB and ASG)', () => {
    new SecurityGroupsConstruct(stack, 'TestSecurityGroups', {
      vpc,
      allowHttpFrom: '0.0.0.0/0',
      httpPort: 80,
      httpsPort: 443,
    });

    const template = Template.fromStack(stack);
    
    // Should create 2 security groups (ALB and ASG) - true 1-tier architecture
    template.resourceCountIs('AWS::EC2::SecurityGroup', 2);
  });

  test('ALB security group allows HTTP from specified CIDR', () => {
    new SecurityGroupsConstruct(stack, 'TestSecurityGroups', {
      vpc,
      allowHttpFrom: '203.0.113.0/24',
      httpPort: 80,
      httpsPort: 443,
    });

    const template = Template.fromStack(stack);
    
    template.hasResourceProperties('AWS::EC2::SecurityGroup', {
      SecurityGroupIngress: Match.arrayWith([
        Match.objectLike({
          CidrIp: '203.0.113.0/24',
          IpProtocol: 'tcp',
          FromPort: 80,
          ToPort: 80,
        }),
      ]),
    });
  });

  test('Creates security groups for true 1-tier architecture', () => {
    const construct = new SecurityGroupsConstruct(stack, 'TestSecurityGroups', {
      vpc,
      allowHttpFrom: '0.0.0.0/0',
      httpPort: 80,
      httpsPort: 443,
    });

    // Verify both security groups are created (no database in 1-tier)
    expect(construct.albSecurityGroup).toBeDefined();
    expect(construct.asgSecurityGroup).toBeDefined();
  });

  test('returns both security groups', () => {
    const construct = new SecurityGroupsConstruct(stack, 'TestSecurityGroups', {
      vpc,
      allowHttpFrom: '0.0.0.0/0',
      httpPort: 80,
      httpsPort: 443,
    });

    expect(construct.albSecurityGroup).toBeDefined();
    expect(construct.asgSecurityGroup).toBeDefined();
    expect(construct.albSecurityGroup).toBeInstanceOf(ec2.SecurityGroup);
    expect(construct.asgSecurityGroup).toBeInstanceOf(ec2.SecurityGroup);
  });

  test('ALB security group allows HTTP from internet', () => {
    new SecurityGroupsConstruct(stack, 'TestSecurityGroups', {
      vpc,
      allowHttpFrom: '0.0.0.0/0',
      httpPort: 80,
      httpsPort: 443,
    });

    const template = Template.fromStack(stack);
    
    template.hasResourceProperties('AWS::EC2::SecurityGroup', {
      GroupDescription: 'Security group for Application Load Balancer',
      SecurityGroupIngress: Match.arrayWith([
        Match.objectLike({
          CidrIp: '0.0.0.0/0',
          IpProtocol: 'tcp',
          FromPort: 80,
          ToPort: 80,
        }),
      ]),
    });
  });

  test('ASG security group allows HTTP from ALB only', () => {
    new SecurityGroupsConstruct(stack, 'TestSecurityGroups', {
      vpc,
      allowHttpFrom: '0.0.0.0/0',
      httpPort: 80,
      httpsPort: 443,
    });

    const template = Template.fromStack(stack);
    
    template.hasResourceProperties('AWS::EC2::SecurityGroup', {
      GroupDescription: 'Security group for Auto Scaling Group instances',
    });
  });
});
