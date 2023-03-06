/* Map of GeoJSON data from UWEnrollments.geojson */
//declare variables in global scope
var map;
var dataStats = {};

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
        minZoom: 6,
        maxZoom: 9,
        ext: 'png'
    }).addTo(map);
    
    //call getData function
    getData(map)
    };

//function to calculate statistics
function calcStats(data){
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
    //get min, max, mean stats for our array
    dataStats.min = Math.min(...allValues);
    dataStats.max = Math.max(...allValues);
    //calculate meanValue
    var sum = allValues.reduce(function (a, b) {
        return a + b;
  });
  dataStats.mean = sum / allValues.length;
}

//calculate the radius of each proportional symbol
function calcPropRadius(attValue) {
    //constant factor adjusts symbol sizes evenly
    var minRadius = 5;
    //Flannery Apperance Compensation formula
    var radius = 1.0083 * Math.pow(attValue/dataStats.min,0.5715) * minRadius
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
function PopupContent (properties, attribute){
    this.properties = properties;
    this.attribute = attribute;
    this.year = attribute.split("F")[1];
    this.enrollment = this.properties[attribute];
    this.formatted = "<p><b>Campus:</b> " + this.properties.Campus + "</p><p><b>FTE Enrollment in " + this.year + ":</b> " + this.enrollment + "</p>";
};

//function to convert markers to circle markers and add popups
function pointToLayer(feature, latlng, attributes){
    //Determine which attribute to visualize with proportional symbols
    var attribute = attributes[0];

    //create marker options
    var options = {
                fillColor: "#990033",
                color: "#691C32",
                weight: 0.5,
                opacity: 1,
      };
    
    //For each feature, determine its value for the selected attribute
    var attValue = Number(feature.properties[attribute]);
    
    //Give each feature's circle marker a radius based on its attribute value
    options.radius = calcPropRadius(attValue);
    
    //create circle marker layer
    var layer = L.circleMarker(latlng, options);
    
    //build popup content string starting with campus
    var popupContent = new PopupContent(feature.properties, attribute);
    
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

//function to get circle enrollment values
function getCircleValues(attribute) {
   //start with min at highest possible and max at lowest possible number
  var min = Infinity,
    max = -Infinity;

    map.eachLayer(function (layer) {
    //get the attribute value
    if (layer.feature) {
      var attributeValue = Number(layer.feature.properties[attribute]);

      //test for min
      if (attributeValue < min) {
        min = attributeValue;
      }

      //test for max
      if (attributeValue > max) {
        max = attributeValue;
      }
    }
  });

  //set mean
  var mean = (max + min) / 2;

  //return values as an object
  return {
    max: max,
    mean: mean,
    min: min,
  };
};

//update legend with enrollment data as years are sequenced
function updateLegend(attribute) {
  //create content for legend
  var year = attribute.split("F")[1];
  //replace legend content
  document.querySelector("span.year").innerHTML = year;

  //get the max, mean, and min values as an object
  var circleValues = getCircleValues(attribute);

  for (var key in circleValues) {
    //get the radius
    var radius = calcPropRadius(circleValues[key]);

    document.querySelector("#" + key).setAttribute("cy", 59 - radius);
    document.querySelector("#" + key).setAttribute("r", radius)

    document.querySelector("#" + key + "-text").textContent = Math.round(circleValues[key] * 100) / 100;
  }
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

           //add campus to popup content string
           var popupContent = new PopupContent(props, attribute);

           //update popup with new content
           popup = layer.getPopup();
           popup.setContent(popupContent.formatted).update();

        };
    });
    //update legend
    updateLegend(attribute); 
};

//Create sequence controls
function createSequenceControls(attributes){
    
    //create Slider control
    var Slider = L.Control.extend({
        options: {
            position: "bottomleft"
        },
        
        onAdd: function () {
            //create the control container div with a particular class name
            var container = L.DomUtil.create('div', 'sequence-control-container');
            
            //create range input element (slider)
            container.insertAdjacentHTML('beforeend', '<input class="range-slider" type="range">')

            //add skip buttons
            container.insertAdjacentHTML('beforeend', '<button class="step" id="reverse" title="Reverse"><img src="img/reverse.png"></button>'); 
            container.insertAdjacentHTML('beforeend', '<button class="step" id="forward" title="Forward"><img src="img/forward.png"></button>'); 

            //disable any mouse event listeners for the container
            L.DomEvent.disableClickPropagation(container);

            return container;
        }
    });
    
    map.addControl(new Slider());

    //set slider attributes
    document.querySelector(".range-slider").max = 49;
    document.querySelector(".range-slider").min = 0;
    document.querySelector(".range-slider").value = 0;
    document.querySelector(".range-slider").step = 1;
   
    var steps = document.querySelectorAll('.step');
    
    //click listener for buttons
    steps.forEach(function(step){
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
    document.querySelector('.range-slider').addEventListener('input', function(){
        //get the new index value
        var index = this.value;

        //pass new attribute to update symbols
        updatePropSymbols(attributes[index]);
    })
};

//create legend based on attributes shown for that year
function createLegend(attributes) {
  var LegendControl = L.Control.extend({
    options: {
      position: "topright",
    },

    onAdd: function () {
      // create the control container with a particular class name
      var container = L.DomUtil.create("div", "legend-control-container");

      container.innerHTML = '<p class="temporalLegend"><h2>Enrollment in <span class="year">1973</span></h2></p>';

      //start attribute legend svg string
      var svg = '<svg id="attribute-legend" width="400px" height="400px">';

      //array of circle names to base loop on
      var circles = ["max", "mean", "min"];

      //Step 2: loop to add each circle and text to svg string
      for (var i = 0; i < circles.length; i++) {
        //calculate r and cy
        var radius = calcPropRadius(dataStats[circles[i]]);
        console.log(radius);
        var cy = 220 - radius;
        console.log(cy);

        //circle string
        svg +=
          '<circle class="legend-circle" id="' +
          circles[i] +
          '" r="' +
          radius +
          '"cy="' +
          cy +
          '" fill="#990033" fill-opacity="0.8" stroke="#000000" cx="200"/>';

        //evenly space out labels
        var textY = i * 40 + 40;

        //text string
        svg +=
          '<text id="' +
          circles[i] +
          '-text" x="200" y="' +
          textY +
          '">' +
          Math.round(dataStats[circles[i]] * 100) / 100
          +
            "</text>";
      }

      //close svg string
      svg += "</svg>";
        
        //add attribute legend svg to container
      container.insertAdjacentHTML('beforeend',svg);

      return container;
    },
  });

  map.addControl(new LegendControl());
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

//function to filter campuses...https://leafletjs.com/reference.html#geojson-filter
//function filter (attributes){
    
//}

//function to hide Madison
//var HideMadisonControl = L.Control.extend({
    //options: {
       // position: 'topright'
   // },
    
    //onAdd: function(map) {
       // var container = L.DomUtil.create('div', 'hide-madison');
       //container.append('<input type="checkbox" id="hide-madison-check" name="hide-madison-check" value="hideMadison">');
      //container.append('<label for="hide-madison-check">Hide Madison</label>');
        
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
        //call function to calculate statistics
        calcStats(json);
        //call function to create proportional symbols
        createPropSymbols(json, attributes);
        //call function to create sequence controls
        createSequenceControls(attributes);
        //call function to create legend
        createLegend(attributes);
    })
 };

document.addEventListener('DOMContentLoaded',createMap)