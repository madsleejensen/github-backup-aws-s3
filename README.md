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

```serverless deploy```
