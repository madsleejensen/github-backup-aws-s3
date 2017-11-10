const GitHubApi = require("github")
const stream = require("stream")
const request = require("request")
const aws = require("aws-sdk")
const Promise = require("bluebird")

const github = new GitHubApi()
const requiredOptions = [
  "githubAccessToken",
  "s3BucketName",
  "s3AccessKeyId",
  "s3AccessSecretKey"
]

module.exports = function(options) {
  requiredOptions.forEach(key => {
    if (!options[key]) {
      console.error("missing option `" + key + "`")
      process.exit(1)
    }
  })

  function getAllRepos() {
    return new Promise((resolve, reject) => {
      github.authenticate({
        type: "token",
        token: options.githubAccessToken
      })

      let repos = []

      if (options.mode === "organisation") {
        console.log("Running in Organisation mode")
        github.repos.getForOrg(
          { org: options.organisation, per_page: 100 },
          handleReposResponse
        )
      } else {
        // Assume get all repos current user has access to
        console.log("Running in User mode")
        github.repos.getAll({ per_page: 100 }, handleReposResponse)
      }

      function handleReposResponse(err, res) {
        if (err) {
          reject(err)
          return
        }

        repos = repos.concat(res["data"])
        if (github.hasNextPage(res)) {
          github.getNextPage(res, handleReposResponse)
        } else {
          resolve(repos)
        }
      }
    })
  }

  function copyReposToS3(repos) {
    console.log("Found " + repos.length + " repos to backup")
    console.log("-------------------------------------------------")

    const date = new Date().toISOString()
    const s3 = new aws.S3({
      accessKeyId: options.s3AccessKeyId,
      secretAccessKey: options.s3AccessSecretKey
    })

    const uploader = Promise.promisify(s3.upload.bind(s3))
    const tasks = repos.map(repo => {
      const passThroughStream = new stream.PassThrough()
      const arhiveURL =
        "https://api.github.com/repos/" +
        repo.full_name +
        "/tarball/master?access_token=" +
        options.githubAccessToken
      const requestOptions = {
        url: arhiveURL,
        headers: {
          "User-Agent": "nodejs"
        }
      }

      request(requestOptions).pipe(passThroughStream)

      const bucketName = options.s3BucketName
      const objectName = date + "/" + repo.full_name + ".tar.gz"
      const params = {
        Bucket: bucketName,
        Key: objectName,
        Body: passThroughStream,
        StorageClass: options.s3StorageClass || "STANDARD",
        ServerSideEncryption: "AES256"
      }

      return uploader(params).then(result => {
        console.log("[✓] " + repo.full_name + ".git - backed up")
      })
    })

    return Promise.all(tasks)
  }

  return getAllRepos().then(copyReposToS3)
}
