General TODO

* Migrate this list to something more appropriate like Jira/Taiga
* ~~Enhance grunt scripts to utilize grunt server and watch the developer folders for changes~~

DataSphere TODO

* Replace objectify and drawElements methods with simply API for adding HTML elements to the data sphere.  Ideally, this would be the API other visualization code would use to add tables/charts/etc. to individual displays on the sphere.
    * addElement(element, [row], [column])
    * removeElement(element)
    * reset()
* Provide accessors and init methods for DataSphere scene, camera, and default lighting
* Modify DataSphere to fix primary camera position inside the sphere.
    * The delimited.io examples start the view outside of the display area and move the camera inside it.  We want to fix our view inside it and scale the tween'd area around the user's view.
* Modify visualizations to be rendered on the inside of the sphere, not on the outside surface
* Use the Neon library or Neon-gtd application to populate an example data sphere with a few basic visualizations. (epic - need to break this down further)

Oculus TODO

* Explore the use of oculus-rest for head tracking data.
    * Decide whether we assume oculus-rest is setup separately or we have a grunt task to do it
    * update readme accordingly
* Setup an Ajax module to poll an oculus-rest endpoint
    * See http://threejs.org/examples/#misc_controls_oculusrift
    * See https://github.com/SoylentGraham/oculus-rest
* Add configuration methods to DataSphere to enable/disable oculus rift view and toggle the display appropriately

Leap TODO

* Create modules to represent leap motion hands; refactor leap boilerplate
    * contructor
    * getMesh() - return objects to be rendered in threejs
    * updatePosition(handData) - Updates last known position data and mesh objects from Leap frame data
* Add a Leap control loop to datasphere to display hands when available
* Add a basic hand renderer - can be similar to Leap boilerplate, flat shaded polygons to start
* Add motion handlers to leap hands to rotate the data sphere and zoom it in/out
