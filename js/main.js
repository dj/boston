var svg = $('#top-tracts'),
    svgContainer = $('#top-tracts-container'),
    width = svgContainer.width();

// Initialize the map
var theMap = L.map('map', { zoomControl: false, attributionControl: false }).setView([42.3201, -71.0589], 12);
new L.Control.Zoom({ position: 'topright' }).addTo(theMap);

// Initialize the tile layer and add it to the map.
L.tileLayer('http://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
  attribution: false,
  maxZoom: 16
}).addTo(theMap);

// Set the svg width to the width of it's container
svg.width(width);

L.control.attribution({
  position: 'topleft',
  prefix: "<a href='http://leafletjs.com' title='A JS library for interactive maps'>Leaflet</a> Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ"
}).addTo(theMap);

// Set the svg container height so that it extends to the bottom of the sidebar
var svgContainerHeight = $(window).height() - $('#top-tracts-container').position().top - 10
svgContainer.css('height', svgContainerHeight+'px');

var labels = {
  medianIncome: 'Median Income',
  totalPop: 'Total Population'
}

var focusStyle = {
  weight: 5,
  color: 'black'
}

var focusOffStyle = {
  weight: 0
}

// Load the data
d3.csv('data/boston-census-2010.csv', parse, loaded);

// Keep a map of tracts that will be used
// to look up values for the leaflet census overlay
var tractsById = d3.map()

// Parse the rows of the CSV, coerce strings to nums
function parse(row) {
  // Parse rows that we care about, coercing strings to nums
  var parsedRow = {
    tract: +row['CT_ID_10'],
    medianIncome: +row['medincome'],
    totalPop: +row['totalpop'],
  }

  tractsById.set(row['CT_ID_10'], parsedRow);

  return parsedRow;
}

// update current tract info
function focus(id, selected) {
  var value = tractsById.get(id)[selected]

  $('#current-tract-id').text("Census Tract " + id)
  $('#current-tract-value').text(labels[selected] +" "+value)

  d3.select('#tract'+id)
        .transition()
        .style('height', '50px')
      .select('.tract-value')
        .text(value)
}

function focusOut(id, selected) {
  d3.select('#tract'+id)
    .transition()
    .style('height', '5px')
  .select('.tract-value')
    .text('')
}

function loaded(err, rows) {
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

    drawSidebar(sorted, selected);
    drawMap(sorted, selected);
  })

  // Initial View
  var initStat = 'medianIncome',
      sorted = parseRows(rows, initStat);

  drawSidebar(sorted, initStat);
  drawMap(sorted, initStat);
}

function drawSidebar(rows, selected) {
  var barHeight = 20;
  // Scales
  var x = d3.scale.linear()
    .domain( [0, d3.max(rows, function (d) { return d.value } )] )
    .range([0, 100]);
  var color = d3.scale.quantize()
    .domain( [0, d3.max(rows, function (d) { return d.value } )] )
    .range([
      '#ca0020',
      '#f4a582',
      '#92c5de',
      '#0571b0'
    ])

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

  tractEnter
    .on('mouseover', function(d) {
      focus(d.tract, selected);
    })
    .on('mouseout', function(d) {
      focusOut(d.tract, selected);
    })

  tractEnter
    .append('div')
      .attr('class', 'progress-bar tract-bar')
      .attr('role', 'progressbar')
      .on('mouseover', function(d) {

        theMap.eachLayer(function(layer){
          if (d.tract == layer._tract) {
            layer.setStyle(focusStyle);
          }
        })

      })
      .on('mouseout', function(d) {

        theMap.eachLayer(function(layer){
          if (d.tract == layer._tract) {
            layer.setStyle(focusOffStyle);
          }
        })

      })
    .append('span')
      .attr('class', 'tract-value')

  tractUpdate
    .selectAll('.tract-bar')
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
      tick: Math.round(color.invertExtent(hex)[0])
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


function drawMap(rows, selected) {
  // Plot Census Tracts
  // ==================
  // + Create a base layer and attach event handlers
  // + Load the census tract TopoJSON with the base layer

  var color = d3.scale.quantize()
    .range([
      '#ca0020',
      '#f4a582',
      '#92c5de',
      '#0571b0'
    ])
    .domain( [0, d3.max(rows, function (d) { return d.value } )] )

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
        color: '#222',
        weight: 0.5,
        fillColor: fill(+feature.id),
        fillOpacity: 1.0
      };
    },

    onEachFeature: function(feature, layer) {
      var tractBar = $('#tract'+feature.id);

      layer._tract = feature.id

      // Event handlers for the layer
      function mouseover(e) {
        var tract = e.target;

        // highlight tract on map
        tract.setStyle(focusStyle);

        $('#top-tracts-container').animate({
          scrollTop: tractBar.offset().top
        })

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

      function zoomToFeature(e) {
        theMap.fitBounds(e.target.getBounds().pad(1.25));
      }

      // Attach the event handlers to each tract
      layer.on({
        mouseover: mouseover,
        mouseout: mouseout,
        click: zoomToFeature,
      });
    },
  })

  // Load TopoJSON and add to map
  omnivore.topojson('data/tracts2010.json', {}, baseLayer).addTo(theMap);
}
