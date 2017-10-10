const { INPUT } = require('./word');
const awardPoints = require('./controller/awardPoints');
const deductPoints = require('./controller/deductPoints');
const replyWithDumbledore = require('./controller/replyWithDumbledore');
const replyWithGithub = require('./controller/replyWithGithub');
const helpMessage = require('./controller/helpMessage');

function parseMessage(message) {
  /* todo: determine what if handle multiple messages? */
  const text = message.text.toLowerCase();

  if (text.includes(INPUT.POINTS_TO.CALL)) {
    awardPoints.call(this, message);
  } else if (text.includes(INPUT.POINTS_FROM.CALL)) {
    deductPoints.call(this, message);
  } else if (text.includes(INPUT.PROFESSOR.CALL) || text.includes(this.name)) {
    replyWithDumbledore.call(this, message);
  } else if (text.includes(INPUT.HELP.CALL)) {
    helpMessage.call(this, message);
  } else if (message.channel != null && message.channel === this.githubChannel) {
    replyWithGithub.call(this, message);
  }
}

module.exports = parseMessage;
