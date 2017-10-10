const random = require('random-js')(); // uses the nativeMath engine
const getPointsFromDatabase = require('../helper/getPointsFromDatabase');
const botCommand = require('../helper/botCommand');
const { INPUT, OUTPUT, HOUSE } = require('../word');

async function getAllHouseScores(originalMessage, callback) {
  const channel = await this.getChannelById(originalMessage.channel);

  this.postMessageToChannel(channel.name, 'The House Points are: \n', { as_user: true }, () => {
    Object.values(HOUSE).forEach(house => {
      getPointsFromDatabase.call(this, originalMessage, house, callback);
    });
  });
}

function resetTheScores(originalMessage, callback) {
  this.db.run('UPDATE houses SET points = 0');
  callback(originalMessage, OUTPUT.RESET_SCORE, this);
}

function welcomeMessageManual(originalMessage) {
  botCommand.announcePlainString(originalMessage, OUTPUT.SAY_HELLO, this);
}

// Slacks API converts an @username reference in a message to the userid this converts it back to username.
function convertToUserName(bot, key) {
  return bot.users.find((userid) => {
    if (userid.id === key || userid.name === key) {
      return userid.name;
    }
    return false;
  });
}

function greetNewStudent(originalMessage, student, house) {
  botCommand.announcePlainString(originalMessage, OUTPUT.canIJoin(student, house), this);
}

function addStudentToHouse(originalMessage, house) {
  // const student = originalMessage.text.substring(originalMessage.text.indexOf('@') + 1).split('>')[0];
  const student = originalMessage.user;
  const studentUsername = convertToUserName(this, student);
  let notAlreadyStudent = true;
  const text = originalMessage.text.toLowerCase();

  this.db.all('SELECT * FROM students', (err, respond) => {
    if (err) {
      return console.error('DATABASE ERROR', err);
    }
    if (respond !== undefined) {
      respond.find((dbUser) => {
        if (dbUser.user_id === student) {
          // botCommand.announcePlainString(originalMessage, studentUsername + ' You are already in a house. Once You have been sorted in that house you shall remain. But fear not, if you give it a chance you will see there is much to gain.', bot);
          notAlreadyStudent = false;
          return true;
        }
        return false;
      });
    }
    if (notAlreadyStudent === true) {
      // current not allow multiple house since callback return true
      Object.values(HOUSE).filter(t => text.includes(t) || house === t).some(v => {
        this.db.run('INSERT INTO students (user_id, username, house) VALUES (?, ?, ?)', student, studentUsername, v, (_err) => {
          if (_err) {
            return console.error('DATABASE ERROR', _err);
          }
          greetNewStudent.call(this, originalMessage, studentUsername, v);
        });
        return true;
      });
    }
  });
}

function rollTheDice(originalMessage) {
  const house = random.integer(0, 3);

  addStudentToHouse.call(this, originalMessage, Object.values(HOUSE)[house], null);
}

function obliviate(originalMessage) {
  const student = originalMessage.text.substring(originalMessage.text.indexOf('@') + 1).split('>')[0];

  if (student === convertToUserName(this, originalMessage.user)) {
    this.db.run('DELETE FROM students WHERE user_id = ?', student, (err) => {
      if (err) {
        return console.error('DATABASE ERROR', err);
      }
      botCommand.announcePlainString(originalMessage, OUTPUT.OBLIVIATE, this);
    });
  }
}

function studentStats(originalMessage) {
  const student = originalMessage.text.substring(originalMessage.text.indexOf('@') + 1).split('>')[0];

  if (convertToUserName(this, student) !== 'dumbledore') {
    this.db.get('SELECT * FROM students WHERE user_id = ?', student, (err, record) => {
      if (err) {
        return console.error('DATABASE ERROR', err);
      }
      if (record !== undefined) {
        botCommand.announcePlainString(originalMessage, OUTPUT.TELL_ME_ABOUT.PERSON.student(record), this);
      } else {
        botCommand.announcePlainString(originalMessage, OUTPUT.TELL_ME_ABOUT.PERSON.NOT_FOUND, this);
      }
    });
  } else {
    botCommand.announcePlainString(originalMessage, OUTPUT.TELL_ME_ABOUT.PERSON.DUMBLEDORE, this);
  }
}

function bestStudent(originalMessage) {
  Object.values(HOUSE).forEach((house) => {
    this.db.get('SELECT * FROM students WHERE house = ? ORDER BY points_earned DESC', house, (err, record) => {
      if (err) {
        return console.error('DATABASE ERROR', err);
      }
      if (record !== undefined) {
        botCommand.announcePlainString(originalMessage, OUTPUT.getBestStudent(record), this);
      }
    });
  });
  botCommand.announcePlainString(originalMessage, OUTPUT.ABOUT_FROGS, this);
}

