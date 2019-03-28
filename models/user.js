'use strict';
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
  return User;
};