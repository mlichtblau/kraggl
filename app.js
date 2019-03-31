var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var logger = require('morgan');
var favicon = require('serve-favicon');
var SQLiteStore = require('connect-sqlite3')(session);
var passport = require('passport');
var authHelper = require('./helpers/auth');
passport.serializeUser(authHelper.serializeUser);
passport.deserializeUser(authHelper.deserializeUser);

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

app.use(favicon(path.join(__dirname,'public','images','favicon.ico')));
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.GIT_KRAKEN_CLIENT_SECRET,
  resave: false,
  saveUninitialized: true,
  store: new SQLiteStore({
    db: 'database.sqlite3',
    dir: 'database'
  }),
}));
app.use(passport.initialize());
app.use(passport.session({
  secret: process.env.GIT_KRAKEN_CLIENT_SECRET,
}));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
