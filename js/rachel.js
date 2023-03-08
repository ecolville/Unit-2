// Rachael Urbano GEOG 575                  //Leaflet Map Showing Oil Activity post 1980 
//declare map variable globally so all functions have access; which apparently the min value and control layers this needs to be done as well
var map;
var minValue;
var controlLayers = L.control.layers();
//declare an array to hold statistics for each year; dpes this need to be up here?
var fiveyearStats_array = [];
//pretty black basemap with green overtones of landcover
var Stadia_AlidadeSmoothDark = L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png', {
	maxZoom: 20,
	attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
});
// if I want to add OSM
// var basicOSM = L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
//     attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
// });
    var basemaps = {
        "Stadia Basemap": Stadia_AlidadeSmoothDark,
        // "Basic OpenStreetMaps": basicOSM
    };
//function to instantiate the Leaflet map; Create the Leaflet map
function createMap(){
    //create the map
    map = L.map('map', {
        center: [37, -100],
        zoom: 5
    });
    Stadia_AlidadeSmoothDark.addTo(map);
//function to attach popups to each mapped feature; call getData function
    getData();
};
//array that is very important to like everything and needs to be piped in lots of places so don't forget >>>>>>>   NumWells_    <<<<<<<<<<<
function calcStats(data){
    //create empty array to store all data values
    var allValues = [];
    //loop through each city
    for(var STate of data.features){
        //loop through each year
        for(var year = 1980; year <= 2015; year+=5){
              //get NumWells_ for current year8
              var value = STate.properties["NumWells_"+ String(year)];
              //add value to array
              allValues.push(value);
        }
    }
    // get min, max stats for our array
    dataStats.min = Math.min(...allValues);
    dataStats.max = Math.max(...allValues);
    // calculate mean value
    var sum = allValues.reduce((a, b) =>  a + b);
    
    dataStats.mean = Math.round(sum / allValues.length * 10) / 10;

    //filters out my values that are causing issues
    var greaterThan1_allValues = allValues.filter(function(value){
        return value > 1;
    });
    //tested the greaterThan1_allValues; please don't ding me for leaving these notes as they help me remember why I have the order of stuff
    // console.log(greaterThan1_allValues)

    // //get minimum value of our array; god I have to build out the attribute stuff off this I believe
    var minValue = Math.min(...greaterThan1_allValues)
    return minValue;
} //;   //no semicolon needed? didn't have

