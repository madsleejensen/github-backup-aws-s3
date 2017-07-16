const backup = require('./backup');

require('dotenv').config();

const options = {
  githubAccessToken: process.env.GITHUB_ACCESS_TOKEN,
  s3BucketName: process.env.AWS_S3_BUCKET_NAME,
  s3AccessKeyId: process.env.AWS_S3_ACCESS_KEY_ID,
  s3AccessSecretKey: process.env.AWS_S3_ACCESS_SECRET_KEY,
  s3StorageClass: process.env.AWS_S3_STORAGE_CLASS,
};

backup(options).then(
  () => {
    console.log('');
    console.log('all repos was succesfully backed up');
  },
  error => {
    console.log('');
    console.error(error);
  }
);
