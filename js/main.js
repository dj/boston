// Show the about / welcome modal
$('#about-modal').modal('show').addClass('fade');

var svg = $('#top-tracts'),
    svgContainer = $('#top-tracts-container'),
    width = svgContainer.width();

// Initialize the map
var theMap = L.map('map', { zoomControl: false, attributionControl: false }).setView([42.3201, -71.0789], 13);
new L.Control.Zoom({ position: 'bottomright' }).addTo(theMap);

// Initialize the tile layer and add it to the map.
var tiles = L.tileLayer('http://{s}.tile.stamen.com/toner-lines/{z}/{x}/{y}.{ext}', {
	attribution: "Map tiles by <a href='http://stamen.com'>Stamen Design</a>, <a href='http://creativecommons.org/licenses/by/3.0'>CC BY 3.0</a> &mdash; Map data &copy; <a href='http://www.openstreetmap.org/copyright'>OpenStreetMap</a>",
	subdomains: 'abcd',
	minZoom: 0,
	maxZoom: 20,
	ext: 'png'
}).addTo(theMap);

L.control.attribution({
  position: 'bottomleft',
  prefix: "<a href='http://leafletjs.com' title='A JS library for interactive maps'>Leaflet</a>"
}).addTo(theMap);

var labels = {
  punemployed: 'Unemployed',
  prentocc: 'renter-occupied'
}

var middles = {
  prentocc: { val: 0.661, label: '% renter occupied units in the City of Boston.' },
  punemployed: { val: 0.072, label: 'unemployment rate in the City of Boston, December 2010'}
}

var formats = {
  prentocc: d3.format('.0%'),
  punemployed: d3.format('.0%')
}

var titles = {
  prentocc: '% Renter-Occupied Households',
  punemployed: '% Unemployment',
}

var descriptions = {
  prentocc: 'Percent of households that are renter-occupied by census tract. Red tracts are greater than the average of 66.1%, red tracts are less than the average.',
  punemployed: 'Unemployment rate by census tract. Blue tracts have rates higher than 7.2%, the rate for the City of Boston in December 2010. Red tracts are less than 7.2%.',
}

var focusStyle = {
  weight: 3,
  color: 'black'
}

var focusOffStyle = {
  weight: 0
}

// Load the data
d3.json('data/boston-neighborhoods.json', neighborhoodsLoaded);
d3.csv('data/boston-census-2010.csv', parse, censusLoaded);

// Draw neighborhoods
function neighborhoodsLoaded(err, data) {
  var style = {
    color: 'none',
    fillColor: 'none',
  }

  function onEachFeature(feature, layer) {
    var center = layer.getBounds().getCenter();

    L.marker([center.lat, center.lng], {
        icon: L.divIcon({
            className: 'text-labels',
            html: feature.properties.Name
        }),
        zIndexOffset: 1000
    }).addTo(theMap);
  }

  L.geoJson(data, {
    style: style,
    onEachFeature: onEachFeature,
  }).addTo(theMap);
}

// Keep a map of tracts that will be used
// to look up values for the leaflet census overlay
var tractsById = d3.map()

// Parse the rows of the CSV, coerce strings to nums
function parse(row) {
  // Parse rows that we care about, coercing strings to nums
  var parsedRow = {
    tract: +row['CT_ID_10'],
    punemployed: +row['punemploy'],
    prentocc: +row['prentocc']
  }

  tractsById.set(row['CT_ID_10'], parsedRow);

  return parsedRow;
}

// update selected tract panel
function focus(id, selected, e) {
  var value = tractsById.get(id)[selected]
  $panel = $('#selected-tract'),
  $panelId = $('#selected-tract-id'),
  $panelValue = $('#selected-tract-value');

  // Unhide the panel
  $panel.show()

  $panel.css({
    position: 'absolute',
    left: e.containerPoint.x - 100,
    top: e.containerPoint.y + 100
  })

  // $panelId.text('Tract ' + id);
  $panelValue.text(formats[selected](value) +' '+ labels[selected])
}

function focusOut(id, selected) {
  $('#selected-tract-panel').hide()
}

