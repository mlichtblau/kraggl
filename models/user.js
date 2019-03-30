'use strict';

const GloBoardApi = require('glo-board-api-node');
const TogglClient = require('toggl-api');

const CLIENT_ID = process.env.GIT_KRAKEN_CLIENT_ID;
const CLIENT_SECRET = process.env.GIT_KRAKEN_CLIENT_SECRET;

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true,
    },
    name: DataTypes.STRING,
    username: DataTypes.STRING,
    gitKrakenAccessToken: DataTypes.STRING,
    togglApiKey: DataTypes.STRING
  }, {});

  User.associate = function(models) {
    // associations can be defined here
    User.hasMany(models.Board, {
      foreignKey: 'userId'
    })
  };

  /* Instance Properties */

  Object.defineProperty(User.prototype, 'gloBoardApi', {
    get: function gloBoardApi() {
      const api = new GloBoardApi({ clientId: CLIENT_ID, clientSecret: CLIENT_SECRET });
      api.setAccessToken(this.gitKrakenAccessToken);
      return api;
    }
  });

  Object.defineProperty(User.prototype, 'togglClient', {
    get: function togglClient() {
      return this.togglApiKey ? new TogglClient({ apiToken: this.togglApiKey }) : undefined;
    }
  });

  /* Instance Methods */

  User.prototype.getBoardWithId = function (gloBoardId) {
    return this.getBoards({
      where: { id: gloBoardId },
      include: { model: sequelize.models.Column }
    }).then(([kragglBoard]) => kragglBoard);
  };

  /* Toggl Methods */

  User.prototype.startTimerForCard = function (card, projectId) {
    return this.gloBoardApi.getBoard(card.board_id, {
      fields: ['columns']
    }).then(({ body: board }) => {
      const column = board.columns.find(column => column.id === card.column_id);
      return new Promise((resolve, reject) => {
        this.togglClient.startTimeEntry({
          pid: projectId,
          description: card.name,
          tags: ['Kraggl', column.name],
          created_with: 'Kraggl'
        }, (error, timeEntry) => {
          if (error) reject(error);
          else resolve(timeEntry);
        });
      });
    })
  };

  User.prototype.getCurrentTimeEntry = function () {
    return new Promise(((resolve, reject) => {
      this.togglClient.getCurrentTimeEntry((error, timeEntry) => {
        if (error) reject(error);
        else resolve(timeEntry);
      });
    }));
  };

  User.prototype.stopTimeEntry = function (timeEntryId) {
    return new Promise(((resolve, reject) => {
      this.togglClient.stopTimeEntry(timeEntryId, (error, timeEntry) => {
        if (error) reject(error);
        else resolve(timeEntry);
      });
    }));
  };

  User.prototype.getWorkspaces = function () {
    return new Promise((resolve, reject) => {
      this.togglClient.getWorkspaces((error, workspaces) => {
        if (error) reject(error);
        resolve(workspaces);
      });
    });
  };

  User.prototype.getWorkspaceProjects = function (workspace) {
    return new Promise((resolve, reject) => {
      this.togglClient.getWorkspaceProjects(workspace.id, {}, (error, projects) => {
        if (error) reject(error);
        resolve({
          id: workspace.id,
          name: workspace.name,
          projects
        })
      })
    });
  };

  User.prototype.getProjectData = function (projectId) {
    return new Promise(function (resolve, reject) {
      this.togglClient.getProjectData(projectId, (error, project) => {
        if (error) reject(error);
        else resolve(error);
      });
    })
  };

  User.prototype.getDetailedReportForProject = function (projectId) {
    return new Promise((resolve, reject) => {
      this.togglClient.getProjectData(projectId, (error, project) => {
        if (error) reject(error);
        else {
          this.togglClient.detailedReport({
            workspace_id: project.wid,
            user_agent: 'kraggl',
            project_ids: project.id
          }, (error, report) => {
            if (error) reject(error);
            resolve(report);
          });
        }
      });
    })
  };

  User.prototype.getSummaryReports = function () {
    return new Promise(((resolve, reject) => {
      this.togglClient.getWorkspaces((error, workspaces) => {
        let $workspaceReports = [];
        workspaces.forEach(workspace => {
          const $workspaceReport = new Promise(((resolve1, reject1) => {
            this.togglClient.summaryReport({
              workspace_id: workspace.id,
              user_agent: 'kraggl',
              grouping: 'projects'
            }, (error, report) => {
              if (error) reject1(error);
              resolve1(report);
            })
          }));
          $workspaceReports.push($workspaceReport);
        });
        Promise.all($workspaceReports)
          .then(workspaceReports => resolve(workspaceReports))
          .catch(error => reject(error));
      })
    }));
  };

  return User;
};