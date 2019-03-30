const authHelper = require('../helpers/auth');
const timeHelper = require('../helpers/time');

const PAUSE_LABEL_TEXT = 'On Hold';
const COMMENT_HEADER = '# Time Summary\n\n';
const COMMENT_FOOTER = '\n\nPowered By: [Kraggl](https://kraggl.lichtblau.io)';

const isColumnTracked = (columnId, board) => {
  return board.Columns.map(col => col.id).includes(columnId);
};

const isCardActivated = (labels) => {
  return labels.removed.some(label => {
    console.log('is card activated');
    console.log(label.name);
    return label.name === PAUSE_LABEL_TEXT;
  });
};

const isCardPaused = (labels) => {
  return labels.added.some(label => {
    return label.name === PAUSE_LABEL_TEXT;
  });
};

const createNewComment = (columnTimes) => {
  let header = '', middle = '', bottom = '';
  for (let key of Object.keys(columnTimes)) {
    header += '|' + key;
    middle += '|-----';
    bottom += '|' + timeHelper.msToTime(columnTimes[key]);
  }
  return COMMENT_HEADER + header + '|\n' + middle + '|\n' + bottom + '|' + COMMENT_FOOTER;
};

const updateComment = (user, card, board) => {
  user.getSummaryReportForProjectGroupedByTags(board.togglProjectId)
    .then(({ data: tagReports }) => {
      let columnTimes = {};
      tagReports.forEach(tagReport => {
        const columnTitle = tagReport.title.tag;
        const columnTime = tagReport.items.find(timeEntry => timeEntry.title.time_entry === card.name);
        columnTimes[columnTitle] = columnTime ? columnTime.time : 0;
      });
      if (Object.keys(columnTimes).length === 0) return;
      user.gloBoardApi.getCommentsOfCard(board.id, card.id, {
        fields: ['created_by', 'text']
      }).then(({ body: comments }) => {
        const oldComment = comments.find(comment => comment.text.startsWith(COMMENT_HEADER) && comment.created_by.id === user.id);
        const newCommentText = createNewComment(columnTimes);
        if (oldComment) {
          return user.gloBoardApi.editComment(board.id, card.id, oldComment.id, { text: newCommentText });
        } else {
          return user.gloBoardApi.createComment(board.id, card.id, { text: newCommentText });
        }
      }).then(({ body: comment }) => {
        console.log(`${ user.username } updated the time summary.`);
      }).catch(error => console.log(error))
    })
    .catch(error => console.log(error))
};

const startTimerForCardAndProject = (user, card, projectId) => {
  return user.startTimerForCard(card, projectId)
    .then(timeEntry => console.log(`Started Time Entry with ID: ${ timeEntry.id }`));
};

const stopTimerForCardIfRunning = (user, card, board) => {
  return user.getCurrentTimeEntry()
    .then(timeEntry => {
      if (timeEntry && timeEntry.description === card.name) {
        if (board.chatbotEnabled) updateComment(user, card, board);
        return user.stopTimeEntry(timeEntry.id)
      }
    })
    .then(stoppedTimeEntry => {
      if (stoppedTimeEntry) console.log(`Stopped Time Entry with ID: ${ stoppedTimeEntry.id }`);
      else console.log('No timer running for this card');
    })
};

const handleMovedColumn = function ({board, card}, user) {
  user.getBoardWithId(board.id)
    .then(kragglBoard => {
      if (kragglBoard) {
        if (isColumnTracked(card.column_id, kragglBoard))  {
          return startTimerForCardAndProject(user, card, kragglBoard.togglProjectId);
        } else {
          return stopTimerForCardIfRunning(user, card, kragglBoard);
        }
      }})
    .catch(error => {
      console.log(error);
    });
};

const handleCardDeleted = function ({board, card}, user) {
  user.getBoardWithId(board.id)
    .then(kragglBoard => {
      if (kragglBoard) {
        if (isColumnTracked(card.column_id, kragglBoard))  {
          return stopTimerForCardIfRunning(user, card, kragglBoard);
        }
      }})
    .catch(error => {
      console.log(error);
    });
};

const handleCardAdded = function ({board, card}, user) {
  user.getBoardWithId(board.id)
    .then(kragglBoard => {
      if (kragglBoard) {
        if (isColumnTracked(card.column_id, kragglBoard))  {
          return startTimerForCardAndProject(user, card, kragglBoard.togglProjectId);
        }
      }})
    .catch(error => {
      console.log(error);
    });
};

const handleCardEvent = function (event, user) {
  console.log(`Received card action: ${ event.action }`);
  switch (event.action) {
    case 'moved_column':
      handleMovedColumn(event, user);
      break;
    case 'labels_updated':
      handleLabelsUpdated(event, user);
      break;
    case 'moved_to_board':
      handleCardDeleted(event, user);
      break;
    case 'moved_from_board':
      handleCardAdded(event, user);
      break;
    case 'added':
      handleCardAdded(event, user);
      break;
    case 'copied':
      handleCardAdded(event, user);
      break;
    case 'deleted':
      handleCardDeleted(event, user);
    case 'archived':
    case 'unarchived':
    case 'updated':
    case 'reordered':
    case 'assignees_updated':
    default:
  }
};

const hook = function (req, res, next) {
  const eventType = req.header('x-gk-event');
  const eventPayload = req.body;

  authHelper.deserializeUser(eventPayload.sender.id, (error, user) => {
    if (error) return next(error);
    if (user) {
      switch (eventType) {
        case 'cards':
          handleCardEvent(req.body, user);
        case 'boards':
        case 'column':
        case 'comments':
        default:
      }
    }
    res.end();
  });
};


const handleLabelsUpdated = function ({board, card, labels}, user) {
  // TODO: wait for API Fix
  /*user.getBoardWithId(board.id)
    .then(kragglBoard => {
      if (!kragglBoard) return;
      console.log(card);
      user.gloBoardApi.getCard(board.id, card.id, {
        fields: ['column_id', 'name']
      }).then(data => {
        card = data.body;
        console.log(card);
        if (isColumnTracked(card.column_id, kragglBoard) && isCardActivated(labels)) {
          return startTimerForCardAndProject(user, card, kragglBoard.togglProjectId);
        } else if (isColumnTracked(card.column_id, kragglBoard) && isCardPaused(labels)) {
          return stopTimerForCardIfRunning(user, card);
        }
      })
    })
    .catch(error => {
      console.log(error);
    })*/
};

module.exports = {
  hook
};