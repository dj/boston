// Show the about / welcome modal
$('#about-modal').modal('show').addClass('fade');

var svg = $('#top-tracts'),
    svgContainer = $('#top-tracts-container'),
    width = svgContainer.width();

// Initialize the map
var theMap = L.map('map', { zoomControl: false, attributionControl: false }).setView([42.3201, -71.0789], 12.5);
new L.Control.Zoom({ position: 'topright' }).addTo(theMap);

// Initialize the tile layer and add it to the map.
L.tileLayer('http://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
  attribution: false,
  maxZoom: 16
}).addTo(theMap);

L.control.attribution({
  position: 'topleft',
  prefix: "<a href='http://leafletjs.com' title='A JS library for interactive maps'>Leaflet</a> Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ"
}).addTo(theMap);

// Set the svg container height so that it extends to the bottom of the sidebar
var svgContainerHeight = $(window).height() - $('#top-tracts-container').position().top - 10
svgContainer.css('height', svgContainerHeight+'px');

var labels = {
  punemployed: 'Unemployed',
  prentocc: 'Renter Occupied'
}

var middles = {
  prentocc: 0.661, // % renter occupied units in Boston 2010
  punemployed: 0.072, // % unemployment Boston Dec 2010
}

var formats = {
  prentocc: d3.format('.0%'),
  punemployed: d3.format('.0%')
}

