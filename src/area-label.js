// This is the thing returned by areaLabel().
function Fit() {
}

// Returns a transform string that will
// translate and scale the label to the computed position and size.
Fit.prototype.toString = function (){
  return [
    "translate(" + this.xTranslate + "," + this.yTranslate + ")",
    "scale(" + this.scale + ")"
  ].join(" ");
};

// Finds the largest value that passes the test within some epsilon tolerance.
// See https://en.wikipedia.org/wiki/Bisection_method#Algorithm
function bisection(a, b, test, epsilon, maxIterations) {
  var i, c, passesTest, withinEpsilon;
  for(i = 0; i < maxIterations; i++){
    c = (a + b) / 2;
    passesTest = test(c);
    withinEpsilon = (b - a) / 2 < epsilon;

    // In our case, the returned value *must* pass the test,
    // so it's not enough only to check if the value is within epsilon.
    if ( passesTest && withinEpsilon) {
      return c;
    }
    if (passesTest) {
      a = c;
    } else {
      b = c;
    }
  }
  return null;
}

function areaLabel(area) {
  var x,
      y0,
      y1,
      bisectorX,
      minHeight = 2,
      epsilon = 0.01,
      maxIterations = 100,
      paddingLeft = 0,
      paddingRight = 0,
      paddingTop = 0,
      paddingBottom = 0;

  // Gets the height of the area for a particular datum.
  function getHeight(d) {
    return y0(d) - y1(d);
  }

  // Returns true if there is at least one rectangle
  // of the given aspect ratio and scale
  // that fits somewhere within the area.
  function fits(data, aspect, height, justTest) {
    var x0, x1, i0, i1, j, d, top, bottom, ceiling, floor,
        width = aspect * height,
        xMax = x(data[data.length - 1]);

    // Check if we can fit the rectangle at an X position
    // corresponding with one of the X values from the data.
    for(i0 = 0; i0 < data.length; i0++) {
      d = data[i0];
      x0 = x(d);
      x1 = x0 + width;

      // Don't go off the right edge of the area.
      if (x1 > xMax) {
        break;
      }
      
      // Test until we reach the rightmost X position
      // within the X positions of the data points.
      i1 = bisectorX(data, x1);
      ceiling = -Infinity;
      floor = Infinity;
      for(j = i0; j < i1; j++) {
        d = data[j];

        bottom = y0(d);
        if(bottom < floor) {
          floor = bottom;
        }

        top = y1(d);
        if(top > ceiling) {
          ceiling = top;
        }

        // Break as soon as we know the rectangle wil not fit.
        if ((floor - ceiling) < height) {
          break;
        }
      }
      if ((floor - ceiling) >= height) {

        // Avoid creating new objects unnecessarily while just testing.
        if (justTest) {
          return true;
        }

        // Output the solution for use in label transform.
        var fit = new Fit();
        fit.x = x0;
        fit.y = ceiling;
        fit.width = width;
        fit.height = height;
        return fit;
      }
    }
    return false;
  }

  function my(data) {

    // The bounding box of the text label as-is.
    var box = this.getBBox();

    // Account for padding.
    var paddingFactorX = 1 + paddingLeft + paddingRight;
    var paddingFactorY = 1 + paddingTop + paddingBottom;
    var boxWidth = box.width * paddingFactorX;
    var boxHeight = box.height * paddingFactorY;

    // The aspect ratio of the text label bounding box.
    var aspect = boxWidth / boxHeight;

    // Compute maximum possible label bounding box height in pixels.
    var maxHeight = d3.max(data, getHeight);

    // The test function for use in the bisection method.
    var test = function (testHeight){
      return fits(data, aspect, testHeight, true);
    };

    // Use the bisection method to find the largest height label that fits.
    var height = bisection(minHeight, maxHeight, test, epsilon, maxIterations);

    // If there's not any position that works,
    // return an object that will scale the label down to nothing,
    // and indicate that the algorithm failed.
    if (height === null) {
      var fit = new Fit();
      fit.failed = true;
      fit.scale = 0;
      fit.xTranslate = 0;
      fit.yTranslate = 0;
      return fit;
    }

    // Get the (x, y, width, height) for the largest height label that fits.
    var fit = fits(data, aspect, height);

    // Account for padding.
    var xInner = fit.x + fit.width / paddingFactorX * paddingLeft;
    var yInner = fit.y + fit.height / paddingFactorY * paddingTop;

    // Compute the scale and translate.
    fit.scale = height / boxHeight;
    fit.xTranslate = xInner - fit.scale * box.x;
    fit.yTranslate = yInner - fit.scale * box.y;

    return fit;
  }

  my.x = function(_) {
    if (arguments.length) {
      x = _;
      bisectorX = d3.bisector(x).right;
      return my;
    }
    return x;
  };

  my.y0 = function(_) {
    return arguments.length ? (y0 = _, my) : y0;
  };

  my.y1 = function(_) {
    return arguments.length ? (y1 = _, my) : y1;
  };

  my.area = function(area) {
    my.x(area.x()).y0(area.y0()).y1(area.y1());
  };

  my.minHeight = function(_) {
    return arguments.length ? (minHeight = +_, my) : minHeight;
  };

  my.epsilon = function(_) {
    return arguments.length ? (epsilon = +_, my) : epsilon;
  };

  my.maxIterations = function(_) {
    return arguments.length ? (maxIterations = +_, my) : maxIterations;
  };

  my.paddingLeft = function(_) {
    return arguments.length ? (paddingLeft = +_, my) : paddingLeft;
  };

  my.paddingRight = function(_) {
    return arguments.length ? (paddingRight = +_, my) : paddingRight;
  };

  my.paddingTop = function(_) {
    return arguments.length ? (paddingTop = +_, my) : paddingTop;
  };

  my.paddingBottom = function(_) {
    return arguments.length ? (paddingBottom = +_, my) : paddingBottom;
  };

  my.paddingX = function(_) {
    my.paddingLeft(_).paddingRight(_);
  };

  my.paddingY = function(_) {
    my.paddingTop(_).paddingBottom(_);
  };

  my.padding = function(_) {
    my.paddingX(_).paddingY(_);
  };

  if (area) {
    my.area(area);
  }

  return my;
};

export default areaLabel;
