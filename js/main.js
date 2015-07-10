var labels = {
  punemployed: 'Unemployment Map',
  homeownership: 'Homeownership Map',
  // prentocc: 'Renter-occupied',
  // ownmedval: 'Median Value',
  medhhinc: 'Household Income Map',
  medgrossrent: 'Rent Burden Map',
  meancommute: 'Travel Time To Work',
  walked: 'Walked to Work',
  ptransport: 'Took Public Transport to Work',
  poverty: 'Families in Poverty',
}

var middles = {
  medhhinc: 53601,
  medgrossrent: 30,
  punemployed: 7.3,
  meancommute: 28.8,
  homeownership: 34.1,
  walked: 14.8,
  ptransport: 33.5,
  poverty: 17.6,
}

var percent = function(d) { return d + '%' };

var formats = {
  punemployed: percent,
  medhhinc: function(d) { return '$' + d3.format(',.')(d) },
  medgrossrent: percent,
  meancommute: function(d) { return d },
  homeownership: percent,
  walked: percent,
  ptransport: percent,
  poverty: percent,
}

var descriptions = {
  punemployed: "The <a href='http://factfinder.census.gov/faces/affhelp/jsf/pages/metadata.xhtml?lang=en&type=table&id=table.en.ACS_10_5YR_DP03#main_content'>unemployment rate</a> in Boston, Dec 2010 was <b>7.2%</b> (<a href='http://www.bls.gov/lau/lacilg10.htm'>2010</a>). <span id='color-1'>Blue</span> tracts have lower unemployment. <span id='color-0'>Red</span> tracts have higher unemployment.",
  medhhinc: "The <a href='http://quickfacts.census.gov/qfd/meta/long_INC110213.htm'>median household income</a> in Boston between was <b>$53,601</b> (<a href='http://quickfacts.census.gov/qfd/states/25/2507000.html'>2009-2013</a>). <span id='color-1'>Purple</span> tracts have lower median household incomes. <span id='color-0'>Green</span> tracts have higher median household incomes.",
  medgrossrent: "This map shows census tracts colored by <a href='http://factfinder.census.gov/faces/affhelp/jsf/pages/metadata.xhtml?lang=en&type=table&id=table.en.ACS_10_5YR_B25071#main_content'>median gross rent as a percentage of household income (GRAPI)</a>. Households that spend more than 30% of their income on rent are <b>rent-burdened</b>. <span id='color-1'>Blue</span> tracts have a median GRAPI lower than 30%. <span id='color-0'>Red</span> tracts have a  median GRAPI higher than 30%.",
  meancommute: "The average <a href='http://quickfacts.census.gov/qfd/meta/long_LFE305213.htm'>travel time to work</a></b> in minutes in the City of Boston of was <b>28.8 minutes</b> (<a href='http://quickfacts.census.gov/qfd/states/25/2507000.html'>2009-2013</a>). <span id='color-1'>Green</span> census tracts have lower travel times. <span id='color-0'>Purple</span> census tracts have higher travel times.",
  homeownership: "The <a href='http://quickfacts.census.gov/qfd/meta/long_HSG445213.htm'>homeownership rate</a> in the City of Boston was <b>34.1%</b> (<a href='http://quickfacts.census.gov/qfd/states/25/2507000.html'>2009-2013</a>). <span id='color-1'>Blue</span> census tracts have lower homeownership rates. <span id='color-0'>Red</span> tracts have higher rates.",
  walked: 'In the City of Boston (2013) 14.8% of workers over 16 walked to work.',
  ptransport: 'In the City of Boston (2013) 33.5% of workers over 16 took public transport (excluding taxicab) to work.',
  poverty: 'In the City of Boston (2013) 17.6% of families had income in the past 12 months below the poverty level.',
}

var colorRanges = {
  punemployed: [
    '#2c7bb6',
    '#ffffbf',
    '#d7191c',
  ],
  homeownership: [
    '#2c7bb6',
    '#ffffbf',
    '#d7191c',
  ],
  medgrossrent: [
    '#2c7bb6',
    '#ffffbf',
    '#d7191c',
  ],
  medhhinc: [
    '#7b3294',
    '#ffffbf',
    '#008837',
  ],
  meancommute: [
    '#008837',
    '#ffffbf',
    '#7b3294',
  ],
  walked: [
    '#7b3294',
    '#ffffbf',
    '#008837',
  ],
  ptransport: [
    '#7b3294',
    '#ffffbf',
    '#008837',
  ],
  poverty: [
    '#2c7bb6',
    '#ffffbf',
    '#d7191c',
  ]
}

