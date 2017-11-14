const Parse = require('parse/node');
const { DB, OUTPUT } = require('../const');

async function awardPoints(message) {
  let point = 0;
  let userId = '';
  const botName = this.name;

  if (this.isReactionEvent(message)) {
    point = 10;
    userId = message.item_user;
  } else if (this.isChatMessageEvent(message)) {
    userId = ([(message.text.substring(message.text.indexOf('@') + 1).split('>')[0])]).join();
    point = parseInt(message.text.split(' ')[0].replace(/[^\d.]/g, ''), 10);
  }
  const userName = await this.convertToUserName(userId);
  // const user = message.item_user;
  if (typeof botName === 'undefined' || typeof userId === 'undefined' || typeof point === 'undefined') return;
  if (userName === botName) return this.slackBot.awardPointsCallback(message, OUTPUT.FAIL_POINT_TO);
  const Student = new Parse.Object(DB.STUDENT.CALL);
  const query = new Parse.Query(Student);
  query.equalTo(DB.STUDENT.BOT_ID, this.id);
  query.equalTo(DB.STUDENT.USER_ID, userId);

  try {
    const results = await query.first();
    results.increment(DB.STUDENT.POINT, point);
    results.save();
    if (this.isChatMessageEvent(message)) {
      this.slackBot.awardPointsCallback(message, OUTPUT.pointTo(results.attributes));
    } else if (this.isReactionEvent(message)) {
      this.slackBot.reactionPointsCallback(message, OUTPUT.reaction(results.attributes));
    }
  } catch (err) {
    console.log(err);
  }
}

module.exports = awardPoints;
