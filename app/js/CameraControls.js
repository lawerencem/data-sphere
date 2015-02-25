/**
 * Based on the TrackBallControls by
 * @author Eberhard Graether / http://egraether.com/
 * @author Mark Lundin  / http://mark-lundin.com
 */

THREE.CameraControls = function (object, domElement, controller) {
    var _this = this;
    var STATE = { NONE: -1, ROTATE: 0, ZOOM: 1 };

    this.object = object;
    this.domElement = ( domElement !== undefined ) ? domElement : document;

    // API
    this.enabled = true;

    this.screen = { left: 0, top: 0, width: 0, height: 0 };

    this.rotateSpeed = 1.0;
    this.zoomSpeed = 1.2;

    this.noRotate = false;
    this.noZoom = false;
    this.noRoll = false;

    // Leap rotate params
    // rotation
    this.rotateHands         = 1;
    this.rotateFingers       = [3, 5];
    this.rotateRightHanded   = true;
    this.rotateHandPosition  = true;
    this.rotateStabilized    = false;
    this.rotateMin           = 0;
    this.rotateMax           = Math.PI;

    this.staticMoving = false;
    this.dynamicDampingFactor = 0.2;

    // internals
    this.target = new THREE.Vector3();
    var _rotateXLast         = null;
    var _rotateYLast         = null;

    var EPS = 0.000001;

    var lastPosition = new THREE.Vector3();

    var _state = STATE.NONE,
    _prevState = STATE.NONE,

    _eye = new THREE.Vector3(),

    _rotateStart = new THREE.Vector3(),
    _rotateEnd = new THREE.Vector3(),

    _zoomStart = new THREE.Vector2(),
    _zoomEnd = new THREE.Vector2();

    // for reset
    this.target0 = this.target.clone();
    this.position0 = this.object.position.clone();
    this.up0 = this.object.up.clone();

    // events
    var changeEvent = { type: 'change' };
    var startEvent = { type: 'start'};
    var endEvent = { type: 'end'};


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
            );
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

    // Leap helper functions
    this.transformFactor = function(action) {
        switch(action) {
            case 'rotate':
            return _this.rotateSpeed * (_this.rotateHandPosition ? 1 : _this.fingerFactor);
            case 'zoom':
            return _this.zoomSpeed * (_this.zoomHandPosition ? 1 : _this.fingerFactor);
            case 'pan':
            return _this.panSpeed * (_this.panHandPosition ? 1 : _this.fingerFactor);
        };
    };

    this.rotateTransform = function(delta) {
        return _this.transformFactor('rotate') * THREE.Math.mapLinear(delta, 100, -100, -Math.PI, Math.PI);
    };

    this.zoomTransform = function(delta) {
        return _this.transformFactor('zoom') * THREE.Math.mapLinear(delta, -400, 400, -_this.step, _this.step);
    };

    this.panTransform = function(delta) {
        return _this.transformFactor('pan') * THREE.Math.mapLinear(delta, -400, 400, -_this.step, _this.step);
    };

    this.applyGesture = function(frame, action) {
        var hl = frame.hands.length;
        var fl = frame.pointables.length;

        switch(action) {
            case 'rotate':
            if (_this.rotateHands instanceof Array) {
                if (_this.rotateFingers instanceof Array) {
                    if (_this.rotateHands[0] <= hl && hl <= _this.rotateHands[1] && _this.rotateFingers[0] <= fl && fl <= _this.rotateFingers[1]) return true;
                } else {
                    if (_this.rotateHands[0] <= hl && hl <= _this.rotateHands[1] && _this.rotateFingers == fl) return true;
                };
            } else {
                if (_this.rotateFingers instanceof Array) {
                    if (_this.rotateHands == hl && _this.rotateFingers[0] <= fl && fl <= _this.rotateFingers[1]) return true;
                } else {
                    if (_this.rotateHands == hl && _this.rotateFingers == fl) return true;
                };
            };
            break;
            case 'zoom':
            if (_this.zoomHands instanceof Array) {
                if (_this.zoomFingers instanceof Array) {
                    if (_this.zoomHands[0] <= hl && hl <= _this.zoomHands[1] && _this.zoomFingers[0] <= fl && fl <= _this.zoomFingers[1]) return true;
                } else {
                    if (_this.zoomHands[0] <= hl && hl <= _this.zoomHands[1] && _this.zoomFingers == fl) return true;
                };
            } else {
                if (_this.zoomFingers instanceof Array) {
                    if (_this.zoomHands == hl && _this.zoomFingers[0] <= fl && fl <= _this.zoomFingers[1]) return true;
                } else {
                    if (_this.zoomHands == hl && _this.zoomFingers == fl) return true;
                };
            };
            break;
            case 'pan':
            if (_this.panHands instanceof Array) {
                if (_this.panFingers instanceof Array) {
                    if (_this.panHands[0] <= hl && hl <= _this.panHands[1] && _this.panFingers[0] <= fl && fl <= _this.panFingers[1]) return true;
                } else {
                    if (_this.panHands[0] <= hl && hl <= _this.panHands[1] && _this.panFingers == fl) return true;
                };
            } else {
                if (_this.panFingers instanceof Array) {
                    if (_this.panHands == hl && _this.panFingers[0] <= fl && fl <= _this.panFingers[1]) return true;
                } else {
                    if (_this.panHands == hl && _this.panFingers == fl) return true;
                };
            };
            break;
        };

        return false;
    };

    this.hand = function(frame, action) {
        var hds = frame.hands;

        if (hds.length > 0) {
            if (hds.length == 1) {
                return hds[0];
            } else if (hds.length == 2) {
                var lh, rh;
                if (hds[0].palmPosition[0] < hds[1].palmPosition[0]) {
                    lh = hds[0];
                    rh = hds[1];
                } else {
                    lh = hds[1];
                    rh = hds[0];
                }
                switch(action) {
                    case 'rotate':
                    if (_this.rotateRightHanded) {
                        return rh;
                    } else {
                        return lh;
                    };
                    case 'zoom':
                    if (_this.zoomRightHanded) {
                        return rh;
                    } else {
                        return lh;
                    };
                    case 'pan':
                    if (_this.panRightHanded) {
                        return rh;
                    } else {
                        return lh;
                    };
                };
            };
        };

        return false;
    };

    this.position = function(frame, action) {
        // assertion: if `...HandPosition` is false, then `...Fingers` needs to be 1 or [1, 1]
        var h;
        switch(action) {
            case 'rotate':
            h = _this.hand(frame, 'rotate');
            return (_this.rotateHandPosition 
                ? (_this.rotateStabilized ? h.stabilizedPalmPosition : h.palmPosition) 
                : (_this.rotateStabilized ? frame.pointables[0].stabilizedTipPosition : frame.pointables[0].tipPosition)
                );
            case 'zoom':
            h = _this.hand(frame, 'zoom');
            return (_this.zoomHandPosition 
                ? (_this.zoomStabilized ? h.stabilizedPalmPosition : h.palmPosition) 
                : (_this.zoomStabilized ? frame.pointables[0].stabilizedTipPosition : frame.pointables[0].tipPosition)
                );
            case 'pan':
            h = _this.hand(frame, 'pan');
            return (_this.panHandPosition
                ? (_this.panStabilized ? h.stabilizedPalmPosition : h.palmPosition) 
                : (_this.panStabilized ? frame.pointables[0].stabilizedTipPosition : frame.pointables[0].tipPosition)
                );
        };
    };

    // Leap methods
    this.leapRotateCamera = function(frame) {
        if (_this.applyGesture(frame, 'rotate')) {
            // rotate around axis in xy-plane (in target coordinate system) which is orthogonal to camera vector
            var y = _this.position(frame, 'rotate')[1];
            if (!_rotateYLast){
                _rotateYLast = y;
            }
            var yDelta = y - _rotateYLast;
            var t = new THREE.Vector3().subVectors(_this.object.position, _this.target); // translate
            angleDelta = _this.rotateTransform(yDelta);
            newAngle = t.angleTo(new THREE.Vector3(0, 1, 0)) + angleDelta;
            if (_this.rotateMin < newAngle && newAngle < _this.rotateMax) {
                var n = new THREE.Vector3(t.z, 0, -t.x).normalize();
                var matrixX = new THREE.Matrix4().makeRotationAxis(n, angleDelta);
                _this.object.position = t.applyMatrix4(matrixX).add(_this.target); // rotate and translate back        
            };

            // rotate around y-axis translated by target vector
            var x = _this.position(frame, 'rotate')[0];
            if (!_rotateXLast) {
                _rotateXLast = x;
            }
            var xDelta = x - _rotateXLast;
            var matrixY = new THREE.Matrix4().makeRotationY(-_this.rotateTransform(xDelta));
            _this.object.position.sub(_this.target).applyMatrix4(matrixY).add(_this.target); // translate, rotate and translate back
            _this.object.lookAt(_this.target);

            _rotateYLast = y;
            _rotateXLast = x;   
        } else {
            _rotateYLast = null;
            _rotateXLast = null;      
        }
        _this.dispatchEvent( changeEvent );
    };

    this.updateFrame = function(frame) {
        if (_this.enabled) {
            _this.leapRotateCamera(frame);
        };
    };

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
        var factor = 1.0 + ( _zoomEnd.y - _zoomStart.y ) * _this.zoomSpeed;

        if ( factor !== 1.0 && factor > 0.0 ) {
            _eye.multiplyScalar( factor );
            if ( _this.staticMoving ) {
                _zoomStart.copy( _zoomEnd );
            } else {
                _zoomStart.y += ( _zoomEnd.y - _zoomStart.y ) * this.dynamicDampingFactor;
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

        _this.object.position.addVectors( _this.target, _eye );

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

    this.domElement.addEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );

    this.domElement.addEventListener( 'mousedown', mousedown, false );

    this.domElement.addEventListener( 'mousewheel', mousewheel, false );
    this.domElement.addEventListener( 'DOMMouseScroll', mousewheel, false ); // firefox

    this.handleResize();

    controller.addStep(function(frame){
        _this.updateFrame(frame);
        return frame;
    });

    // force an update at start
    this.update();
};

THREE.CameraControls.prototype = Object.create( THREE.EventDispatcher.prototype );
