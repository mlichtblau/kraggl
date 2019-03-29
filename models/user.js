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

  User.prototype.startTimerForCard = function (card, projectId) {
    return new Promise((resolve, reject) => {
      this.togglClient.startTimeEntry({
        pid: projectId,
        description: card.name,
        tags: ['Kraggl', card.id],
        created_with: 'Kraggl'
      }, (error, timeEntry) => {
        if (error) reject(error);
        else resolve(timeEntry);
      });
    });
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

  return User;
};