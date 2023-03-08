/* Map of GeoJSON data from UWEnrollments.geojson */
//declare map var in global scope
var map;

//Switch to decide if UW-Madison should be drawn as transparent or not
//var hideMadison = false;

//Create the Leaflet map
function createMap(){
    //create the map
    map = L.map('map', {
        center: [44.5, -89.5],
        zoom: 6
    });
    
    // Add Stamen tile layer
    L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}{r}.{ext}', {
        attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        subdomains: 'abcd',
        minZoom: 0,
        maxZoom: 20,
        ext: 'png'
    }).addTo(map);
    
    //call getData function
    getData(map)
    };

//function to calculate minimum value
function calculateMinValue(data){
    //create empty array to store all data values
    var allValues = [];
    //loop through each campus
    for(var campus of data.features){
        //loop through each year
        for(var year = 1973; year <= 2022; year+=5){
              //get population for current year
              var value = campus.properties["F"+ String(year)];
              //add value to array
              allValues.push(value);
        }
    }
    //get minimum value of our array
    var minValue = Math.min(...allValues)

    return minValue;
}

//calculate the radius of each proportional symbol
function calcPropRadius(attValue) {
    //constant factor adjusts symbol sizes evenly
    var minRadius = 5;
    //Flannery Apperance Compensation formula
    var radius = 1.0083 * Math.pow(attValue/minValue,0.5715) * minRadius

    return radius;
};

//calcuate opacity of proportional symbol
function calculate_opacity(attValue) {
    let opacity = (-0.05 * attValue + 75) / 100;
    if (opacity < 0.25) {
        opacity = 0.25;
    }
    return opacity
}

//function to convert markers to circle markers and add popups
function pointToLayer(feature, latlng, attributes){
    //determine which attribute to visualize with propportional symbols
    var attribute = attributes[0];
    //check
    console.log(attribute);

    //create marker options
    var options = {
                fillColor: "#990033",
                color: "#691C32",
                weight: 0.5,
                opacity: 1,
                //fillOpacity: 0.8
      };
    
    //For each feature, determine its value for the selected attribute
    var attValue = Number(feature.properties[attribute]);
    
    //Give each feature's circle marker a radius based on its attribute value
    options.radius = calcPropRadius(attValue);
    
    //create circle marker layer
    var layer = L.circleMarker(latlng, options);
    
    //build popup content string starting with campus
    var popupContent = "<p><b>Campus:</b> " + feature.properties.Campus + "</p>";
    
    //add formatted attribute to popup content string
    var year = attribute.split("F")[1];
    popupContent += "<p><b>Enrollment in " + year + ": </b>" + attValue.toLocaleString("en-US");
    
    //bind the popup to the circle marker
    layer.bindPopup(popupContent, {
        offset: new L.Point(0,-options.radius)
    });
    
    //return the circle marker to the L.geoJson pointToLayer option
    return layer;
};

//Add circle markers for point features to the map
function createPropSymbols(data, attributes){
    //create a Leaflet GeoJSON layer and add it to the map
    L.geoJson(data, {
        pointToLayer: function(feature, latlng){
            return pointToLayer(feature, latlng, attributes);
        }
    }).addTo(map);
};

//Resize proportional symbols according to new attribute values
function updatePropSymbols(attribute){
    map.eachLayer(function(layer){
        if (layer.feature && layer.feature.properties[attribute]){
          //access feature properties
           var props = layer.feature.properties;

           //update each feature's radius based on new attribute values
           var radius = calcPropRadius(props[attribute]);
           layer.setRadius(radius);
           layer.setStyle({
               fillOpacity: calculate_opacity(props[attribute])
           });

           //add city to popup content string
           var popupContent = "<p><b>Campus:</b> " + props.Campus + "</p>";

           //add formatted attribute to panel content string
           var year = attribute.split("F")[1];
           popupContent += "<p><b>Enrollment in " + year + ": </b> " + props[attribute].toLocaleString("en-US");

           //update popup with new content
           popup = layer.getPopup();
           popup.setContent(popupContent).update();

        };
    });
};

//Create sequence controls
function createSequenceControls(attributes){
    //create range input element (slider)
    var slider = "<input class='range-slider' type='range'></input>";
    document.querySelector("#panel").insertAdjacentHTML('beforeend',slider);
    
    //set slider attributes
    document.querySelector(".range-slider").max = 49;
    document.querySelector(".range-slider").min = 0;
    document.querySelector(".range-slider").value = 0;
    document.querySelector(".range-slider").step = 1;
   
   //add step buttons
   document.querySelector('#panel').insertAdjacentHTML('beforeend','<button class="step" id="reverse"></button>');
    document.querySelector('#panel').insertAdjacentHTML('beforeend','<button class="step" id="forward"></button>');
    
    //replace button content with images
    document.querySelector('#reverse').insertAdjacentHTML('beforeend',"<img src='img/reverse.png'>")
    document.querySelector('#forward').insertAdjacentHTML('beforeend',"<img src='img/forward.png'>")

    //click listener for buttons
    document.querySelectorAll('.step').forEach(function(step){
        step.addEventListener("click", function(){
           var index = document.querySelector('.range-slider').value;
            //increment or decrement depending on button clicked
            if (step.id == 'forward'){
                index++;
                //if past the last attribute, wrap around to first attribute
                index = index > 49 ? 0 : index;
            } else if (step.id == 'reverse'){
                index--;
                //if past the first attribute, wrap around to last attribute
                index = index < 0 ? 49 : index;
            };

            //update slider
            document.querySelector('.range-slider').value = index;
            
            //pass new attribute to update symbols
            updatePropSymbols(attributes[index]);
           })
    })

    //input listener for slider
    document.querySelector('.range-slider').addEventListener('input', function(){          //get the new index value
        var index = this.value;
        //check
        console.log(index);
        //pass new attribute to update symbols
        updatePropSymbols(attributes[index]);
        });
  };

//build an attributes array from the data
function processData(data){
    //empty array to hold attributes
    var attributes = [];

    //properties of the first feature in the dataset
    var properties = data.features[0].properties;

    //push each attribute name into attributes array
    for (var attribute in properties){
        //only take attributes with population values
        if (attribute.indexOf("F") > -1){
            attributes.push(attribute);}
        };

    //check result
    console.log(attributes);

    return attributes;
};

//function to filter campuses
function filter (attributes){
    
}


//function to hide Madison
//var HideHubeiControl = L.Control.extend({
    //options: {
       // position: 'topright'
   // },
    
    //onAdd: function(map) {
       // let container = L.DomUtil.create('div', 'hide-hubei');
       // $(container).append('<input type="checkbox" id="hide-hubei-check" name="hide-hubei-check" value="hideHubei">');
      //  $(container).append('<label for="hide-hubei-check">Hide Hubei</label>');
        
     //   return container
   // }
//})

//Import GeoJSON data
function getData(){
    //load the data
    fetch("data/UWEnrollments.geojson")
        .then(function(response){
            return response.json();
        })
        .then(function(json){
        //create an attributes array
        var attributes = processData(json);
        //calculate minimum value
        minValue = calculateMinValue(json);
        //call function to create proportional symbols
        createPropSymbols(json, attributes);
        //call function to create sequence controls
        createSequenceControls(attributes);
    })
 };

document.addEventListener('DOMContentLoaded',createMap)