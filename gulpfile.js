// GULP MODULES ===============================================================
const gulp          = require('gulp');
const concat        = require('gulp-concat');
const uglify        = require('gulp-uglify');
const cleanCSS      = require('gulp-clean-css');
const htmlmin       = require('gulp-htmlmin');
const connect       = require('gulp-connect');
const less          = require('gulp-less');
const jshint        = require('gulp-jshint');
const foreach       = require("gulp-foreach");
const packager      = require('electron-packager');
const templateCache = require('gulp-angular-templatecache');
const replace       = require('gulp-replace');
const stylish       = require('jshint-stylish');
const fs            = require('fs');

// Node 22 + ESM gulp-zip 兼容
let zip;
async function getGulpZip() {
  if (!zip) zip = (await import('gulp-zip')).default;
  return zip;
}

// VARIABLES ==================================================================
const project       = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const build_version = project.version;
const build_date    = (new Date()).toISOString().replace(/T.*/, '');

// FILES ======================================================================
const vendor_js = [
  'src/assets/libs/createjs.min.js',
  'src/assets/libs/creatine-1.0.0.min.js',
  'src/assets/libs/behavior3js-0.1.0.min.js',
  'src/assets/libs/mousetrap.min.js',
  'bower_components/angular/angular.min.js',
  'bower_components/angular-animate/angular-animate.min.js',
  'bower_components/angular-bootstrap/ui-bootstrap-tpls.min.js',
  'bower_components/angular-ui-router/release/angular-ui-router.min.js',
  'bower_components/sweetalert/dist/sweetalert.min.js',
];
const vendor_css = [
  'bower_components/bootstrap/dist/css/bootstrap.min.css',
  'bower_components/sweetalert/dist/sweetalert.css',
];
const vendor_fonts = [
  'bower_components/fontawesome/fonts/*',
  'src/assets/fonts/**/*',
];

const preload_js = ['src/assets/js/preload.js'];
const preload_css = [
  'bower_components/fontawesome/css/font-awesome.min.css',
  'src/assets/css/preload.css',
];

const app_js = [
  'src/editor/namespaces.js',
  'src/editor/utils/*.js',
  'src/editor/**/*.js',
  'src/app/app.js',
  'src/app/app.routes.js',
  'src/app/app.controller.js',
  'src/app/**/*.js',
  'src/start.js',
];
const app_less = ['src/assets/less/index.less'];
const app_imgs = ['src/assets/imgs/**/*'];
const app_html = [
  'src/app/**/*.html'
];
const app_entry = ['src/index.html', 'src/package.json', 'src/desktop.js'];

// VENDOR TASKS ==============================================================
gulp.task('_vendor_js', () => 
  gulp.src(vendor_js).pipe(uglify()).pipe(concat('vendor.min.js')).pipe(gulp.dest('build/js'))
);
gulp.task('_vendor_css', () =>
  gulp.src(vendor_css).pipe(cleanCSS()).pipe(concat('vendor.min.css')).pipe(gulp.dest('build/css'))
);
gulp.task('_vendor_fonts', () =>
  gulp.src(vendor_fonts,{allowEmpty: true}).pipe(gulp.dest('build/fonts'))
);
gulp.task('_vendor', gulp.series('_vendor_js', '_vendor_css', '_vendor_fonts'));

// PRELOAD TASKS =============================================================
gulp.task('_preload_js', () =>
  gulp.src(preload_js).pipe(uglify()).pipe(concat('preload.min.js')).pipe(gulp.dest('build/js')).pipe(connect.reload())
);
gulp.task('_preload_css', () =>
  gulp.src(preload_css).pipe(cleanCSS()).pipe(concat('preload.min.css')).pipe(gulp.dest('build/css')).pipe(connect.reload())
);
gulp.task('_preload', gulp.series('_preload_js', '_preload_css'));

