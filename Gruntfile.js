module.exports = (grunt) => {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    eslint: {
      target: [
        './extension/js/gmail.js'
      ],
      options: {
        configFile: './eslint.json',
        globals: ['$', 'chrome', 'nuBox'],
      },
    },
    browserify: {
      target: {
        src: [ './extension/js/gmail.js' ],
        dest: './extension/gmail.js',
        options: {
          browserifyOptions: {
            standalone: 'nuBoxGmail'
          }
        },
      },
    },
    uglify: {
      target: {
        src: './extension/gmail.js',
        dest: './extension/gmail.min.js'
      }
    }
  });

  grunt.loadNpmTasks('grunt-eslint');
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-uglify-es');
  grunt.registerTask('default', [
    'eslint',
    'browserify',
    // 'uglify',
  ]);
};
