/**
 * Based on the TrackBallControls by
 * @author Eberhard Graether / http://egraether.com/
 * @author Mark Lundin  / http://mark-lundin.com
 */

THREE.CameraControls = function (object, domElement, controller) {
    var _this = this;
    var STATE = { NONE: -1, ROTATE: 0, ZOOM: 1, PAN: 2, TOUCH_ROTATE: 3, TOUCH_ZOOM_PAN: 4 };

    this.object = object;
    this.domElement = ( domElement !== undefined ) ? domElement : document;
    this.controller = controller;

    // API
    this.enabled = true;

    this.screen = { left: 0, top: 0, width: 0, height: 0 };

    this.rotateSpeed = 1.0;
    this.zoomSpeed = 1.2;
    this.panSpeed = 0.3;

    this.noRotate = false;
    this.noZoom = false;
    this.noPan = false;
    this.noRoll = false;

    this.staticMoving = false;
    this.dynamicDampingFactor = 0.2;

    this.minDistance = 0;
    this.maxDistance = Infinity;

    this.keys = [ 65 /*A*/, 83 /*S*/, 68 /*D*/ ];

    // internals
    this.target = new THREE.Vector3();

    var EPS = 0.000001;

    var lastPosition = new THREE.Vector3();

    var _state = STATE.NONE,
    _prevState = STATE.NONE,

    _eye = new THREE.Vector3(),

    _rotateStart = new THREE.Vector3(),
    _rotateEnd = new THREE.Vector3(),

    _zoomStart = new THREE.Vector2(),
    _zoomEnd = new THREE.Vector2(),

    _touchZoomDistanceStart = 0,
    _touchZoomDistanceEnd = 0,

    _panStart = new THREE.Vector2(),
    _panEnd = new THREE.Vector2();

    // for reset
    this.target0 = this.target.clone();
    this.position0 = this.object.position.clone();
    this.up0 = this.object.up.clone();

    // events
    var changeEvent = { type: 'change' };
    var startEvent = { type: 'start'};
    var endEvent = { type: 'end'};

    this.curYAngle = 0;
    this.curXAngle = 0;
    this.curZAngle = 0;

    this.yAxis = new THREE.Vector3(0,1,0);
    this.xAxis = new THREE.Vector3(0,0,1);
    this.zAxis = new THREE.Vector3(1,0,0);

    // methods
    this.handleResize = function () {
        if ( this.domElement === document ) {
            this.screen.left = 0;
            this.screen.top = 0;
            this.screen.width = window.innerWidth;
            this.screen.height = window.innerHeight;
        } else {
            var box = this.domElement.getBoundingClientRect();
            // adjustments come from similar code in the jquery offset() function
            var d = this.domElement.ownerDocument.documentElement;
            this.screen.left = box.left + window.pageXOffset - d.clientLeft;
            this.screen.top = box.top + window.pageYOffset - d.clientTop;
            this.screen.width = box.width;
            this.screen.height = box.height;
        }
    };

    this.handleEvent = function ( event ) {
        if ( typeof this[ event.type ] == 'function' ) {
            this[ event.type ]( event );
        }
    };

    var getMouseOnScreen = ( function () {
        var vector = new THREE.Vector2();

        return function ( pageX, pageY ) {
            vector.set(
                ( pageX - _this.screen.left ) / _this.screen.width,
                ( pageY - _this.screen.top ) / _this.screen.height
            );

            return vector;
        };
    }() );

    var getMouseProjectionOnBall = ( function () {
        var vector = new THREE.Vector3();
        var objectUp = new THREE.Vector3();
        var mouseOnBall = new THREE.Vector3();

        return function ( pageX, pageY ) {
            mouseOnBall.set(
                ( pageX - _this.screen.width * 0.5 - _this.screen.left ) / (_this.screen.width*.5),
                ( _this.screen.height * 0.5 + _this.screen.top - pageY ) / (_this.screen.height*.5),
                0.0
            );on
            var length = mouseOnBall.length();

            if ( _this.noRoll ) {
                if ( length < Math.SQRT1_2 ) {
                    mouseOnBall.z = Math.sqrt( 1.0 - length*length );
                } else {
                    mouseOnBall.z = .5 / length;  
                }
            } else if ( length > 1.0 ) {
                mouseOnBall.normalize();
            } else {
                mouseOnBall.z = Math.sqrt( 1.0 - length * length );
            }

            _eye.copy( _this.object.position ).sub( _this.target );

            vector.copy( _this.object.up ).setLength( -mouseOnBall.y )
            vector.sub( objectUp.copy( _this.object.up ).cross( _eye ).setLength( mouseOnBall.x ) );
            vector.add( _eye.setLength( mouseOnBall.z ) );

            return vector;
        };
    }());

    this.rotateCamera = (function(){
        var axis = new THREE.Vector3(),
            quaternion = new THREE.Quaternion();

        return function () {
            var angle = Math.acos( _rotateStart.dot( _rotateEnd ) / _rotateStart.length() / _rotateEnd.length() );

            if ( angle ) {
                axis.crossVectors( _rotateStart, _rotateEnd ).normalize();

                angle *= _this.rotateSpeed;

                quaternion.setFromAxisAngle( axis, -angle );

                _eye.applyQuaternion( quaternion );
                //_this.object.up.applyQuaternion( quaternion );

                _rotateEnd.applyQuaternion( quaternion );

                if ( _this.staticMoving ) {
                    _rotateStart.copy( _rotateEnd );
                } else {
                    quaternion.setFromAxisAngle( axis, angle * ( _this.dynamicDampingFactor - 1.0 ) );
                    _rotateStart.applyQuaternion( quaternion );
                }
            }
        }
    }());

    this.zoomCamera = function () {
        if ( _state === STATE.TOUCH_ZOOM_PAN ) {
            var factor = _touchZoomDistanceStart / _touchZoomDistanceEnd;
            _touchZoomDistanceStart = _touchZoomDistanceEnd;
            _eye.multiplyScalar( factor );
        } else {
            var factor = 1.0 + ( _zoomEnd.y - _zoomStart.y ) * _this.zoomSpeed;

            if ( factor !== 1.0 && factor > 0.0 ) {
                _eye.multiplyScalar( factor );
                if ( _this.staticMoving ) {
                    _zoomStart.copy( _zoomEnd );
                } else {
                    _zoomStart.y += ( _zoomEnd.y - _zoomStart.y ) * this.dynamicDampingFactor;
                }
            }
        }
    };

    this.panCamera = (function(){
        var mouseChange = new THREE.Vector2(),
            objectUp = new THREE.Vector3(),
            pan = new THREE.Vector3();

        return function () {
            mouseChange.copy( _panEnd ).sub( _panStart );

            if ( mouseChange.lengthSq() ) {
                mouseChange.multiplyScalar( _eye.length() * _this.panSpeed );

                pan.copy( _eye ).cross( _this.object.up ).setLength( mouseChange.x );
                pan.add( objectUp.copy( _this.object.up ).setLength( mouseChange.y ) );

                _this.object.position.add( pan );
                _this.target.add( pan );

                if ( _this.staticMoving ) {
                    _panStart.copy( _panEnd );
                } else {
                      _panStart.add( mouseChange.subVectors( _panEnd, _panStart ).multiplyScalar( _this.dynamicDampingFactor ) );
                }
            }
        }
    }());

    this.checkDistances = function () {
        if ( !_this.noZoom || !_this.noPan ) {
            if ( _eye.lengthSq() > _this.maxDistance * _this.maxDistance ) {
                _this.object.position.addVectors( _this.target, _eye.setLength( _this.maxDistance ) );
            }

            if ( _eye.lengthSq() < _this.minDistance * _this.minDistance ) {
                _this.object.position.addVectors( _this.target, _eye.setLength( _this.minDistance ) );
            }
        }
    };

    this.update = function () {
        _eye.subVectors( _this.object.position, _this.target );

        if ( !_this.noRotate ) {
            _this.rotateCamera();
        }

        if ( !_this.noZoom ) {
            _this.zoomCamera();
        }

        if ( !_this.noPan ) {
            _this.panCamera();
        }

        _this.object.position.addVectors( _this.target, _eye );

        _this.checkDistances();

        _this.object.lookAt( _this.target );

        if ( lastPosition.distanceToSquared( _this.object.position ) > EPS ) {
            _this.dispatchEvent( changeEvent );

            lastPosition.copy( _this.object.position );
        }
    };

    this.reset = function () {
        _state = STATE.NONE;
        _prevState = STATE.NONE;

        _this.target.copy( _this.target0 );
        _this.object.position.copy( _this.position0 );
        _this.object.up.copy( _this.up0 );

        _eye.subVectors( _this.object.position, _this.target );

        _this.object.lookAt( _this.target );

        _this.dispatchEvent( changeEvent );

        lastPosition.copy( _this.object.position );
    };

    // listeners

    function keydown( event ) {
        console.log(event.keyCode);
        /**
         * 37 = left
         * 39 = right
         * 38 = up
         * 40 = down
         */

        switch(event.keyCode){
            // Left
            case 37:
                console.log('Left');
                _this.curYAngle += 10;
                break;
            // Right
            case 39:
                console.log('Right');
                _this.curYAngle -= 10;
                break;

            // Up
            case 38:
                console.log('Up');
                _this.curXAngle += 10;
                break;
            // Down
            case 40:
                console.log('Down');
                _this.curXAngle -= 10;
                break;

            // Space
            case 32:
                _this.curXAngle = 0;
                _this.curYAngle = 0;
                break;
            default:
                return;
        }

        updateCamera();

        // console.log('keydown', event);
        // if ( _this.enabled === false ) return;

        // window.removeEventListener( 'keydown', keydown );

        // _prevState = _state;

        // if ( _state !== STATE.NONE ) {
        //     return;
        // } else if ( event.keyCode === _this.keys[ STATE.ROTATE ] && !_this.noRotate ) {
        //     _state = STATE.ROTATE;
        // } else if ( event.keyCode === _this.keys[ STATE.ZOOM ] && !_this.noZoom ) {
        //     _state = STATE.ZOOM;
        // } else if ( event.keyCode === _this.keys[ STATE.PAN ] && !_this.noPan ) {
        //     _state = STATE.PAN;
        // }
    }

    function updateCamera(){
        var xPrime = new THREE.Vector3(Math.cos(degToRad(_this.curYAngle)), Math.sin(degToRad(_this.curYAngle)), 0).normalize();

        console.log('X: '+_this.curXAngle);
        console.log('Y: '+_this.curYAngle);
        console.log('Z: '+_this.curZAngle);

        _this.object.rotateOnAxis(_this.yAxis, degToRad(_this.curYAngle));
        _this.object.rotateOnAxis(xPrime, degToRad(_this.curXAngle));
        //_this.object.rotateOnAxis(zAxis, _this.curZAngle);

        _this.dispatchEvent( changeEvent );
    }

    function keyup( event ) {
        // if ( _this.enabled === false ) return;

        // _state = _prevState;
        // window.addEventListener( 'keydown', keydown, false );
    }

    function degToRad(deg) {
        return deg * Math.PI / 180;
    }

    function mousedown( event ) {
        if ( _this.enabled === false ) return;

        event.preventDefault();
        event.stopPropagation();

        if ( _state === STATE.NONE ) {
            _state = event.button;
        }

        if ( _state === STATE.ROTATE && !_this.noRotate ) {
            _rotateStart.copy( getMouseProjectionOnBall( event.pageX, event.pageY ) );
            _rotateEnd.copy( _rotateStart );
        } else if ( _state === STATE.ZOOM && !_this.noZoom ) {
            _zoomStart.copy( getMouseOnScreen( event.pageX, event.pageY ) );
            _zoomEnd.copy(_zoomStart);
        } else if ( _state === STATE.PAN && !_this.noPan ) {
            _panStart.copy( getMouseOnScreen( event.pageX, event.pageY ) );
            _panEnd.copy(_panStart)
        }

        document.addEventListener( 'mousemove', mousemove, false );
        document.addEventListener( 'mouseup', mouseup, false );

        _this.dispatchEvent( startEvent );
    }

    function mousemove( event ) {
        if ( _this.enabled === false ) return;

        event.preventDefault();
        event.stopPropagation();

        if ( _state === STATE.ROTATE && !_this.noRotate ) {
            _rotateEnd.copy( getMouseProjectionOnBall( event.pageX, event.pageY ) );
        } else if ( _state === STATE.ZOOM && !_this.noZoom ) {
            _zoomEnd.copy( getMouseOnScreen( event.pageX, event.pageY ) );
        } else if ( _state === STATE.PAN && !_this.noPan ) {
            _panEnd.copy( getMouseOnScreen( event.pageX, event.pageY ) );
        }
    }

    function mouseup( event ) {
        if ( _this.enabled === false ) return;

        event.preventDefault();
        event.stopPropagation();

        _state = STATE.NONE;

        document.removeEventListener( 'mousemove', mousemove );
        document.removeEventListener( 'mouseup', mouseup );
        _this.dispatchEvent( endEvent );
    }

    function mousewheel( event ) {
        if ( _this.enabled === false ) return;

        event.preventDefault();
        event.stopPropagation();

        var delta = 0;

        if ( event.wheelDelta ) { // WebKit / Opera / Explorer 9
            delta = event.wheelDelta / 40;
        } else if ( event.detail ) { // Firefox
            delta = - event.detail / 3;
        }

        _zoomStart.y += delta * 0.01;
        _this.dispatchEvent( startEvent );
        _this.dispatchEvent( endEvent );
    }

    function touchstart( event ) {
        if ( _this.enabled === false ) return;

        switch ( event.touches.length ) {
            case 1:
                _state = STATE.TOUCH_ROTATE;
                _rotateStart.copy( getMouseProjectionOnBall( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY ) );
                _rotateEnd.copy( _rotateStart );
                break;
            case 2:
                _state = STATE.TOUCH_ZOOM_PAN;
                var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
                var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
                _touchZoomDistanceEnd = _touchZoomDistanceStart = Math.sqrt( dx * dx + dy * dy );

                var x = ( event.touches[ 0 ].pageX + event.touches[ 1 ].pageX ) / 2;
                var y = ( event.touches[ 0 ].pageY + event.touches[ 1 ].pageY ) / 2;
                _panStart.copy( getMouseOnScreen( x, y ) );
                _panEnd.copy( _panStart );
                break;
            default:
                _state = STATE.NONE;
        }
        _this.dispatchEvent( startEvent );
    }

    function touchmove( event ) {
        if ( _this.enabled === false ) return;

        event.preventDefault();
        event.stopPropagation();

        switch ( event.touches.length ) {
            case 1:
                _rotateEnd.copy( getMouseProjectionOnBall( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY ) );
                break;
            case 2:
                var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
                var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
                _touchZoomDistanceEnd = Math.sqrt( dx * dx + dy * dy );

                var x = ( event.touches[ 0 ].pageX + event.touches[ 1 ].pageX ) / 2;
                var y = ( event.touches[ 0 ].pageY + event.touches[ 1 ].pageY ) / 2;
                _panEnd.copy( getMouseOnScreen( x, y ) );
                break;
            default:
                _state = STATE.NONE;
        }
    }

    function touchend( event ) {
        if ( _this.enabled === false ) return;

        switch ( event.touches.length ) {
            case 1:
                _rotateEnd.copy( getMouseProjectionOnBall( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY ) );
                _rotateStart.copy( _rotateEnd );
                break;
            case 2:
                _touchZoomDistanceStart = _touchZoomDistanceEnd = 0;

                var x = ( event.touches[ 0 ].pageX + event.touches[ 1 ].pageX ) / 2;
                var y = ( event.touches[ 0 ].pageY + event.touches[ 1 ].pageY ) / 2;
                _panEnd.copy( getMouseOnScreen( x, y ) );
                _panStart.copy( _panEnd );
                break;
        }

        _state = STATE.NONE;
        _this.dispatchEvent( endEvent );
    }

    function swipeListener(swipe, frame){
        // Print its data when the state is start or stop
        if (swipe.state === 'stop') {
            var dir = swipe.direction;
            var dirStr = dir[0] > 0.8 ? 'right' : dir[0] < -0.8 ? 'left'
                       : dir[1] > 0.8 ? 'up'    : dir[1] < -0.8 ? 'down'
                       : dir[2] > 0.8 ? 'backward' : 'forward';
            if(dirStr === 'left' || dirStr === 'right'){
                console.log(swipe.state, swipe.type, swipe.id, dirStr,
                            'direction:', dir, 'speed:', swipe.speed);


                // Move opposite of the swipe
                if(dirStr == 'left'){
                    _this.curYAngle -= (swipe.speed / 15);
                } else {
                    _this.curYAngle += (swipe.speed / 15);
                }

                updateCamera();
            }
        }
    }

    controller.on('swipe', swipeListener);

    this.domElement.addEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );

    // this.domElement.addEventListener( 'mousedown', mousedown, false );

    // this.domElement.addEventListener( 'mousewheel', mousewheel, false );
    // this.domElement.addEventListener( 'DOMMouseScroll', mousewheel, false ); // firefox

    // this.domElement.addEventListener( 'touchstart', touchstart, false );
    // this.domElement.addEventListener( 'touchend', touchend, false );
    // this.domElement.addEventListener( 'touchmove', touchmove, false );

    window.addEventListener( 'keydown', keydown, false );
    window.addEventListener( 'keyup', keyup, false );

    this.handleResize();

    // force an update at start
    this.update();
};

THREE.CameraControls.prototype = Object.create( THREE.EventDispatcher.prototype );
