
function drawChart(rawData, regression, cb) {
  const element = document.getElementById('chart');
  const paper = Raphael(element);
  const rawDataWithoutHeader = _.drop(rawData);
  const unzippedRawData = _.unzip(rawDataWithoutHeader);
  const xs = unzippedRawData[0];
  const ys = unzippedRawData[1];
  const regressionYs = _.unzip(regression.points)[1]
  paper.linechart(0, 0, 1300, 500, xs, [ys, regressionYs], {smooth: true, colors: ['#0F0','#F00'], symbol: 'circle'});
  cb();

}


var setupListener = () => {
  const fileLoader = document.getElementById("file-loader");
  
  const parseCSV = (file, cb) => {
    Papa.parse(file, {
      worker: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => { cb(null, results.data); }
    });
  }

  const createHtmlTableStringArray = (rows, cb) => {
    const header = (row) => `<tr><th>${row[0]}</th><th>${row[1]}</th></tr>`;
    const line = (row) => `<tr><td>${row[0]}</td><td>${row[1]}</td></tr>`;
    const iter = (row, cb) => { 
      const index = rows.indexOf(row);
      const l = index == 0 ? header(row) : line(row);
      cb(null, l);
    } 
    async.map(rows, iter, cb);
  }

  const insertHTML = (htmlTableAsStringArray, chartConfigForm, cb) => {
    const table = htmlTableAsStringArray.join('')
    const tableHolder = document.getElementById("data");
    tableHolder.innerHTML = `<table>${table}</table>`;

    const configHolder = document.getElementById("config");
    configHolder.innerHTML = `<form>${chartConfigForm}</form>`;

    cb();
  }
  const createChartConfigForm = (csv, cb) => {
    const columnNames = csv[0];
    const columnToField = (columnName) => { 
      return "<tr>" +
               `<td> <input id="master-${columnName}" type="checkbox" /></td>` +
               `<td> <input id="slave-${columnName}" type="checkbox" /></td>` +
               `<td> <label> ${columnName} </label></td>` +
             "</tr>"
    };
    const columnSelectors = _.map(columnNames, columnToField).join('');
    const dataConfigTable =  "<table>" +
                          "<tr>" +
                            "<th>Master</th>" +
                            "<th>Slave</th>" +
                            "<th></th>" +
                          "</tr>"+
                          columnSelectors +
                         "</table>";

    const regressionForm = "<form>" +
                             "<label>Regression</label>" + 
                             "<select>" +
                                "<option>Linear</option>" +
                                "<option>Polynomial Degree 2</option>" +
                                "<option>Polynomial Degree 3</option>" +
                                "<option>Polynomial Degree 4</option>" +
                             "</select>" +
                           "</form>";
    cb(null, dataConfigTable + regressionForm);    
  };

  const computeRegression = (csv, cb) => {
        const data = _.drop(csv);
        const coefficient = regression('linear', data);
        cb(null, coefficient);
    
  };
  
  const onFileChange = () => {
    var file = fileLoader.files[0];
    async.auto({
      csv: (cb) => { parseCSV(file, cb) },
      regression: ["csv", (cb, ctx) => computeRegression(ctx.csv, cb)],
      HTMLTableAsStringArray: ["csv", (cb, ctx) => {createHtmlTableStringArray(ctx.csv, cb)}],
      insert: ["HTMLTableAsStringArray", "chartConfigForm",(cb, ctx) => { 
        insertHTML(ctx.HTMLTableAsStringArray, ctx.chartConfigForm, cb);
      }],
      drawChart: ["csv", "regression", (cb, ctx) => {drawChart(ctx.csv, ctx.regression, cb)}],
      chartConfigForm: ["csv", (cb, ctx) => createChartConfigForm(ctx.csv, cb)]
    });
  }
  
  fileLoader.addEventListener("change", onFileChange);
};
window.addEventListener("DOMContentLoaded", setupListener);
