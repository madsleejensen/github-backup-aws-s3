# github-backup-to-s3

simply backup all your repos to a aws s3 bucket.

## Usage

copy `.env.example` and rename it `.env` and setup the config variables.


### deploy to aws lambda

install [Serverless Framework](https://github.com/serverless/serverless)
```
npm install -g serverless
```

optionally make modifications to serverless.yml and run

http://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html
```
serverless deploy -v --schedule-expression 'rate(2 hours)'
serverless deploy -v --schedule-expression 'rate(0 * * * ? *)'
serverless deploy -v --schedule-expression 'cron(*/5 * * * ? *)'
```