// APP TASKS ================================================================
gulp.task('_app_js_dev', () =>
  gulp.src(app_js)
      .pipe(jshint())
      .pipe(jshint.reporter(stylish))
      .pipe(replace('[BUILD_VERSION]', build_version))
      .pipe(replace('[BUILD_DATE]', build_date))
      .pipe(concat('app.min.js'))
      .pipe(gulp.dest('build/js'))
      .pipe(connect.reload())
);
gulp.task('_app_js_build', () =>
  gulp.src(app_js)
      .pipe(jshint())
      .pipe(jshint.reporter(stylish))
      .pipe(replace('[BUILD_VERSION]', build_version))
      .pipe(replace('[BUILD_DATE]', build_date))
      .pipe(uglify())
      .pipe(concat('app.min.js'))
      .pipe(gulp.dest('build/js'))
      .pipe(connect.reload())
);
gulp.task('_app_less', () =>
  gulp.src(app_less).pipe(less()).pipe(cleanCSS()).pipe(concat('app.min.css')).pipe(gulp.dest('build/css')).pipe(connect.reload())
);
gulp.task('_app_imgs', () =>
  gulp.src(app_imgs).pipe(gulp.dest('build/imgs'))
);
gulp.task('_app_html', () =>
  gulp.src(app_html, { allowEmpty: true })
      .pipe(htmlmin({
        collapseWhitespace: true,
        removeComments: true,
        ignoreCustomFragments: [/\{\{.*?\}\}/g]
      }))
      .pipe(replace('[BUILD_VERSION]', build_version))
      .pipe(replace('[BUILD_DATE]', build_date))
      .pipe(templateCache('templates.min.js', {standalone: true}))
      .pipe(gulp.dest('build/js'))
      .pipe(connect.reload())
);


gulp.task('_app_entry', () =>
  gulp.src(app_entry)
      .pipe(htmlmin({ collapseWhitespace: true, removeComments: true }))
      .pipe(replace('[BUILD_VERSION]', build_version))
      .pipe(replace('[BUILD_DATE]', build_date))
      .pipe(gulp.dest('build'))
      .pipe(connect.reload())
);
gulp.task('_app_dev', gulp.series('_app_js_dev','_app_less','_app_imgs','_app_html','_app_entry'));
gulp.task('_app_build', gulp.series('_app_js_build','_app_less','_app_imgs','_app_html','_app_entry'));

// LIVE RELOAD ==============================================================
gulp.task('_livereload', (done) => {
  connect.server({ livereload:true, root:'build', port:8000 });
  done();
});
gulp.task('_watch', gulp.series('_livereload', (done) => {
  gulp.watch(preload_js, gulp.series('_preload_js'));
  gulp.watch(preload_css, gulp.series('_preload_css'));
  gulp.watch(app_js, gulp.series('_app_js_dev'));
  gulp.watch(app_less, gulp.series('_app_less'));
  gulp.watch(app_html, gulp.series('_app_html'));
  gulp.watch(app_entry, gulp.series('_app_entry'));
  done();
}));

// BUILD / DEV / SERVE TASKS =================================================
gulp.task('build', gulp.series('_vendor', '_preload', '_app_build'));
gulp.task('dev', gulp.series('_vendor', '_preload', '_app_dev'));
gulp.task('serve', gulp.series('_vendor', '_preload', '_app_dev', '_watch'));

// ELECTRON TASKS ============================================================
gulp.task('_electron', gulp.series('build', (done) => {
  packager({
    dir       : 'build',
    out       : '.temp-dist',
    name      : project.name,
    platform  : ['linux','win32'],
    arch      : 'all',
    overwrite : true,
    asar      : true
  }, done);
}));

gulp.task('_electron_zip', gulp.series('_electron', async function() {
  const zipModule = await getGulpZip();
  return gulp.src('.temp-dist/*')
             .pipe(foreach((stream, file) => {
               const fileName = file.path.split(/[\/\\]/).pop();
               gulp.src(`.temp-dist/${fileName}/**/*`)
                   .pipe(zipModule(`${fileName}.zip`))
                   .pipe(gulp.dest('./dist'));
               return stream;
             }));
}));

gulp.task('dist', gulp.series('_electron_zip'));
