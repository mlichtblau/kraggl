const timeHelper = require('../helpers/time');

const models = require('../models');
const Board = models.Board;
const Column = models.Column;

const mergeBoards = function (gloBoard, kragglBoard) {
  return {...gloBoard, ...kragglBoard.dataValues };
};

const mergeListOfBoards = function (gloBoards, kragglBoards) {
  return gloBoards.map(gloBoard => {
    const kragglBoard = kragglBoards.find(kragglBoard => kragglBoard.id === gloBoard.id);
    return kragglBoard ? mergeBoards(gloBoard, kragglBoard) : gloBoard;
  });
};

const boards = function (req, res, next) {
  const user = req.user;
  const gloBoardApi = user.gloBoardApi;
  Promise.all([
    gloBoardApi.getBoards({ fields: ['name', 'columns', 'created_by', 'members'] }),
    user.getBoards({}),
    user.getSummaryReports()
  ]).then(([{ body: gloBoards }, kragglBoards, summaryReports]) => {
    const boards = mergeListOfBoards(gloBoards, kragglBoards);
    boards.forEach(board => {
      summaryReports.forEach(({ data: projectReports }) => {
        projectReports.forEach(projectReport => {
          if (projectReport.id === board.togglProjectId) {
            board.totalTime = timeHelper.msToTime(projectReport.time);
          }
        });
      });
    });
    res.render('pages/boards', { user, boards });
  });
};

const board = function (req, res, next) {
  const user = req.user;
  let board, cards, workspaces;
  const boardId = req.params.boardId;

  Promise.all([
    user.gloBoardApi.getBoard(boardId, { fields: ['name', 'columns', 'members', 'labels'] }),
    Board.findByPk(boardId, { include: { model: Column } }),
    user.gloBoardApi.getCardsOfBoard(boardId, { fields: ['name', 'assignees', 'description', 'labels', 'column_id'] })])
    .then(([{ body: gloBoard }, kragglBoard, { body: gloCards }]) => {
      const trackedColumns = kragglBoard ? kragglBoard.getTrackedColumns() : undefined;
      cards = gloCards;
      board = kragglBoard ? mergeBoards(gloBoard, kragglBoard) : gloBoard;
      board.trackedColumns = trackedColumns;
      return user.getWorkspaces();
    })
    .then(workspaces => Promise.all(workspaces.map(workspace => user.getWorkspaceProjects(workspace))))
    .then(workspacesWithProjects => {
      workspaces = workspacesWithProjects;
      if (!board.trackingEnabled || !board.togglProjectId) return;
      return user.getDetailedReportForProject(board.togglProjectId);
    })
    .then(report => {
      if (report) {
        cards.forEach(card => {
          let timeEntriesForCard = report.data.filter(timeEntry => timeEntry.description === card.name);

          let columnTimes = {};
          let totalTime = 0;
          for (const timeEntry of timeEntriesForCard) {
            for (const tag of timeEntry.tags) {
              if (!columnTimes[tag]) columnTimes[tag] = 0;
              columnTimes[tag] += timeEntry.dur;
            }
            totalTime += timeEntry.dur;
          }
          // let totalTime = timeEntriesForCard.reduce((totalTime, timeEntry) => totalTime + timeEntry.dur, 0);
          for (let key of Object.keys(columnTimes)) {
            columnTimes[key] = timeHelper.msToTime(columnTimes[key]);
          }

          card.totalTime = timeHelper.msToTime(totalTime);
          card.columnTimes = columnTimes;
        });
      }
      res.render('pages/board.ejs', { cards, board, workspaces })
    })
    .catch(error => {
      next(error);
    })
};

const saveBoard = function (req, res, next) {
  const user = req.user;
  const boardId = req.params.boardId;
  const { trackingEnabled, togglProjectId, trackedColumns, chatbotEnabled, pauseLabelEnabled, pauseLabelId } = req.body;

  if (!togglProjectId) {
    req.flash('error', 'Please select a Toggl project.');
    return res.redirect('/boards/' + boardId);
  }

  Board.findByPk(boardId, { include: { model: Column } })
    .then(board => {
      if (board) {
        return board.updateBoard({
          togglProjectId,
          trackingEnabled: !!trackingEnabled,
          chatbotEnabled: !!chatbotEnabled,
          trackedColumnIds: trackedColumns,
          pauseLabelId: (!!pauseLabelEnabled) ? pauseLabelId : null
        })
      } else {
        return Board.create({
          id: boardId,
          trackingEnabled: !!trackingEnabled,
          togglProjectId,
          chatbotEnabled: !!chatbotEnabled,
          userId: user.id,
          pauseLabelId: (!!pauseLabelEnabled) ? pauseLabelId : null
        }).then(board => {
          $columns = trackedColumns.map(columnId => {
            return Column.create({ id: columnId, boardId: board.id });
          });
          return Promise.all($columns).then(columns => board.update());
        })
      }
    })
    .then(newBoard => {
      req.flash('success', 'Board settings saved!');
      res.redirect('/boards/' + newBoard.id);
    })
    .catch(error => {
      next(error);
    });
};

module.exports = {
  boards,
  board,
  saveBoard
};
