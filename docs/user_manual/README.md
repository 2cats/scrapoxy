![Scrapoxy](https://raw.githubusercontent.com/fabienvauchelles/scrapoxy/master/docs/logo.png)


# User Manual

## Table of contents

- [Understand Scrapoxy](#understand-scrapoxy)
    - [Architecture](#architecture)
    - [Instances management](#instances-management)
    - [Requests](#requests)
- [Configuration](#configuration)
    - [Create configuration](#create-configuration)
    - [Options: Commander](#options-commander)
    - [Options: EC2](#options-ec2)
    - [Options: EC2 / Instance](#options-ec2--instance)
    - [Options: Instance](#options-instance)
    - [Options: Instance / Autorestart](#options-instance--autorestart)
    - [Options: Instance / Scaling](#options-instance--scaling)
    - [Options: Proxy](#options-proxy)
- [Control Scrapoxy with a REST API](#control-scrapoxy-with-a-rest-api)
    - [Authenticate request](#authenticate-request)
    - [Get all instances](#get-all-instances)
    - [Stop an instance](#stop-an-instance)
    - [Get the scaling](#get-the-scaling)
    - [Update the scaling](#update-the-scaling)
    - [Get the configuration](#get-the-configuration)
    - [Update the configuration](#update-the-configuration)


## Understand Scrapoxy

### Architecture

![Global Arch](https://raw.githubusercontent.com/fabienvauchelles/scrapoxy/master/docs/user_manual/global_arch.jpg)

Scrapoxy consists of 3 parts:

- the **master**, which routes requests to proxies;
- the **manager**, which starts and stops proxies;
- the **commander**, which provides a REST API to receive orders.

When Scrapoxy starts, the **manager** starts a new instance (if necessary), on the cloud.

When the scraper sends a HTTP request, the manager starts all others proxies.


### Instances management

#### How does the monitoring mechanism ?

1. the manager asks the cloud how many instances are alive. It is the **initial state**.
2. the manager creates a **target state**, with the new count of instance.
3. the manager generates the commands to reach **target state** from the **initial state**.
4. the manager sends the commands to the cloud.
 
These steps are very important because you cannot guess which is the initial state. 
An instance may be dead or Amazon can stop an instance...

Scrapoxy can restart an instance if:

- the instance is dead (stop status or no ping)
- the living limit is reached: Scrapoxy regulary restarts the instance to change the IP address.


#### Do I need to create an AMI (EC2 image) ?

By default, we provide you an AMI proxy instance. This is a CONNECT proxy opened on TCP port 3128.

But you can use every software which accept the CONNECT method (Squid, Tinyproxy, etc.).


### Requests

#### Do Scrapoxy can proxy HTTPS requests ?

Yes. However, Scrapoxy cannot use the CONNECT mechanism.

The scraper must send a HTTP request with an HTTPS URL in the *Location* header.

Example:

```
GET /index.html
Host: localhost:8888
Location: https://www.google.com/index.html
Accept: text/html
```

#### What is the proxy that returned the response ?
 
Scrapoxy adds to the response an HTTP header **x-cache-proxyname**.
 
This header contains the name of the proxy.



#### Can the scraper force the request to go through a specific proxy?

Yes. The scraper adds the proxy name in the header **x-cache-proxyname**.

When the scraper receives a response, this header is extracted.
The scraper adds this header to the next request.


## Configuration

### Create configuration

To create a new configuration, use:

```
$ scrapoxy init my-config.json
```


### Options: Commander

| Option              | Default value | Description |
|---------------------|---------------|-------------|
| port                | 8889          | TCP port of the REST API |
| password            | none          | Password to access to the commander |


### Options: EC2

For credentials, there is 2 choices:

1. Add credentials in the configuration file;
2. Or Use your own credentials (from profile, see http://docs.aws.amazon.com/AWSJavaScriptSDK/guide/node-configuring.html)

| Option              | Default value | Description |
|---------------------|---------------|-------------|
| accessKeyId         | none          | Credentials for AWS (optional) |
| secretAccessKey     | none          | Credentials for AWS (optional) |
| region              | none          | AWS region (example: eu-west-1) |
| instance            | none          | see [EC2 / Instance](#options-ec2--instance) |


### Options: EC2 / Instance

Options are specific to AWS EC2.

Scrapoxy use the method *[runInstances](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#runInstances-property)* to create new instances.

Standard options are *InstanceType*, *ImageId* and *SecurityGroups*.


### Options: Instance

| Option              | Default value | Description |
|---------------------|---------------|-------------|
| port                | none          | TCP port of your instance (example: 3128) |
| username            | none          | Credentials if your proxy instance needs them (optional) |
| password            | none          | Credentials if your proxy instance needs them (optional) |
| maxRunningInstances | none          | It is a security limit. Scrapoxy cannot create new instances if the current count and the count of new instances exceeds this limit |
| scaling             | none          | see [Instance / Scaling](#options-instance--scaling) |
| checkDelay          | 10000         | (in ms) Scrapoxy requests the status of instances to the cloud, every X ms |
| checkAliveDelay     | 20000         | (in ms) Scrapoxy pings instances every X ms |
| stopIfCrashedDelay  | 120000        | (in ms) Scrapoxy restarts an instance if it has been dead for X ms |
| autorestart         | none          | see [Instance / Autorestart](#options-instance--autorestart) |


### Options: Instance / Autorestart

Scrapoxy randomly restarts instance to change the IP address.

The delay is between mindelay and maxdelay.

| Option              | Default value | Description |
|---------------------|---------------|-------------|
| mindelay            | 3600000       | (in ms) Minimum delay |
| maxdelay            | 43200000      | (in ms) Maximum delay |


### Options: Instance / Scaling

| Option              | Default value | Description |
|---------------------|---------------|-------------|
| min                 | none          | Maximum count of instances at startup |
| max                 | none          | Maximum count of instances when using Scrapoxy |
| required            | none          | Actual count of instances (optional) |
| downscaleDelay      | 600000        | (in ms) Time to wait to remove unused instances when Scrapoxy is not in use |


### Options: Proxy

| Option              | Default value | Description |
|---------------------|---------------|-------------|
| port                | 8888          | TCP port of Scrapoxy |


## Control Scrapoxy with a REST API

By default, you can access to the commander at *http://localhost:8889*


### Authenticate request

Every requests must have an Authorization header.

The value is the hash **base64** of the password set in the configuration (commander/password).


### Get all instances

Request: 

```
GET http://localhost:8889/instances
```

Response (JSON):

**Status: 200**

The body contains all informations about instances.


### Stop an instance

Request: 

```
POST http://localhost:8889/instances/stop
```

JSON payload:

```
{
  "name": "<name of the proxy>"
}
```

Response (JSON):

**Status: 200**

The instance exists. 

Scrapoxy stops it. And the instance is restarted, with a new IP address.

he body contains the remaining count of alive instances.

```
{
  "alive": <count>
}
```


**Status: 404**

The instance does not exist.


### Get the scaling

Request: 

```
GET http://localhost:8889/scaling
```

Response (JSON):

**Status: 200**

The body contains all the configuration of the scaling.


### Update the scaling

Request: 

```
PATCH http://localhost:8889/scaling
```

JSON payload:

```
{
  "min": "min_scaling",
  "required": "required_scaling",
  "max": "max_scaling",
}
```

Response (JSON):

**Status: 200**

The scaling is updated.

**Status: 204**

The scaling is not updated.


### Get the configuration

Request: 

```
GET http://localhost:8889/config
```

Response (JSON):

**Status: 200**

The body contains all the configuration of Scrapoxy (including scaling).


### Update the configuration

Request: 

```
PATCH http://localhost:8889/config
```

JSON payload:

```
{
  "key_to_override": "<new_value>",
  "section": {
    "key2_to_override": "<new value>"
  }
}
```

Response (JSON):

**Status: 200**

The configuration is updated.

**Status: 204**

The configuration is not updated.