function colorScale(selected, min, mid, max) {
  return d3.scale.linear()
    .domain([min, mid, max])
    .range(colorRanges[selected])
}

// Show the about modal
$('#about-modal').modal('show').addClass('fade');

// Initialize the map
var theMap = L.map('map', {
  zoomControl: false,
  attributionControl: false,
  minZoom: 12,
})

// Set the init view and add a zoom control
theMap.setView([42.3201, -71.0789], 12);
new L.Control.Zoom({ position: 'bottomright' }).addTo(theMap);

// Initialize the tile layer and add it to the map.
var tiles = L.tileLayer('http://{s}.tile.stamen.com/terrain-lines/{z}/{x}/{y}.{ext}', {
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

// Load the data
d3.json('data/boston-neighborhoods.json', neighborhoodsLoaded);
d3.csv('data/boston-data.csv', parse, censusLoaded);

// Draw neighborhoods
function neighborhoodsLoaded(err, data) {
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
    style: { color: 'none', fillColor: 'none', },
    onEachFeature: onEachFeature,
  }).addTo(theMap);
}

// Keep a map of tracts that will be used
// to look up values for the leaflet overlay
var tractsById = d3.map()

// Parse the rows of the CSV, coerce strings to nums
function parse(row) {
  function each(d) {
    if (d == '-0') {
      return null;
    } else if (d == '50.0+') {
      return 50;
    } else {
      return +d;
    }
  }

  console.log(row);

  var parsedRow = {
    // prentocc: +row['prentocc'],
    tract: +row['GEO.id2'],
    punemployed: +row['HC04_VC12'],
    medhhinc: each(row['HC01_VC85']),
    medgrossrent: each(row['HD01_VD01']),
    meancommute: each(row['HC01_VC36']),
    homeownership: +each(row['HD01_VD02']),
    walked: each(row['HC03_VC31']),
    ptransport: each(row['HC03_VC30']),
    poverty: each(row['HC04_VC12']),
  }

  tractsById.set(row['GEO.id2'], parsedRow);

  return parsedRow;
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
    .each(function(d) {
      var option = d3.select(this).attr('value')
      if (option == 'medhhinc') {
        d3.select(this).property('selected')
      }
    })
    .text(function(d) {return labels[d]});

  // Refresh select options
  $select.selectpicker('refresh');

  var currentLayer;

  // Draw a new map and key. Kicks off everything.
  function changeData(e) {
    var selected = $(this).find('option:selected').val(),
        sorted = parseRows(rows, selected),
        min = d3.min(sorted, function(d) { return d.value }),
        mid = middles[selected],
        max = d3.max(sorted, function (d) { return d.value }),
        width = 240;

    // Update Info Panel
    $('.navbar-brand').html(labels[selected]);
    $('#info-desc').html(descriptions[selected]);
    $('#color-0').css('color', colorRanges[selected][2]);
    $('#color-1').css('color', colorRanges[selected][0]);

    // Axes
    var color = colorScale(selected, min, mid, max)
    var x = d3.scale.linear()
      .domain([min, max])
      .range([0, width])

    drawKey(selected, min, mid, max, color, x);

    if (currentLayer) {
      theMap.removeLayer(currentLayer);
      currentLayer = drawMapLayer(selected, color, x);
    } else {
      currentLayer = drawMapLayer(selected, color, x);
    }
  }

  // Change map type an init the map
  $select.on('change', changeData)
  $select.change();
}

