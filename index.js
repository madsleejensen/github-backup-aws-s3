require('dotenv').config()

var GitHubApi = require("github");
var stream = require('stream');
var request = require('request');
var aws = require('aws-sdk');

var github = new GitHubApi();

function getFormattedDate() {
  var date = new Date();
  var mm = date.getMonth() + 1; // getMonth() is zero-based
  var dd = date.getDate();

  return [
    date.getFullYear(),
    (mm > 9 ? '' : '0') + mm,
    (dd > 9 ? '' : '0') + dd
  ].join('-');
}

github.authenticate({
    type: "token",
    token: process.env.GITHUB_ACCESS_TOKEN
});

github.repos.getAll({
  type: 'owner',
  per_page: 100
}, function(err, result) {

  result.data.forEach(repo => {
    var s3 = new aws.S3();
    var passThroughStream = new stream.PassThrough();

    var arhiveURL = 'https://api.github.com/repos/' + repo.full_name + '/tarball/master?access_token=' + process.env.GITHUB_ACCESS_TOKEN;
    var options = {
      url: arhiveURL,
      headers: {
        'User-Agent': 'nodejs'
      }
    }

    request(options).pipe(passThroughStream)

    var bucketName = process.env.AWS_S3_BUCKET_NAME;
    var objectName = getFormattedDate() + '/' + repo.full_name + '.tar.gz';
    var params = {
      Bucket: bucketName,
      Key: objectName,
      Body: passThroughStream
    };

    s3.upload(params, function(err, data) {
      console.log('[✓] ' + repo.full_name + '.git - backed up')
    });
  })
})
