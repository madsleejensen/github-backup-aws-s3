var backup = require('./backup')

require('dotenv').config();

module.exports.runBackup = (event, context, callback) => {
  backup(callback);
};
