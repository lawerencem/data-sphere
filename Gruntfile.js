'use strict';

module.exports = function(grunt) {
    var packageJSON = require('./package.json');

    grunt.initConfig({
        bower: {
            install: {
                options: {
                    targetDir: "app/lib",
                    layout: "byComponent",
                    cleanTargetDir: true,
                    cleanBowerDir: true,
                    install: true,
                    copy: true
                }
            },
            cleanup: {
                options: {
                    targetDir: "app/lib",
                    layout: "byComponent",
                    cleanTargetDir: true,
                    cleanBowerDir: true,
                    install: false,
                    copy: false
                }
            }
        },

        clean: ["app/lib", "docs", "target", "reports"],

        // Start a static web server using the given port and hostname/address.
        // See https://www.npmjs.org/package/grunt-contrib-connect
        // for more options.  Be default, this will start and exit when any
        // other chained grunt tasks are complete.  This can be used
        // in conjunction with automated tests.  To leave the server running
        // for manual testing, use the following command:
        //      grunt connect:server:keepalive
        //
        connect: {
            server: {
                options: {
                    port: (process.env.PORT ? process.env.PORT : 8000),
                    base: '.',
                    hostname: (process.env.IP ? process.env.IP : 'localhost'),
                    livereload: true
                }
            }
        },

        jshint: {
            options: {
                jshintrc: '.jshintrc',
                force: true
            },
            console: [
                'Gruntfile.js',
                'app/js/**/*.js'
            ],
            xml: {
                options: {
                    reporter: "jslint",
                    reporterOutput: "reports/jslint.xml"
                },
                files: {
                    src: [
                        'Gruntfile.js',
                        'app/js/**/*.js'
                    ]
                }
            }
        },

        jscs: {
            options: {
                config: ".jscsrc",
                force: true
            },
            console: {
                options: {
                    reporter: 'console'
                },
                files: {
                    src: [
                        'Gruntfile.js',
                        'app/js/**/*.js'
                    ]
                }
            },
            xml: {
                options: {
                    reporterOutput: 'reports/jscs.xml',
                    reporter: 'checkstyle'
                },
                files: {
                    src: [
                        'Gruntfile.js',
                        'app/js/**/*.js'
                    ]
                }
            }
        },

        /*
         * Build a WAR (web archive) without Maven or the JVM installed.
         */
        war: {
            target: {
                options: {
                    war_dist_folder: "target",
                    war_verbose: true,
                    war_name: 'data-sphere-' + packageJSON.version,
                    webxml_welcome: 'index.html',
                    webxml_display_name: packageJSON.shortDescription,
                    webxml_mime_mapping: [{
                        extension: 'woff',
                        mime_type: 'application/font-woff'
                    }]
                },
                files: [{
                    expand: true,
                    cwd: ".",
                    src: ["app/**"],
                    dest: ""
                }]
            }
        },

        watch: {
            livereload: {
              options: { livereload: true },
              files: ['app/**/*'],
            },
        },

        yuidoc: {
            compile: {
                name: packageJSON.name,
                description: packageJSON.description,
                version: packageJSON.version,
                url: packageJSON.repository.url,
                options: {
                    paths: 'app/js',
                    outdir: 'docs'
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-bower-task');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-jscs');
    grunt.loadNpmTasks('grunt-contrib-yuidoc');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-war');

    grunt.registerTask('test', ['jshint:console', 'jscs:console']);
    grunt.registerTask('server', ['connect', 'watch']);
    grunt.registerTask('default', ['clean', 'bower:install', 'jshint:xml', 'jscs:xml', 'yuidoc', 'war']);
};