var focusStyle = {
  weight: 0.5,
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

// update current tract info
function focus(id, selected) {
  var value = tractsById.get(id)[selected]

  // Return if there is no value to show
  if (!value) {
    return;
  }

  $('#tract'+id+' .tract-bar')
    .addClass('focus')

  $('#tract'+id+' .tract-bar')
    .tooltip({ delay: 0, placement: 'right', trigger: 'manual'})
    .tooltip('hide')

  $('#tract'+id+' .tract-bar')
    .attr('data-original-title', value)
    .tooltip('fixTitle')
    .tooltip({ delay: 0, placement: 'right', trigger: 'manual'})
    .tooltip('toggle')

  $('#current-tract-panel').show()
  $('#current-tract-value').text(formats[selected](value)+' '+labels[selected])
  $('#current-tract-id').text('Census Tract ' + id)
}

function focusOut(id, selected) {
  $('#current-tract-panel').hide()
  $('#tract'+id+' .tract-bar').removeClass('focus')

  $('#tract'+id+' .tract-bar')
    .tooltip({ delay: 0, placement: 'bottom', trigger: 'manual'})
    .tooltip('toggle')
}

function censusLoaded(err, rows) {
  // Populate the data type dropdown
  var optionsList = _.without(Object.keys(rows[0]), 'tract'),
      select = d3.select('#data-type')

      select
        .selectAll('option')
        .data(optionsList).enter()
        .append('option')
        .attr('value', function(d) {return d})
        .text(function(d) {return labels[d]});

  // Refresh select options
  $('select[name=selValue]').val('prentocc');
  $('.selectpicker').selectpicker('refresh');

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

  $('#data-type').on('change', function() {
    var selected = $(this).find('option:selected').val();

    var sorted = parseRows(rows, selected);

    var color = d3.scale.linear()
      .domain( [d3.min(sorted, function(d) { return d.value }), middles[selected], d3.max(sorted, function (d) { return d.value } )] )
      .range(['#b2182b', '#efefef', '#2166ac'])

    drawSidebar(sorted, selected, color);
    drawMap(sorted, selected, color);
  })

  // Initial View
  var initSelected = 'prentocc',
      sorted = parseRows(rows, initSelected),
      color = d3.scale.linear()
                .domain([
                  d3.min(sorted, function(d) { return d.value }),
                  middles[initSelected],
                  d3.max(sorted, function (d) { return d.value })
                ])
                .range(['#b2182b', '#efefef', '#2166ac'])



  drawSidebar(sorted, initSelected, color);
  drawMap(sorted, initSelected, color);
}

function drawSidebar(rows, selected, color) {
  var barHeight = 20;
  // Scales
  var x = d3.scale.linear()
    .domain( [0, d3.max(rows, function (d) { return d.value } )] )
    .range([0, 100]);


    // .range(['#b2182b', '#ef8a62', '#fddbc7', '#d1e5f0', '#67a9cf', '#2166ac'])

  // Select the SVG and adjust height to fit data
  var chart = d3.select('#top-tracts')
    .attr('height', rows.length * barHeight)

  // Change the map heading
  var mapHeading = d3.select('#map-heading')
    .html(labels[selected])

  var tracts = chart.selectAll('.tract')
    .data(rows, function(d) {
      return d.tract
    })
    .sort(function(a, b) { return d3.descending(a.value, b.value) })

  var tractEnter = tracts
        .enter()
          .append('div')
          .attr('class', 'tract')
          .attr('id', function(d) { return 'tract'+d.tract }),
      tractUpdate = tracts,
      tractExit = tracts.exit();

  tractUpdate
    .selectAll('.tract-value')
      .data(rows, function (d) { return d.tract })

  tractUpdate
    .on('mouseenter', function(d) {
      focus(d.tract, selected);
    })
    .on('mouseleave', function(d) {
      focusOut(d.tract, selected);
    })

  tractEnter
    .append('div')
      .attr('class', 'progress-bar tract-bar')
      .attr('data-placement', 'right')
      .attr('role', 'progressbar')
      .attr('title', function(d) { return d.value })
      .attr('alt', function(d) { return d.value })
      .on('mouseenter', function(d) {

        theMap.eachLayer(function(layer){
          if (d.tract == layer._tract) {
            layer.setStyle(focusStyle);
          }
        })

      })
      .on('mouseleave', function(d) {

        theMap.eachLayer(function(layer){
          if (d.tract == layer._tract) {
            layer.setStyle(focusOffStyle);
          }
        })

      })

  tractUpdate
    .selectAll('.progress-bar')
      .data(rows, function(d) { return d.tract })
      .style('width', function(d) {
          return x(d.value) + '%';
      })
      .style('background-color', function(d) {
        return color(d.value);
      })

  var legend = d3.select('#color-key')

  var keyData = _.map(color.range(), function(hex, i) {
    return {
      key: i,
      hex: hex,
      // tick: Math.round(color.invertExtent(hex)[0])
    }
  })

  var keys = legend.selectAll('.key')
    .data(keyData, function(d) { return d.key })

  keys.enter().append('li')
    .attr('class', 'key')

  keys
    .style('border-top-color', function(d) { return d.hex })
    .text(function(d) {
      return d.tick
    });

  keys.exit().remove();
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
        fillColor: 'grey',
        fillColor: fill(+feature.id),
        weight: 0,
        fillOpacity: 1
      };
    },

    onEachFeature: function(feature, layer) {
      var tractBar = $('#tract'+feature.id);

      // We have more features than we have data,
      // so don't attach events for features without
      // a matching tract bar.
      if (!tractBar[0]) {
        return;
      }

      layer._tract = feature.id

      // Event handlers for the layer
      function mouseover(e) {
        var tract = e.target;

        // highlight tract on map
        tract.setStyle(focusStyle);

        var tractId = '#tract' + feature.id

        focus(feature.id, selected);

        if (!L.Browser.ie && !L.Browser.opera) {
          tract.bringToFront();
        }
      }

      function mouseout(e) {
        var tractBar = $('#'+feature.id);

        focusOut(feature.id, selected);
        baseLayer.resetStyle(e.target);
      }

      // Attach the event handlers to each tract
      layer.on({
        mouseover: mouseover,
        mouseout: mouseout,
      });
    },
  })

  // Load TopoJSON and add to map
  omnivore.topojson('data/tracts2010.json', {}, baseLayer).addTo(theMap)
}

