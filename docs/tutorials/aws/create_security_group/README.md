![Scrapoxy](https://raw.githubusercontent.com/fabienvauchelles/scrapoxy/master/docs/logo.png)


# Tutorial: AWS / Create a security group

## Step 1: Connect to your AWS console

Go to [AWS console](https://console.aws.amazon.com).


## Step 2: Go to EC2 dashboard
 
![step_1](https://raw.githubusercontent.com/fabienvauchelles/scrapoxy/master/docs/tutorials/aws/create_security_group/step_1.jpg)


## Step 3: Create a Security Groups
 
1. Click on 'Security Groups'
2. Click on 'Create Security Group'

![step_2](https://raw.githubusercontent.com/fabienvauchelles/scrapoxy/master/docs/tutorials/aws/create_security_group/step_2.jpg)


## Step 4: Fill the Security Groups
 
1. Fill the name and the description with 'forward-proxy'
2. Fill the Inbound rule with Type='Custom TCP Rule', Port Range=3128, Source=Anywhere
3. Click on 'Create'

![step_3](https://raw.githubusercontent.com/fabienvauchelles/scrapoxy/master/docs/tutorials/aws/create_security_group/step_3.jpg)
