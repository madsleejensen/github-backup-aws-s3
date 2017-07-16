var GitHubApi = require("github");
var stream = require('stream');
var request = require('request');
var aws = require('aws-sdk');

var github = new GitHubApi();
var requiredOptions = ['githubAccessToken', 's3BucketName', 's3AccessKeyId', 's3AccessSecretKey']

module.exports = function(options, callback) {
  requiredOptions.forEach(key => {
    if (!options[key]) {
      console.error('missing option `' + key + '`');
      process.exit(1);
    }
  })

  github.authenticate({
    type: "token",
    token: options.githubAccessToken
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
        accessKeyId: options.s3AccessKeyId,
        secretAccessKey: options.s3AccessSecretKey,
      });

      var passThroughStream = new stream.PassThrough();

      var arhiveURL = 'https://api.github.com/repos/' + repo.full_name + '/tarball/master?access_token=' + options.githubAccessToken;
      var requestOptions = {
        url: arhiveURL,
        headers: {
          'User-Agent': 'nodejs'
        }
      };

      request(requestOptions).pipe(passThroughStream);

      var bucketName = options.s3BucketName;
      var objectName = date + '/' + repo.full_name + '.tar.gz';
      var params = {
        Bucket: bucketName,
        Key: objectName,
        Body: passThroughStream,
        StorageClass: options.s3StorageClass || 'STANDARD',
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
