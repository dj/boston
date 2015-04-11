var svg = $('#top-tracts'),
    svgContainer = $('#top-tracts-container'),
    width = svgContainer.width();

// Set the svg width to the width of it's container
svg.width(width);

// Set the svg container height so that it extends to the bottom of the sidebar
var svgContainerHeight = $(window).height() - $('#top-tracts-container').position().top
svgContainer.height(svgContainerHeight - 20);

// Load the data
d3.csv('data/boston-census-2010.csv', parse, loaded);

// Parse the rows of the CSV, coerce strings to nums
function parse(row) {
  return {
    tract: +row['CT_ID_10'],
    medianIncome: +row['medincome'],
    totalPop: +row['totalpop'],
  };
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
    console.log(selected);

    // TODO: do sorting in event handler before passing to draw
    var sorted = _.sortBy(rows, selected).reverse();

    draw(sorted, selected)
  })
}

function draw(rows, selected) {
  var x = d3.scale.linear()
    .domain(d3.extent(rows, function (d) { return d[selected] }))
    .range([0, width]);
  var color = d3.scale.quantile()
    .domain(d3.extent(rows, function (d) { return d[selected] }))
    .range(['#fef0d9', '#fdd49e', '#fdbb84', '#fc8d59', '#ef6548', '#d7301f', '#990000'])
  var barHeight = 20;

  // Select the SVG and adjust height to fit data
  var svg = d3.select('#top-tracts')
    .attr('height', rows.length * barHeight)

  // Change the map heading
  var mapHeading = d3.select('#map-heading')
    .html(selected)

  var tracts = svg.selectAll('.tract')
    .data(rows, function(d) { return d.tract })

  var tractEnter = tracts.enter().append('g').attr('class', 'tract'),
      tractUpdate = tracts,
      tractExit = tracts.exit();

  // Append bars
  tractEnter
    .append('rect')
    .attr('class', 'bar')

  // Append bar labels
  tractEnter
   .append('text')
   .attr('class', 'bar-label')

  // Update bar fill
  tractUpdate
    .selectAll('.bar')
      .style('fill', function(d) { return color(d[selected]) } );

  // Update bar labels
  tractUpdate
    .selectAll('.bar-label')
      .attr('x', function(d) { return 120; })
      .attr('y', barHeight / 2)
      .attr('dy', '.35em')
      .text(function(d) { return selected + ': ' + d[selected]; });

  // Update bar size
  tractUpdate.selectAll('rect')
    .attr('height', function(d) { return barHeight - 1; })
    .attr('width', 0)
    .transition().duration(1000)
    .attr('width', function(d) { return x(d[selected]); })

  // Update bar with new position
  tractUpdate
    .attr('transform', function(d, i) {
      return 'translate(0,' + (barHeight * i) + ')';
    })

  // EXIT
  tractExit.remove();
}

/*============================================================================*/
/* LEAFLET MAP                                                                */
/*============================================================================*/

// Initialize the map
var theMap = L.map('map').setView([42.3601, -71.0589], 13);

// Initialize the tile layer and add it to the map.
L.tileLayer('http://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
	attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
	maxZoom: 16
}).addTo(theMap);

// Plot Census Tracts
// ==================
// + Create a base layer and attach event handlers
// + Load the census tract TopoJSON with the base layer

var baseLayer = L.geoJson(null, {
  style: function(feature) {
    return {
      color: '#222',
      weight: 2,
      dashArray: '4',
      fill: 'red',
      // fillColor: tractFillColor(feature.id),
      fillOpacity: 0.5
    };
  },

  onEachFeature: function(feature, layer) {
    // Event handlers for the layer
    function mouseover(e) {
      var tract = e.target;

      tract.setStyle({
          weight: 5,
          color: 'red',
          dashArray: '',
      });

      if (!L.Browser.ie && !L.Browser.opera) {
        tract.bringToFront();
      }
    }

    function mouseout(e) {
      baseLayer.resetStyle(e.target);
    }

    function zoomToFeature(e) {
      theMap.fitBounds(e.target.getBounds());
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

