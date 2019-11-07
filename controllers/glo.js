const authHelper = require('../helpers/auth');
const timeHelper = require('../helpers/time');

const COMMENT_HEADER = '# Time Summary\n\n';
const COMMENT_FOOTER = '\n\nPowered By: [Kraggl](https://kraggl.com)';

const isColumnTracked = (columnId, board) => board.Columns.map(col => col.id).includes(columnId);

const isActive = (labels, pauseLabelId) => !labels.some(label => label.id === pauseLabelId);
const isActivated = (labels, pauseLabelId) => labels.removed.some(label => label.id === pauseLabelId);
const isPaused = (labels, pauseLabelId) => labels.added.some(label => label.id === pauseLabelId);

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
        const columnTitle = tagReport.title.tag || 'Untagged';
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
        if (isColumnTracked(card.column_id, kragglBoard) && isActive(card.labels, kragglBoard.pauseLabelId))  {
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
        if (isColumnTracked(card.column_id, kragglBoard) && isActive(card.labels, kragglBoard.pauseLabelId))  {
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


const handleLabelsUpdated = function ({board, card: { id: cardId }, labels}, user) {
  user.getBoardWithId(board.id)
    .then(kragglBoard => {
      if (!kragglBoard || !kragglBoard.pauseLabelId) return;
      user.gloBoardApi.getCard(board.id, cardId).then(({ body: card }) => {
        if (!isColumnTracked(card.column_id, kragglBoard)) return;
        if (isActivated(labels, kragglBoard.pauseLabelId)) return startTimerForCardAndProject(user, card, kragglBoard.togglProjectId);
        else if (isPaused(labels, kragglBoard.pauseLabelId)) return stopTimerForCardIfRunning(user, card, kragglBoard);
      })
    })
    .catch(error => {
      console.log(error);
    });

};

module.exports = {
  hook
};