// function to calculate statistics for eah year of data
function calcYearlyStats(data) {
    //empty array for yearly values
    var fiveyearValues_array = [];

    // this for/for loop is inverted from calcStats() so it only runs for the 7 columns
    for (var year = 1980; year <= 2015; year += 5) {
        for (var STate of data.features) {
            var value = Number(STate.properties["NumWells_"+ String(year)]);
            fiveyearValues_array.push(value);
        }
        //calculates the statistics
        var fiveyearMin = Math.min(...fiveyearValues_array);
        var fiveyearMax = Math.max(...fiveyearValues_array);
        var fiveyearMean = fiveyearValues_array.reduce((a, b) => a + b) / fiveyearValues_array.length;
        //emtpy temp object that will get populated and appended to the fiveyearValues[]
        var fiveYearStats = {};
        // creates the object with statistics
        //this is probably reduntant, could be combined with steps above
        fiveYearStats.year = year;
        fiveYearStats.min = fiveyearMin;
        fiveYearStats.max = fiveyearMax;
        fiveYearStats.mean = Math.round(fiveyearMean * 10) / 10;

        //adds the one-year object to the yearlyStats[] array
        fiveyearStats_array.push(fiveYearStats);
        
        //empties out the array to start the loop over fresh
        fiveyearValues_array = [];
    }
    // prints the yearlyStats[] to the console
    // for (var i = 0; i < yearlyStats.length;  i++) {
    //     console.log(yearlyStats[i]);
    // }

};
//calculate the radius of each proportional symbol
function calcPropRadius(attValue) {
    //constant factor adjusts symbol sizes evenly
    var minRadius = .40;
    //Flannery Apperance Compensation formula :| meh
    var radius = 1.0083 * Math.pow(attValue/minValue,0.5715) * minRadius
    return radius;
};
//once grab data apply these functions
function onEachFeature(feature, layer) {
    //no property named popupContent; instead, create html string with all properties
    var popupContent = "";
    //if it has properties otherwise not considered
    if (feature.properties) {
        //loop to add feature property names and values to html string
        for (var property in feature.properties){
                                                        //value of property
            popupContent += "<p>" + property + ": " + feature.properties[property] + "</p>";
        //if/then properties can be applied to grab certain fields
        }
        layer.bindPopup(popupContent);
        }
};
//PopupContent Constructor
function PopupContent(properties, attribute){
    this.properties = properties;
    this.attribute = attribute;
    this.year = attribute.split("_")[1];
    //this is my array value right? I think this is where it's having issues. 
    this.NumWells_ = this.properties[attribute];
    this.formatted = "<p><b>State:</b> " + this.properties.STate + "</p><p><b>Number of Oil Wells " + this.year + ":</b> " + this.NumWells_ + "</p>";
};
//POINT TO LAYER
function pointToLayer(feature, latlng, attributes){
    //Step 4. Determine the attribute for scaling the proportional symbols
    var attribute = attributes[0];
    //create marker oilWellOptions
    var oilWellOptions = {
        fillColor: "yellow",
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.6
    };
    //For each feature, determine its value for the selected attribute
    var attValue = Number(feature.properties[attribute]);
    //Give each feature's circle marker a radius based on its attribute value
    oilWellOptions.radius = calcPropRadius(attValue);
    //create circle marker layer
    var layer = L.circleMarker(latlng, oilWellOptions);
    //build popup content string
    var popupContent = new PopupContent(feature.properties, attribute);
    //bind the popup to the circle marker
    layer.bindPopup(popupContent.formatted, {
        offset: new L.Point(0, -oilWellOptions.radius)
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
//Create new sequence controls
function createSequenceControls(attributes){
    var SequenceControl = L.Control.extend({
        // need to be oilWellOptions? wth is this options for?
        options: {
            position: 'bottomleft'
        },
        onAdd: function () {
            // create the control container div with a particular class name
            var container = L.DomUtil.create('div', 'sequence-control-container');
            //create range input element (slider)
            container.insertAdjacentHTML('beforeend', '<input class="range-slider" type="range"></input>')
            //add step buttons
            container.insertAdjacentHTML('beforeend', '<button class="step" id="reverse" title="Reverse"><img src="img/reverse.png"></button>'); 
            container.insertAdjacentHTML('beforeend', '<button class="step" id="forward" title="Forward"><img src="img/forward.png"></button>');
            //disable any mouse event listeners for the container
            L.DomEvent.disableClickPropagation(container);
            return container;  
        }
    });
    map.addControl(new SequenceControl());    // add listeners after adding control}
    //set slider attributes
    document.querySelector(".range-slider").max = 7;
    document.querySelector(".range-slider").min = 0;
    document.querySelector(".range-slider").value = 0;
    document.querySelector(".range-slider").step = 1;
    //click listener for buttons
    document.querySelectorAll('.step').forEach(function(step){
        step.addEventListener("click", function(){
            var index = document.querySelector('.range-slider').value;
            //increment or decrement depending on button clicked
            if (step.id == 'forward'){
                index++;
                //if past the last attribute, wrap around to first attribute
                index = index > 7 ? 0 : index;
            } else if (step.id == 'reverse'){
                index--;
                //if past the first attribute, wrap around to last attribute
                index = index < 0 ? 7 : index;
            };
            //update slider
            document.querySelector('.range-slider').value = index;
            updatePropSymbols(attributes[index]);
        })
    }) //need semicolon?
    //input listener for slider
    document.querySelector('.range-slider').addEventListener('input', function(){            
        //Step 6: get the new index value
        var index = this.value;
        updatePropSymbols(attributes[index]);
    });

};
//Resize proportional symbols according to new attribute values
function updatePropSymbols(attribute){
    map.eachLayer(function(layer){
        if (layer.feature && layer.feature.properties[attribute]){
            //update the layer style and popup
            var props = layer.feature.properties;
            //update each feature's radius based on new attribute values
            var radius = calcPropRadius(props[attribute]);
            layer.setRadius(radius);
            //add city to popup content string
            var popupContent = new PopupContent(props, attribute);
            //update popup content            
            popup = layer.getPopup();            
            popup.setContent(popupContent.formatted).update();           
        };
    });
        // update the legend with the year displayed on the map
        var year = attribute.split("_")[1];
    
        // get the index for the currently dipslayed year from yearlyStats[]
        var fiveyearStatsIndex = findfiveYearStatsindex(year);
        // replace the year and stats in the legend with those for the currently displayed year    
        document.querySelector("span.year").innerHTML = year;
        document.querySelector("span.min").innerHTML = fiveyearStats_array[fiveyearStatsIndex].min;
        document.querySelector("span.mean").innerHTML = fiveyearStats_array[fiveyearStatsIndex].mean;
        document.querySelector("span.max").innerHTML = fiveyearStats_array[fiveyearStatsIndex].max;
};
//build an attributes array from the data known as processData
function processData(data){
    //empty array to hold attributes
    var attributes = [];
    //properties of the first feature in the dataset
    var properties = data.features[0].properties;
    //push each attribute name into attributes array
    for (var attribute in properties){
        //only take attributes with well values
        //did I get index name right
        if (attribute.indexOf("NumWells_") > -5){
            attributes.push(attribute);
        };
    };
    //check result; comment out for everything to work
    // console.log(attributes);
    return attributes;
};
//function to retrieve the data and place it on the map
function getData(map){
    //load the data
    fetch("data/active_OilWells_2.geojson")
        .then(function(response){
            return response.json();
        })
        .then(function(json){
            //create an attributes array
            var attributes = processData(json);
            calcStats(json);

            // calculate the yearly stats
            calcYearlyStats(json);
            //call function to create proportional symbols
            createPropSymbols(json, attributes);
            //call function to create the proportional symbols
            createSequenceControls(attributes);
            // call function to create the legend with text for the 1st year, 2016
            createLegend(attributes[0]);

            // minValue = calculateMinValue(json);
            // createPropSymbols(json, attributes);
            // createSequenceControls(attributes);
        })
};
//create legend
function createLegend(attributes){
    var LegendControl = L.Control.extend({
        options: {
            position: 'bottomright'
        },
        onAdd: function () {
            // create the control container with a particular class name
            var container = L.DomUtil.create('div', 'legend-control-container');
            //start with the first year
            var year = attributes.split("_")[1];
            // get the index of the currently year in the yearlyStats
            var fiveyearStatsIndex = findfiveYearStatsindex(year);
            //var year = attributes.split("_")[1];
            container.innerHTML = '<p class="temporal legend">Number of oil wells in <span class="year">' + year + '</span></p>'+ '<p>Min: <span class="min">'+ fiveyearStats_array[fiveyearStatsIndex].min + 
            '</span>% - Mean: <span class="mean">' + fiveyearStats_array[fiveyearStatsIndex].mean + '</span> % - Max: <span class="max">' + fiveyearStats_array[fiveyearStatsIndex].max + '</span>%</p>' + '<p>---</p><p>Ranges over time period:' ;

            //Step 1: start attribute legend svg string
            var svg = '<svg id="attribute-legend" width="130px" height="130px">';
             //array of circle names to base loop on
            var circles = ["max", "mean", "min"];

            // loop to add each circle and text to svg string
            for (var i=0; i<circles.length; i++) {
                 
// findYearlyStats = findfiveYearStats

// yearlyStats = fiveyearStats_array

// yearlyValues = fiveyearValues_array

// oneYearStats = fiveYearStats

// findYearlyStats = findfiveYearStatsindex

// yearStatsIndex = fiveyearStatsIndex


                 // assign the r and cy attributes
                 //var radius = calcPropRadius(dataStats[circles[i]]);
                 var radius = calcPropRadius(fiveyearStats_array[fiveyearStatsIndex][circles[i]]);
                 var cy = 50 - radius;
                 
                 //circle string
                 svg += '<circle class="legend-circle" id="' + circles[i] + '" r="' + radius + '"cy="' + cy + '" fill="#a65e44" fill-opacity="0.8" stroke="#fff" cx="30"/>';
 
                 // evenly space out labels
                 var textY = i * 15 + 20;
 
                 // text string; i didn't want the min/max/mean, just the numbers
                 svg += '<text id="' + circles[i] + '-text" x="65" y="' + textY + '">'  + fiveyearStats_array[fiveyearStatsIndex][circles[i]] + ' %' + '</text>';
             };
             
             //close svg string
             svg += "</svg>";
            //add attribute legend svg to container
            container.innerHTML += svg;
            return container;
        }
    });
    // controlLayers.addTo(map);
    map.addControl(new LegendControl());

};

function findfiveYearStatsindex(year4Stats) {

    var index = fiveyearStats_array.findIndex(year1 => year1.year == year4Stats);

    return index;
    
}


document.addEventListener('DOMContentLoaded',createMap)