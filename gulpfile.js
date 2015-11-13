'use strict';

var gulp       = require('gulp');
var babel      = require('gulp-babel');
var header     = require('gulp-header');
var sourcemaps = require('gulp-sourcemaps');
var pkg        = require('./package.json');


var banner = ['/**',
  ' * <%= pkg.name %>',
  ' * @version v<%= pkg.version %>',
  ' * @author <%= pkg.author %>',
  ' * @license <%= pkg.license %>',
  ' */',
  ''].join('\n');

//Build tasks
gulp.task('js', function(){
  return gulp.src('v.js')
    .pipe(sourcemaps.init())
      .pipe(babel())
      .pipe(header(banner, { pkg : pkg } ))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('dist/'));
});
gulp.task('build', ['js']);


//Development tasks
gulp.task('watch', ['build'], function(){
  gulp.watch('v.js', ['js']);
});

gulp.task('default', ['watch']);
