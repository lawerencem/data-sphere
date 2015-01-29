data-sphere
===========

A VR playground for viewing data visualizations beyond the bounds of monitor's form factor.  This project will pull together various JavaScript visualization libraries to explore new ways to play with data.

Current contents include project setup and build files along with the [Leap Motion ThreeJS Boilerplate HTML][leap-boilerplate] and an example [D3/ThreeJS][d3-threejs] visualization done by Steven Hall of [delimited.io][delimited].  These will be replaced with more custom code as the repo is fleshed out.  For now they serve to proof out the grunt/bower setup and pulling in required libraries.

# Building the Project

Build the project requires [node][node] & [npm][npm].  Once you've installed those, run the following commands in the data-sphere directory.

    npm install
    grunt

# Other useful commands

To generate project documentation:

    grunt docs
    
To lint the code:

    grunt jshint:console

To host the examples in a simple http server at [localhost:8000/app][localhost]:

    grunt connect:server:keepalive

See the Grunt file for http server configuration options.

# Inspiration for the Project

The following sites provided some of the inspiration for this project.
* Mike Bostock's work on [D3][d3]
* Steven Hall's visualization blog at [delimited][delimited]
* The [Leap Motion][leap] and its potential as a controller for [Virtual Reality][leap-vr] applications
* The [Oculus Rift][oculus] and interesting community offerings like the [Oculus Bridge][oculus-bridge]
* The [Oculus REST][oculus-rest] server.  Here, I've linked the most active fork which is working on DK2 support as the [original][oculus-rest-original] has been dormant for some time.
  
[node]: http://nodejs.org/
[npm]: https://www.npmjs.org/
[d3]: http://d3js.org/
[d3-threejs]: http://www.delimited.io/blog/2014/3/14/d3js-threejs-and-css-3d-transforms
[leap]: https://www.leapmotion.com/
[leap-boilerplate]: https://developer.leapmotion.com/gallery/boilerplate-for-three-js-and-leapjs
[leap-vr]: https://www.leapmotion.com/product/vr
[threejs]: http://threejs.org/
[delimited]: http://www.delimited.io/
[threejs]: http://threejs.org/
[oculus]: http://www.oculus.com/
[oculus-bridge]: https://github.com/Instrument/oculus-bridge
[oculus-rest]: https://github.com/SoylentGraham/oculus-rest
[oculus-rest-original]: https://github.com/possan/oculus-rest
[localhost]: http://localhost:8000/app

