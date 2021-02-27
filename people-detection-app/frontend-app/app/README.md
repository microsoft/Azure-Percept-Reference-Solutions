# People Detection Frontend Application 
This is a React web app.

## Building locally
After cloning, run 'npm install'.

### Build and Test
To test, run 'npm start'.
To build, run 'npm run build --prod --nomaps'.  Then copy/paste the contents of the Build folder into the public folder of the frontend-app/api.

# Notes
The blob storage CORS requires GET and HEAD

# Zone Editor

## General Usage
Press 1, 2 or 3 to edit by point, edge or shape
mouse over a point/edge/shape to select for editing
a selected point/edge/shape is highlighted in yellow

### To edit by point:
- Click to add a point
- Click, hold and drag to move a selected point
- Press delete to delete a selected point
- Press insert to insert a point after a selected point

### To edit by edge:
- click, hold and drag to move a selected edge

### To edit by shape:
Click, hold and drag to move a selected shape

## App Usage Tutorial Video
[Watch the zone editing tutorial video](zone_editing.mp4)

# (Optional App Component) WASM: compile collision.cpp to collision.js
Download and install the latest emsdk at https://emscripten.org/docs/getting_started/downloads.html
To compile, using the cmd/terminal:
    cd to the emsdk folder
    run emcmdprompt.bat
    cd to the ues-app/app folder
    run emcc src/models/collision.cpp -s WASM=1 -s "EXPORTED_FUNCTIONS=['_main', '_isBBoxInZone']" -o public/collision.js
Copy/paste into index.html in head:
    <script async type="text/javascript" src="collision.js"></script>
    <script>
        window.Module = Module;
    </script>