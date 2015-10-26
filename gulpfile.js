'use strict';

var gulp       = require('gulp');
var babel      = require('gulp-babel');
var indent     = require('gulp-indent');
var umd        = require('gulp-umd');
var header     = require('gulp-header');
var pkg        = require('./package.json');

var banner = ['/**',
  ' * <%= pkg.name %>',
  ' * @version v<%= pkg.version %>',
  ' * @author <%= pkg.author %>',
  ' * @license <%= pkg.license %>',
  ' */',
  ''].join('\n');
var module_options = {
  namespace: function() {
    return 'v';
  },
  exports: function() {
    return 'v';
  },
  dependencies: function(){
    return [
      {
        name:   'Bacon',
        amd:    'baconjs',
        cjs:    'baconjs',
        global: 'Bacon',
        param:  'Bacon'
      },
      {
        name:   'vdom',
        amd:    'virtual-dom',
        cjs:    'virutal-dom',
        global: 'virtualDom',
        param:  'vdom'
      },
    ];
  }
};

//Build tasks
gulp.task('js', function(){
  return gulp.src('v.js')
    .pipe(babel())
    .pipe(indent({
      tabs: false,
      amount: 2
    }))
    .pipe(umd(module_options))
    .pipe(header(banner, { pkg : pkg } ))
    .pipe(gulp.dest('dist/'));
});
gulp.task('build', ['js']);


//Development tasks
gulp.task('watch', ['build'], function(){
  gulp.watch('v.js', ['js']);
});

gulp.task('default', ['watch']);
