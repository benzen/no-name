
//google.setOnLoadCallback(drawChart);
function drawChart(rawData, cb) {
  var data = google.visualization.arrayToDataTable(rawData);

  var options = {
    hAxis: {minValue: 0, maxValue: 15},
    vAxis: {minValue: 0, maxValue: 15},
    chartArea: {width:'100%'},
    trendlines: {
      0: {
        type: 'polynomial',
        degree:4,
        showR2: true,
        visibleInLegend: true
      }
    }
  };

  var chartLinear = new google.visualization.ScatterChart(document.getElementById('chart'));
  chartLinear.draw(data, options);
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

  const insertHTMLTable = (htmlTableAsStringArray, cb) => {
    const table = htmlTableAsStringArray.join('')
    const holder = document.getElementById("data");
    holder.innerHTML = `<table>${table}</table>`;
    cb()
  }

  var onFileChange = () => {
    var file = fileLoader.files[0];
    async.auto({
      csv: (cb) => { parseCSV(file, cb) },
      HTMLTableAsStringArray: ["csv", (cb, ctx) => {createHtmlTableStringArray(ctx.csv, cb)}],
      insert: ["HTMLTableAsStringArray", (cb, ctx) => { insertHTMLTable(ctx.HTMLTableAsStringArray, cb)}],
      drawChart: ["csv", (cb, ctx) => {drawChart(ctx.csv, cb)}]
    });

  }
  
  fileLoader.addEventListener("change", onFileChange);
};
window.addEventListener("DOMContentLoaded", setupListener);