function drawKey(selected, min, mid, max, color, x) {
  var percent = d3.format('.0%'),
      height = 10

  // Select the SVG for the key
  var key = d3.select('#selected-tract-key')
    .datum({ min: min, mid: mid, max: max})
    .style('width', '100%')
    .attr('height', height)


  // Append the linearGradient to the svg defs
  var defs = d3.select('#selected-tract-key-defs')
    .datum({ min: min, mid: mid, max: max })

  // Update gradient partition colors
  d3.select('#gradient1-stop1')
    .datum({ min: min })
    .attr('stop-color', function(d) { return color(d.min) })

  // TODO: Abstract + Comment more
  // If we have the mid parameter, make a scale with 2 gradients,
  // one from min to mid and one from mid to max
  if (mid) {
    d3.select('#gradient1-stop2')
    .datum({ mid: mid })
    .attr('stop-color', function(d) { return color(d.mid) })

    d3.select('#gradient2-stop1')
      .datum({ mid: mid })
      .attr('stop-color', function(d) { return color(d.mid) })

    d3.select('#gradient2-stop2')
      .datum({ max: max })
      .attr('stop-color', function(d) { return color(d.max) })

    // Update gradient partition sizes
    key.select('#gradient1-bar')
      .datum({mid: mid})
      .attr('transform', 'translate(0, 5)')
      .attr('width', function(d) { return x(d.mid) })
      .attr('height', height)

    key.select('#gradient2-bar')
      .datum({mid: mid})
      .attr('transform', function(d) { return 'translate('+x(mid)+',5)' })
      .attr('width', function(d) { return x(max) - x(mid) })
      .attr('height', height)
  } else {
  // If we don't have the mid parameter, make a scale with just
  // 1 gradient from min to max
    d3.select('#gradient1-stop2')
      .datum({ max: max })
      .attr('stop-color', function(d) { return color(d.max) })

    key.select('#gradient1-bar')
      .datum({max: max})
      .attr('transform', 'translate(0, 5)')
      .attr('width', function(d) { return x(d.max) })
      .attr('height', height)

    // Hide gradient-2
    key.select('#gradient2-bar')
      .datum({})
      .attr('width', 0)
  }

    var axis = d3.svg.axis()
    .scale(x)
    .tickFormat(formats[selected])
    .tickValues([min, mid, max])

  key
    .append('g').attr('class', 'axis')

  key.selectAll('.axis')
    .attr('transform', 'translate(0,'+(height)+')')
    .call(axis)

  key
    .datum({mid: mid}) // Not used, just need to append line once
    .append('line')
      .attr('id', 'selected-tract-value-line')
      .attr('stroke', 'black')
      .attr('stroke-width', 2)
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
function drawMapLayer(selected, color, x) {
  // Plot Census Tracts
  // ==================
  // + Create a base layer and attach event handlers
  // + Load the census tract TopoJSON with the base layer

  // Keep track of the last tract that was clicked
  // so we can reset the style
  var lastTract;

  var baseLayer = L.geoJson(null, {
    style: function(feature) {
      function fill(id) {
        var tract = tractsById.get(id);

        if (tract && tract[selected]) {
          return color(tract[selected]);
        } else {
          return 'none';
        }
      }

      return {
        fillColor: fill(feature.properties.GEOID10),
        weight: 0,
        fillOpacity: .75
      };
    },

    onEachFeature: function(feature, layer) {
      function focus(e) {
        // Highlight tract on map
        e.target.setStyle({ weight: 3, color: 'black'})

        // Update selected tract panel
        $panel = $('#selected-tract'),
        $panelValue = $('#selected-tract-value');

        // Unhide the selected tract panel
        $panel.toggleClass('invisible')

        // Position the panel below the event
        $panel.css({
          position: 'absolute',
          left: e.containerPoint.x - 30,
          top: e.containerPoint.y + 100
        })

        // Update the selected tract panel with the tract value
        var value = tractsById.get(feature.properties.GEOID10)[selected];
        // $panelValue.text(formats[selected](value) +' '+ labels[selected])
        $panelValue.text(formats[selected](value))

        showValOnKey(value);
      }

      function showValOnKey(value) {
        // Update the key
        d3.select('#selected-tract-value-line')
          .attr('x1', x(value))
          .attr('y1', 0)
          .attr('x2', x(value))
          .attr('y2', 15)
      }

      // Event handlers for the layer
      function mouseover(e) {
        focus(e)

        if (!L.Browser.ie && !L.Browser.opera) {
          e.target.bringToFront();
        }
      }

      function mouseout(e) {
        focus(e)

        baseLayer.resetStyle(e.target);
      }

      function click(e) {
        var value = tractsById.get(feature.properties.GEOID10)[selected];
        showValOnKey(value);

        e.target.setStyle({ weight: 3, color: 'black'})

        if (lastTract === e.target) {
          return;
        } else if (lastTract) {
          baseLayer.resetStyle(lastTract)
          lastTract = e.target;
        } else {
          lastTract = e.target;
        }

        if (!L.Browser.ie && !L.Browser.opera) {
          e.target.bringToFront();
        }
      }

      // Attach the event handlers to each tract
      var value = tractsById.get(feature.properties.GEOID10)[selected]
      if (value) {
        layer.on({
          mouseover: mouseover,
          mouseout: mouseout,
          click: click,
        });
      }
    },
  })

  // Load TopoJSON and add to map
  return omnivore.topojson('data/tracts2010topo.json', {}, baseLayer).addTo(theMap)
}

