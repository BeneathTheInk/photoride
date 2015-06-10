var LessNpmImport = require("less-plugin-npm-import");

module.exports = function(grunt) {

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		clean: [ "dist/" ],
		browserify: {
			dist: {
				src: "photoride.js",
				dest: "dist/photoride.js",
				options: {
					browserifyOptions: { standalone: "Photoride" }
				}
			},
			dev: {
				src: "photoride.js",
				dest: "dist/photoride.dev.js",
				options: {
					browserifyOptions: { debug: true, standalone: "Photoride" }
				}
			},
			test: {
				src: "test/*.js",
				dest: "dist/photoride.test.js",
				options: {
					browserifyOptions: { debug: true }
				}
			}
		},
		less: {
			options: {
				plugins: [ new LessNpmImport({ prefix: '~' }) ]
			},
			dist: {
				src: "photoride.less",
				dest: "dist/photoride.css"
			},
			dev: {
				src: "photoride.less",
				dest: "dist/photoride.dev.css",
				options: {
					sourceMap: true,
					sourceMapFileInline: true
				}
			}
		},
		wrap2000: {
			dist: {
				src: 'dist/photoride.js',
				dest: 'dist/photoride.js',
				options: {
					header: "/*\n * Photoride\n * (c) 2015 Beneath the Ink, Inc.\n * MIT License\n * Version <%= pkg.version %>\n */\n"
				}
			},
			dev: {
				src: 'dist/photoride.dev.js',
				dest: 'dist/photoride.dev.js',
				options: {
					header: "/*\n * Photoride (with Source Map)\n * (c) 2015 Beneath the Ink, Inc.\n * MIT License\n * Version <%= pkg.version %>\n */\n"
				}
			},
			test: {
				src: 'dist/photoride.test.js',
				dest: 'dist/photoride.test.js',
				options: {
					header: "/*\n * Photoride Tests\n * (c) 2015 Beneath the Ink, Inc.\n * MIT License\n * Version <%= pkg.version %>\n */\n"
				}
			}
		},
		uglify: {
			dist: {
				src: "dist/photoride.js",
				dest: "dist/photoride.min.js"
			}
		},
		watch: {
			dev: {
				files: [ "photoride.{js,less}" ],
				tasks: [ 'dev' ],
				options: { spawn: false }
			},
			test: {
				files: [ "photoride.{js,less}", "test/*.js" ],
				tasks: [ 'test' ],
				options: { spawn: false }
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-browserify');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-less');
	grunt.loadNpmTasks('grunt-wrap2000');

	grunt.registerTask('build-dev', [ 'browserify:dev', 'less:dev', 'wrap2000:dev' ]);
	// grunt.registerTask('build-test', [ 'browserify:test', 'wrap2000:test' ]);
	grunt.registerTask('build-dist', [ 'browserify:dist', 'less:dist', 'wrap2000:dist', 'uglify:dist' ]);

	grunt.registerTask('dev', [ 'clean', 'build-dev' ]);
	// grunt.registerTask('test', [ 'clean', 'precompile', 'build-test' ]);
	grunt.registerTask('dist', [ 'clean', 'build-dist' ]);

	grunt.registerTask('default', [ 'clean', 'build-dist', 'build-dev' ]);

}
