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
    var selected = $(this).find("option:selected").val();

    draw(rows, selected)
  })

  draw(rows, 'totalPop');
}

function draw(rows, selected) {
  var x = d3.scale.linear()
    .domain([0, d3.max(rows, function (d) { return d[selected] })])
    .range([0, width]);

  var barHeight = 20;

  var data = _.sortBy(rows, selected).reverse();

  // Select the SVG and adjust height to fit data
  var svg = d3.select('#top-tracts')
    .attr('height', data.length * barHeight)

  var tracts = svg.selectAll('.tract')
    .data(data, function(d) { return d.tract })

  var tractEnter = tracts.enter().append('g'),
      tractUpdate = tracts,
      tractExit = tracts.exit();

  // Append bars
  tractEnter
    .append('rect')
      .style({ fill: 'rgb(50,50,50)' });

  // Append bar labels
  tractEnter
   .append("text")
     // .attr("x", function(d) { return x(d[selected]) - 3; })
     .attr("x", function(d) { return 100; })
     .attr("y", barHeight / 2)
     .attr("dy", ".35em")
     .text(function(d) { return 'Tract: ' + d.tract; });

  // Update bar size
  tractUpdate.selectAll('rect')
    .attr('width', function(d) { return x(d[selected]); })
    .attr('height', function(d) { return barHeight - 1; })

  // Update bar with new position
  tractUpdate
    .attr('transform', function(d, i) {
      return 'translate(0,' + (barHeight * i) + ')';
    })
}

