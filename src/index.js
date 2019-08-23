import Sortable from 'sortablejs'; // library for Drag'n'Drop
import './styles/main.scss';    
import './styles/normalize.scss'; // Better cross browser support

ymaps.ready(init);
    function init(){ 
        // map initialization    
        let myMap = new ymaps.Map('map', {
            center: [55.751574, 37.573856],
            zoom: 9,
            controls: []
        }, {
            searchControlProvider: 'yandex#search'
        });
    
    // Autocomplete for search bar
    let suggestView1 = new ymaps.SuggestView('new_point_input');
    // Create new point on selecting any choice
    suggestView1.events.add('select', function (e) {
        let newPointText = e.get('item').value;
        makeNewPoint(newPointText);
        e.get('item').value = '';     
    });
    // Global variable made to prevent same search two times in a row
    let oldPointText = '';


    // List of adress names
    let currentPoints = [];
    
    // List of geoObjects that was found by geocode
    let geoObjects = [];

    let polyineCoordinates = [];
    
    let newPointInput = document.getElementById('new_point_input');
    let pointsList = document.getElementById('points');

    //Make search on Enter
    newPointInput.addEventListener('keyup', (e) => {
        if (e.keyCode === 13) {
            let newPointText = newPointInput.value;
            makeNewPoint(newPointText);
            newPointInput.value = '';        }
    })

    // 
    const makeNewPoint = (newText) => {
        // Prevent creating same point twice
        if (oldPointText !== newText) { 
            // Save adress
            currentPoints.push(newText);
            // Find location by adress
            geocodePoint(newText, currentPoints.length - 1);
            // Recreate list and map objects
            refresh();
            oldPointText = newText;
        }
    }

    // Refresh block //  
    const renderPointList = (array, list) => {
        array.forEach((element,index) => {
            list.appendChild(createPointListElement(element, index));
        });
    }

    const clearPointList = (list) => {
        while (list.firstChild) {
            list.removeChild(list.firstChild)
        }
    }
    // Create <li></li> element with adress and button inside it and return it
    const createPointListElement = (text, index) => {
        let newPoint = document.createElement('li'); 
        newPoint.textContent = index+1 + '. ' + text;

        let deleteButton = document.createElement('button');
        deleteButton.innerHTML = '<i class="material-icons">close</i>'
        deleteButton.addEventListener('click', () => {
            newPoint.parentNode.removeChild(newPoint);
            removePoint(index);
            refresh();
        })
        newPoint.appendChild(deleteButton);
        
        return newPoint;
    }

    const removePoint = (index) => {
        currentPoints.splice(index, 1);
        geoObjects.splice(index,1);
        polyineCoordinates.splice(index,1);
    }

    const refresh = () => {
        myMap.geoObjects.removeAll(); //Delete all Placemarks and Polyline from mao
        clearPointList(pointsList);
        renderPointList(currentPoints, pointsList);
        fillMap(); //Fill map with saved Placemarks
        drawRoute(polyineCoordinates); //Redraw polyline
    }



    // Get coordinates by adress
    const geocodePoint = (point, index) => {
        let myGeocoder = ymaps.geocode(point);
        myGeocoder.then(function(res) {
            if (res.geoObjects.get(0))
            {
                // Enable drag and drop
                res.geoObjects.get(0).options.set("draggable", true); 
                res.geoObjects.get(0).events.add("dragend", (event) => {
                    dragEnd(event, index);
                })
                // Place adress inside baloon
                res.geoObjects.get(0).properties.set('balloonContentBody', point);
                // Save Placemark
                geoObjects.push(res.geoObjects.get(0));
                polyineCoordinates.push(res.geoObjects.get(0).geometry._coordinates)
                // Go to Placemark on map
                myMap.setCenter(res.geoObjects.get(0).geometry._coordinates, 9, "map");
                refresh();
            } else {
                removePoint(index);
                refresh();
                alert('Не удалось найти адрес, попробуйте еще раз');
            }
        });
    }

    const fillMap = () => {
        geoObjects.forEach( (element, index) => {
            // Set index to Placemark before adding it
            element.properties.set('iconContent', index + 1);
            myMap.geoObjects.add(element);
        });
    }
    
    const drawRoute = (coordinates) => {
        if (coordinates[0] != undefined) {
        let myPolyline = new ymaps.Polyline(coordinates, {
            balloonContent: "Маршрут"
        }, {
            balloonCloseButton: false,
            strokeColor: "#00ffff",
            strokeWidth: 6,
            strokeOpacity: 0.5
        });

        myMap.geoObjects.add(myPolyline);

        if (coordinates.length > 1) {}
        //Line below enables to scale map so polyline can fit into it. 
        //But it prevents from centering map on Placemark upon it creation.
        //myMap.setBounds(myPolyline.geometry.getBounds());
        }
    }

    // Drag'n'Drop
    const arrayMove = require('array-move');
    var el = document.getElementById('points');
    var sortable = Sortable.create(el, {
        // Element dragging ended
        onEnd: function (/**Event*/evt) {
            currentPoints = arrayMove(currentPoints, evt.oldIndex, evt.newIndex);
            geoObjects = arrayMove(geoObjects, evt.oldIndex, evt.newIndex);
            polyineCoordinates = arrayMove(polyineCoordinates, evt.oldIndex, evt.newIndex);
            refresh();
        },
    });

    const dragEnd = (event, index) => {
        //Get new coordinates after dragging Placemark
        let draggedPlacemark = event.get('target');
        let newCoordinates = draggedPlacemark.geometry._coordinates;
        //Apply reverse geocoding to this coordinates
        let myGeocoder = ymaps.geocode(newCoordinates);
        myGeocoder.then(function(res) {
            //Get new adress and set it inside baloon
            let newName = res.geoObjects.get(0)? res.geoObjects.get(0).properties.get('name') : "Не удалось определить адресс";
            draggedPlacemark.properties.set('balloonContentBody', newName);
            //Save new Placemark
            currentPoints[index] = newName;
            polyineCoordinates[index] = newCoordinates;
            geoObjects[index] = draggedPlacemark;
            refresh();
        })
    }

    //Start
    refresh();
}