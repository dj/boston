var canvas = $('.top-tracts'),
    canvasContainer = $('.top-tracts-container');

// Set the canvas width to the width of it's container
canvas.width( canvasContainer.width());

// Load the data
d3.csv('data/boston-census-2010.csv', parse, loaded);

function parse(row) {
  return row;
}

function loaded(err, data) {
  console.log(data);
}