function worstStudent(originalMessage) {
  Object.values(HOUSE).forEach((house) => {
    this.db.get('SELECT * FROM students WHERE house = ? ORDER BY points_taken DESC', house, (err, record) => {
      if (err) {
        return console.error('DATABASE ERROR', err);
      }
      if (record !== undefined) {
        botCommand.announcePlainString(originalMessage, OUTPUT.getMeanestStudent(record), this);
      }
    });
  });
}

function getAllStudentsFromHouse(originalMessage, house) {
  this.db.all('SELECT * FROM students WHERE house = ? ', house, (err, record) => {
    if (err) {
      return console.error('DATABASE ERROR', err);
    }

    botCommand.announcePlainString(originalMessage, OUTPUT.TELL_ME_ABOUT.fromHouse(house, record), this);
  });
}

function tellMeAbout(originalMessage, house) {
  const text = originalMessage.text.toLowerCase();

  if (text.includes('@')) {
    studentStats.call(this, originalMessage);
  } else if (house) {
    getAllStudentsFromHouse.call(this, originalMessage, house);
  } else if (text.includes(INPUT.PROFESSOR.JASON_MOM)) {
    botCommand.announcePlainString(originalMessage, OUTPUT.TELL_ME_ABOUT.JASON_MOM, this);
  }
}

function getAllStudents(originalMessage) {
  this.db.all('SELECT * FROM students', (err) => {
    if (err) {
      return console.error('DATABASE ERROR', err);
    }
    Object.values(HOUSE).forEach((house) => {
      getAllStudentsFromHouse.call(this, originalMessage, house);
    });
  });
}

function explainSorting(originalMessage) {
  botCommand.announcePlainString(originalMessage, OUTPUT.START_SORTING, this);
}

function saveGitName(originalMessage) {
  const gitName = originalMessage.text.split('=')[1];
  const { user } = originalMessage;

  this.db.run('UPDATE students SET github_name = ? WHERE user_id = ?', gitName, user, (err) => {
    if (err) {
      return console.error('DATABASE ERROR', err);
    }
    botCommand.announcePlainString(originalMessage, OUTPUT.saveGitName(convertToUserName(this, user), gitName), this);
  });
}

async function forceSortRemaining(originalMessage) {
  const users = await this.getUsers();

  users.members.forEach((user) => {
    originalMessage.user = user.id;
    rollTheDice.call(this, originalMessage);
  });
}

function replyWithDumbledore(originalMessage) {
  const text = originalMessage.text.toLowerCase();
  const house = Object.values(HOUSE).find(v => text.includes(v));

  const parseCase = {
    [INPUT.PROFESSOR.GET_WINNER]: () => getAllHouseScores.call(this, originalMessage, botCommand.getAllHousePointsCallback),
    [INPUT.PROFESSOR.RESET_SCORE]: () => resetTheScores.call(this, botCommand.announcePlainString),
    [INPUT.PROFESSOR.SAY_HELLO]: () => welcomeMessageManual.call(this, originalMessage),
    [INPUT.PROFESSOR.CAN_I_JOIN]: () => addStudentToHouse.call(this, originalMessage, null, null /* this._studentJoinedHouse */),
    [INPUT.PROFESSOR.SORTING_HAT]: () => rollTheDice.call(this, originalMessage),
    [INPUT.PROFESSOR.OBLIVIATE]: () => obliviate.call(this, originalMessage),
    [INPUT.PROFESSOR.GET_BEST_STUDENT]: () => bestStudent.call(this, originalMessage),
    [INPUT.PROFESSOR.GET_MEANEST_STUDENT]: () => worstStudent.call(this, originalMessage),
    [INPUT.PROFESSOR.TELL_ME_ABOUT]: () => tellMeAbout.call(this, originalMessage, house),
    [INPUT.PROFESSOR.START_SORTING]: () => explainSorting.call(this, originalMessage),
    [INPUT.PROFESSOR.GET_HOGWARTS_ROSTER]: () => getAllStudents.call(this, originalMessage),
    [INPUT.PROFESSOR.SAVE_GIT_NAME]: () => saveGitName.call(this, originalMessage),
    [INPUT.PROFESSOR.SORT_REST]: () => forceSortRemaining.call(this, originalMessage)
  };

  Object.keys(parseCase).forEach(key => {
    if (text.includes(key)) {
      parseCase[key]();
    }
  });
}

module.exports = replyWithDumbledore;
