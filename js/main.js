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

  var barHeight = 20;

  // Select the SVG and adjust height to fit data
  var svg = d3.select('#top-tracts')
    .attr('height', rows.length * barHeight)

  var tracts = svg.selectAll('.tract')
    .data(rows, function(d) { return d.tract })

  var tractEnter = tracts.enter().append('g').attr('class', 'tract'),
      tractUpdate = tracts,
      tractExit = tracts.exit();

  // Append bars
  tractEnter
    .append('rect')
      .style({ fill: 'rgb(50,50,50)' });

  // Append bar labels
  tractEnter
   .append('text')
     // .attr('x', function(d) { return x(d[selected]) - 3; })
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

// Leaflet
var map = L.map('map').setView([42.3601, -71.0589], 13);

L.tileLayer('http://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
	attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
	maxZoom: 16
}).addTo(map);

