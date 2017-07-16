var GitHubApi = require("github");
var stream = require('stream');
var request = require('request');
var aws = require('aws-sdk');

var github = new GitHubApi();

module.exports = function(callback) {
  if (!process.env.GITHUB_ACCESS_TOKEN) {
    console.log('missing environment variable `GITHUB_ACCESS_TOKEN`');
    process.exit(1);
  }

  if (!process.env.AWS_S3_BUCKET_NAME) {
    console.log('missing environment variable `AWS_S3_BUCKET_NAME`');
    process.exit(1);
  }

  github.authenticate({
      type: "token",
      token: process.env.GITHUB_ACCESS_TOKEN
  });

  var repos = [];

  github.repos.getAll({ per_page: 100 }, handleReposResponse);

  function handleReposResponse(err, res) {
      if (err) {
        console.log('Error fetching github repos', err);
        return;
      }

      repos = repos.concat(res['data']);
      if (github.hasNextPage(res)) {
        github.getNextPage(res, handleReposResponse)
      } else {
        allReposLoaded(repos);
      }
  }

  function allReposLoaded (repos) {
    console.log('Found ' + repos.length + ' repos to backup');
    console.log('-------------------------------------------------');

    var date = new Date().toISOString();

    repos.forEach(repo => {
      var s3 = new aws.S3({
        accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY
      });

      var passThroughStream = new stream.PassThrough();

      var arhiveURL = 'https://api.github.com/repos/' + repo.full_name + '/tarball/master?access_token=' + process.env.GITHUB_ACCESS_TOKEN;
      var options = {
        url: arhiveURL,
        headers: {
          'User-Agent': 'nodejs'
        }
      };

      request(options).pipe(passThroughStream);

      var bucketName = process.env.AWS_S3_BUCKET_NAME;
      var objectName = date + '/' + repo.full_name + '.tar.gz';
      var params = {
        Bucket: bucketName,
        Key: objectName,
        Body: passThroughStream,
        StorageClass: process.env.AWS_S3_STORAGE_CLASS || 'STANDARD',
        ServerSideEncryption: 'AES256'
      };

      s3.upload(params, function(err, data) {
        if (err) {
          console.error('[x] ' + repo.full_name + '.git - failed to backup', err);
          return;
        }

        console.log('[✓] ' + repo.full_name + '.git - backed up')
      });
    })
  };
}