function censusLoaded(err, rows) {
  // Populate the data dropdown
  var optionsList = _.without(Object.keys(rows[0]), 'tract'),
      select = d3.select('#info-opts'),
      $select = $('#info-opts');

  select
    .selectAll('option')
    .data(optionsList).enter()
    .append('option')
    .attr('value', function(d) {return d})
    .text(function(d) {return labels[d]});

  // Refresh select options
  $select.selectpicker('refresh');

  function changeData(e) {
    var selected = $(this).find('option:selected').val(),
        sorted = parseRows(rows, selected),
        min = d3.min(sorted, function(d) { return d.value }),
        mid = middles[selected].val,
        max = d3.max(sorted, function (d) { return d.value });

    // Update Info Panel
    // =================
    $('.navbar-brand').text(titles[selected]);
    $('#info-desc').text(descriptions[selected]);

    // Axis
    var color = d3.scale.linear()
      .domain([min, mid, max])
      .range(['#b2182b', '#f7f7f7', '#2166ac'])

    drawKey(selected, min, mid, max, color);
    drawMap(sorted, selected, color);
  }

  // Change map type
  $select.on('change', changeData)
}

function drawKey(selected, min, mid, max, color) {
  var width = 150,
      height = 15;

  var x = d3.scale.linear()
    .domain([min, max])
    .range([0, width])

  var percent = d3.format('.0%')

  // Select the SVG for the key
  var key = d3.select('#selected-tract-key')
    .attr('width', width)
    .attr('height', width)

  // Append the linearGradient to the svg defs
  var defs = d3.select('#selected-tract-key-defs')
    .datum({ min: min, mid: mid, max: max })

  d3.select('#gradient1-stop1')
    .datum({ min: min })
    .attr('stop-color', function(d) { return color(d.min) })

  d3.select('#gradient1-stop2')
    .datum({ mid: mid })
    .attr('stop-color', function(d) { return color(d.mid) })

  d3.select('#gradient2-stop1')
    .datum({ mid: mid })
    .attr('stop-color', function(d) { return color(d.mid) })

  d3.select('#gradient2-stop2')
    .datum({ max: max })
    .attr('stop-color', function(d) { return color(d.max) })

  key.select('#gradient1-bar')
    .datum({mid: mid})
    .attr('width', function(d) { return x(d.mid) })
    .attr('height', height)

  key.select('#gradient2-bar')
    .datum({mid: mid})
    .attr('transform', function(d) { return 'translate('+x(mid)+',0)' })
    .attr('width', function(d) { return (width - x(mid)) })
    .attr('height', height)

  var axis = d3.svg.axis()
    .scale(x)
    .tickFormat(formats[selected])
    .ticks(1)

  key.append('g').attr('class', 'axis')
    .attr('transform', 'translate(0,'+(height+5)+')')
    .call(axis)
}

function parseRows(rows, selected) {
  return _(rows)
    .map(function(row) {
      return {
        tract: row.tract,
        value: row[selected],
      }
    })
    .sortBy('value')
    .reverse()
    .value();
}

/*============================================================================*/
/* LEAFLET MAP                                                                */
/*============================================================================*/
function drawMap(rows, selected, color) {
  // Plot Census Tracts
  // ==================
  // + Create a base layer and attach event handlers
  // + Load the census tract TopoJSON with the base layer

  var baseLayer = L.geoJson(null, {
    style: function(feature) {
      function fill(id) {
        var tract = tractsById.get(id);

        if (tract && tract[selected]) {
          return color(tract[selected]);
        } else {
          return 'grey';
        }
      }

      return {
        fillColor: fill(feature.properties.GEOID10),
        weight: 0,
        fillOpacity: .9
      };
    },

    onEachFeature: function(feature, layer) {
      layer._tract = feature.properties.GEOID10

      // Event handlers for the layer
      function mouseover(e) {
        var tract = e.target;

        // highlight tract on map
        tract.setStyle(focusStyle);

        var tractId = '#tract' + feature.properties.GEOID10

        focus(feature.properties.GEOID10, selected, e);

        if (!L.Browser.ie && !L.Browser.opera) {
          tract.bringToFront();
        }
      }

      function mouseout(e) {
        var tractBar = $('#'+feature.properties.GEOID10);

        focusOut(feature.properties.GEOID10, selected);

        baseLayer.resetStyle(e.target);
      }

      // Keep track of the last tract that was clicked
      // so we can reset the style
      var lastTract;

      function click(e) {
        // Focus on current tract
        e.tract.setStyle(focusStyle)

        // Remove focus on last tract
        if (lastTract) {
          baseLayer.resetStyle(lastTract)
          lastTract = e.tract;
        } else {
          lastTract = e.tract;
        }
      }

      // Attach the event handlers to each tract
      layer.on({
        mouseover: mouseover,
        mouseout: mouseout,
        click: click,
      });
    },
  })

  // Load TopoJSON and add to map
  omnivore.topojson('data/tracts2010topo.json', {}, baseLayer).addTo(theMap)
}

