
function drawChart(rawData, config, regression, cb) {
  const element = document.getElementById('chart');
  const paper = Raphael(element);

  const headers = rawData[0];
  const xsIndex = headers.indexOf(config.master);
  const ysIndex = _.map(config.slaves, (header) => headers.indexOf(header));

  const rawDataWithoutHeader = _.drop(rawData);
  const unzippedRawData = _.unzip(rawDataWithoutHeader);
  const xs = unzippedRawData[xsIndex];
  const ysData = _.map(ysIndex, (index) => unzippedRawData[index]);
  const ysRegression = _.unzip(regression.points)[1];
  const ys = _.flatten([ysData, [ysRegression]]);
  const chartOptions = {
    smooth: true,
    colors: ['#0F0','#F00'],
    symbol: 'circle',
    axis: "0 0 1 1"
  }; 
  paper.linechart(0, 0, 1300, 500, xs, ys, chartOptions);
  cb();

}

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
  const table = htmlTableAsStringArray.join('');
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
             `<td> <input id="master-${columnName}" type="checkbox" onchange="onConfigChange()"/> </td>` +
             `<td> <input id="slave-${columnName}" type="checkbox" onchange="onConfigChange()"/> </td>` +
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
                           "<select id='regression' onchange='onConfigChange()'>" +
                              "<option selected>Select a Regression type</option>" +
                              "<option value='linear'>Linear</option>" +
                              "<option value='poly-2'>Polynomial Degree 2</option>" +
                              "<option value='poly-3'>Polynomial Degree 3</option>" +
                              "<option value='poly-4'>Polynomial Degree 4</option>" +
                           "</select>" +
                           "<label>Regression</label>" +
                         "</form>";
  cb(null, dataConfigTable + regressionForm);
};

const readConfig = (csv, cb) => {
  const masterFields = document.querySelectorAll("input[id*=master]");
  const slaveFields = document.querySelectorAll("input[id*=slave]");
  const isFieldActive  = (field) => field.checked;
  const getFieldName = (prefix) => {
    return (field) => {
      const regExp = prefix + "-([\\w\\s]*)";
      const match = new RegExp(regExp).exec(field.id);
      return match[1];
    }
  };
  const selectedMasterFields = _.filter(masterFields, isFieldActive);
  const selectedSlaveFields = _.filter(slaveFields, isFieldActive);
  const fieldsConfig = {
    master: _.first(_.map(selectedMasterFields, getFieldName("master"))),
    slaves: _.map(selectedSlaveFields, getFieldName("slave")),
  };

  const regressionSelect = document.getElementById('regression');
  const type = regressionSelect.value == "linear" ? "linear" : "polynomial";
  const match = regressionSelect.value.match(/^poly-(\d)$/);
  const degree = match ? match[1] : null;
  const regConfig =  {
    type: type,
    degree: parseInt(degree)
  };
  const config = _.extend( {}, regConfig, fieldsConfig)
  cb(null, config);
};

const computeRegression = (csv, config, cb) => {
  const data = _.drop(csv);
  cb(null, regression(config.type, data, config.degree));
};

const getFileLoader = () => document.getElementById("file-loader");


const onFileChange = () => {
  var file = getFileLoader().files[0];
  async.auto({
    csv:                                                                   (cb) => { parseCSV(file, cb) },
    chartConfigForm:        [ "csv",                                       (cb, ctx) => createChartConfigForm(ctx.csv, cb)],
    HTMLTableAsStringArray: [ "csv",                                       (cb, ctx) => {createHtmlTableStringArray(ctx.csv, cb)}],
    insert:                 [ "HTMLTableAsStringArray", "chartConfigForm", (cb, ctx) => { insertHTML(ctx.HTMLTableAsStringArray, ctx.chartConfigForm, cb); }]
  });
};

const onConfigChange = () => {
  var file = getFileLoader().files[0];
  async.auto({
    csv:                                                     (cb) => parseCSV(file, cb),
    config:                 ['csv',                          (cb, ctx) => readConfig(ctx.csv, cb)],
    regression:             ['config',                       (cb, ctx) => computeRegression(ctx.csv, ctx.config, cb)],
    drawChart:              ["csv", "config", "regression", (cb, ctx) => drawChart(ctx.csv, ctx.config, ctx.regression, cb)],
  });
}

const  setupFileChangeListener = () => {
  getFileLoader().addEventListener("change", onFileChange);
};

window.addEventListener("DOMContentLoaded", setupFileChangeListener);
