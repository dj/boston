var labels = {
  punemployed: 'Unemployement',
  homeownership: 'Homeownership',
  // prentocc: 'Renter-occupied',
  medincome: 'Median Income',
  ownmedval: 'Median Value',
}

var middles = {
  // prentocc: { val: 0.661, label: '% renter occupied units in the City of Boston.' },
  homeownership: { val: 0.341, label: 'Homeownership rate, 2009-2013' },
  punemployed: { val: 0.072, label: 'unemployment rate in the City of Boston, December 2010'},
  medincome: { val: 53601, label: 'Median household income, 2009-2013' },
  ownmedval: { val: 371000, label: 'Median value of owner-occupied housing units, 2009-2013' },
}

var formats = {
  // prentocc: d3.format('.0%'),
  homeownership: d3.format('.0%'), // percentage
  punemployed: d3.format('.0%'), // percentage
  medincome: function(d) { return '$' + d3.format(',.')(d) }, // currency
  ownmedval: function(d) { return '$' + d3.format(',.')(d) }, // currency
}

var descriptions = {
  // prentocc: 'Percent of households that are renter-occupied by census tract. Red tracts are greater than the average of 66.1%, red tracts are less than the average.',
  homeownership: "The <b>homeownership rate</b> in Boston between 2009 and 2013 was <b>34.1%</b>. <span id='color-0'>Red</span> tracts have higher homeownership rates. <span id='color-1'>Blue</span> tracts have lower homeownership rates.",
  punemployed: "The <b>unemployment rate</b> in Boston, Dec 2010 was <b>7.2%</b>. <span id='color-0'>Red</span> tracts have higher unemployment. <span id='color-1'>Green</span> tracts have lower unemployment.",
  medincome: "The <b>median household income</b> in Boston between 2009 and 2013 was <b>$53,601</b>. <span id='color-0'>Green</span> tracts have higher median household incomes. <span id='color-1'>Purple</span> tracts have lower median household incomes.",
  ownmedval: "The <b>median value of owner-occupied housing units</b> in Boston between 2009 and 2013 was <b>$371,000</b>. <span id='color-0'>Green</span> tracts have higher median values, <span id='color-1'>Purple</span> tracts have lower median values.",
}

var colorRanges = {
  // prentocc: [
  //   '#d7191c',
  //   '#ffffbf',
  //   '#2c7bb6',
  // ],
  punemployed: [
    '#1a9641',
    '#ffffbf',
    '#d7191c',
  ],
  homeownership: [
    '#2c7bb6',
    '#ffffbf',
    '#d7191c',
  ],
  medincome: [
    '#7b3294',
    '#ffffbf',
    '#008837',
  ],
  ownmedval: [
    '#7b3294',
    '#ffffbf',
    '#008837',
  ]
}

// Show the about modal
$('#about-modal').modal('show').addClass('fade');

// Initialize the map
var theMap = L.map('map', { zoomControl: false, attributionControl: false }).setView([42.3201, -71.0789], 12);
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
d3.csv('data/boston-census-2010.csv', parse, censusLoaded);

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
  var parsedRow = {
    // prentocc: +row['prentocc'],
    tract: +row['CT_ID_10'],
    punemployed: +row['punemploy'],
    homeownership: +row['homeownership'],
    medincome: +row['medincome'],
    ownmedval: +row['ownmedval'],
  }

  tractsById.set(row['CT_ID_10'], parsedRow);

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
      if (option == 'punemployed') {
        d3.select(this).property('selected')
      }
    })
    .text(function(d) {return labels[d]});

  // Refresh select options
  $select.selectpicker('refresh');

  // Draw a new map and key. Kicks off everything.
  function changeData(e) {
    var selected = $(this).find('option:selected').val(),
        sorted = parseRows(rows, selected),
        min = d3.min(sorted, function(d) { return d.value }),
        mid = middles[selected].val,
        max = d3.max(sorted, function (d) { return d.value }),
        width = 240;

    // Update Info Panel
    $('.navbar-brand').html(labels[selected]);
    $('#info-desc').html(descriptions[selected]);
    $('#color-0').css('color', colorRanges[selected][2]);
    $('#color-1').css('color', colorRanges[selected][0]);

    // Axes
    var color = d3.scale.linear()
      .domain([min, mid, max])
      .range(colorRanges[selected]);
    var x = d3.scale.linear()
      .domain([min, max])
      .range([0, width])

    drawKey(selected, min, mid, max, color, x);
    drawMap(selected, color, x);
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
function drawMap(selected, color, x) {
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
        fillOpacity: .65
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

        // Update the key
        d3.select('#selected-tract-value-line')
          .attr('x1', x(value))
          .attr('y1', 0)
          .attr('x2', x(value))
          .attr('y2', 15)
      }

      function showValOnKey(val) {
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

      // Keep track of the last tract that was clicked
      // so we can reset the style
      var lastTract;

      function click(e) {
        // Focus on current tract
        e.target.setStyle({ weight: 3, color: 'black'})

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
        // click: click,
      });
    },
  })

  // Load TopoJSON and add to map
  omnivore.topojson('data/tracts2010topo.json', {}, baseLayer).addTo(theMap)
}

