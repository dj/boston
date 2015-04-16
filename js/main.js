var svg = $('#top-tracts'),
    svgContainer = $('#top-tracts-container'),
    width = svgContainer.width();

// Initialize the map
var theMap = L.map('map', { zoomControl: false, attributionControl: false }).setView([42.3601, -71.0589], 13);
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

function loaded(err, rows) {
  // Populate the data type dropdown
  var optionsList = Object.keys(rows[0]),
      select = d3.select('#data-type')

      select
        .selectAll('option')
        .data(optionsList).enter()
        .append('option')
        .attr('value', function(d) {return d})
        .text(function(d) {return d});

  // Refresh select options
  $('.selectpicker').selectpicker('refresh');

  $('#data-type').on('change', function() {
    var selected = $(this).find('option:selected').val();

    var sortedRows = _(rows)
      .map(function(row) {
        return {
          tract: row.tract,
          value: row[selected],
        }
      })
      .sortBy('value')
      .reverse()
      .value();

    drawSidebar(sortedRows, selected);
    drawMap(sortedRows, selected);
  })
}

function drawSidebar(rows, selected) {
  var barHeight = 20;
  // Scales
  var x = d3.scale.linear()
    .domain( [0, d3.max(rows, function (d) { return d.value } )] )
    .range([0, 100]);
  var color = d3.scale.quantize()
    .domain( [0, d3.max(rows, function (d) { return d.value } )] )
    .range(['#fef0d9', '#fdd49e', '#fdbb84', '#fc8d59', '#ef6548', '#d7301f', '#990000'])

  // Select the SVG and adjust height to fit data
  var chart = d3.select('#top-tracts')
    .attr('height', rows.length * barHeight)

  // Change the map heading
  var mapHeading = d3.select('#map-heading')
    .html(selected)

  var tracts = chart.selectAll('.tract')
    .data(rows, function(d) {
      return d.tract
    })
    .sort(function(a, b) { return d3.descending(a.value, b.value) })

  var tractEnter = tracts.enter().append('div').attr('class', 'tract progress'),
      tractUpdate = tracts,
      tractExit = tracts.exit();

  tractEnter
    .append('div')
      .attr('class', 'progress-bar tract-bar')
      .attr('role', 'progressbar')
      .attr('id', function(d) { return d.tract })
      .on('mouseover', function(d) {
        d3.select(this).style('border', '3px solid blue')

        theMap.eachLayer(function(layer){
          if (d.tract == layer._tract) {
            layer.setStyle({
              weight: 5,
              color: 'blue',
            });
          }
        })

      })
      .on('mouseout', function(d) {
        d3.select(this).style('border', 'none')

        theMap.eachLayer(function(layer){
          if (d.tract == layer._tract) {
            layer.setStyle({
              weight: 0,
              color: 'blue',
            });
          }
        })

      })
    .append('span')
      .attr('class', 'tract-bar-label')

  tractUpdate
    .selectAll('.tract-bar')
      .data(rows, function(d) { return d.tract })
      .style('width', function(d) {
          return x(d.value) + '%';
      })
      .style('color', function(d) {
        var rgb = color(d.value),
            hsl = d3.rgb(rgb).hsl();

        // Complimentary color
        hsl['h'] = (hsl['h'] + 120) % 360;

        return hsl;
      })
      .style('background-color', function(d) {
        return color(d.value);
      })

  tractUpdate
    .selectAll('.tract-bar-label')
      .data(rows, function(d) { return d.tract })
      .text(function(d) { return d.value });

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
    .range(['#fef0d9', '#fdd49e', '#fdbb84', '#fc8d59', '#ef6548', '#d7301f', '#990000'])
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
      var tractBar = $('#'+feature.id);

      layer._tract = feature.id

      // Event handlers for the layer
      function mouseover(e) {
        var tract = e.target;

        // highlight tract on map
        tract.setStyle({
            weight: 2,
            color: 'blue',
        });

        // hightlight tract on bar graph
        tractBar.css({
          'border': '3px solid blue'
        })

        // update current tract info
        $('#current-tract-id').text("Census Tract: "+feature.id)
        $('#current-tract-value').text(tractsById.get(feature.id)[selected])

        if (!L.Browser.ie && !L.Browser.opera) {
          tract.bringToFront();
        }
      }

      function mouseout(e) {
        tractBar.css({
          'border': 'none'
        })

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
