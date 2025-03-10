// Global variables
let allData = [];
let xVar = 'TAVG', yVar = 'AWND', sizeVar = 'WSF5', selectedState = 'CO', selectedMonth = 'All';
let xScale, yScale, sizeScale;
const t = 1000; // 1000ms transition time

// Define color scale for stations and elevation
const stations = ['TMIN', 'TMAX', 'TAVG', 'PRCP', 'AWND', 'WSF5', 'SNOW', 'SNWD'];
const colorScale = d3.scaleSequential(d3.interpolateCool)
    .domain([0, 3000]); // Color scale for elevation

// Set margins
const margin = { top: 80, right: 60, bottom: 60, left: 100 };
const width = 800 - margin.left - margin.right;
const height = 600 - margin.top - margin.bottom;

// Create SVG canvas
const svg = d3.select('#vis')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

// Function to update axes and scales
function updateAxes() {
    svg.selectAll('.axis').remove();
    svg.selectAll('.labels').remove();

    xScale = d3.scaleLinear()
        .domain([d3.min(allData, d => d[xVar]) - 5, d3.max(allData, d => d[xVar]) + 5])
        .range([0, width]);

    const xAxis = d3.axisBottom(xScale).tickFormat(d3.format(".2f"));
    svg.append("g")
        .attr("class", "axis x-axis")
        .attr("transform", `translate(0,${height})`)
        .call(xAxis);

    yScale = d3.scaleLinear()
        .domain([0, d3.max(allData, d => d[yVar]) + 5])
        .range([height, 0]);

    const yAxis = d3.axisLeft(yScale).tickFormat(d3.format(".2f"));
    svg.append("g")
        .attr("class", "axis y-axis")
        .call(yAxis);

    sizeScale = d3.scaleSqrt()
        .domain([0, d3.max(allData, d => d[sizeVar])])
        .range([5, 20]);

    svg.append("text")
        .attr("class", "labels")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 20)
        .attr("text-anchor", "middle")
        .text(xVar);

    svg.append("text")
        .attr("class", "labels")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -margin.left + 40)
        .attr("text-anchor", "middle")
        .text(yVar);
}


// Function to create and update bubble chart
function updateVis() {
    let filteredData = allData.filter(d =>
        (selectedState === 'All' || d.state === selectedState) &&
        (selectedMonth === 'All' || d.month === selectedMonth)
    );

    svg.selectAll('.points')
        .data(filteredData, d => d.station)
        .join(
            enter => enter.append('circle')
                .attr('class', 'points')
                .attr('cx', d => xScale(d[xVar]))
                .attr('cy', d => yScale(d[yVar]))
                .style('fill', d => colorScale(d.ELEVATION))
                .style('opacity', 0.7)
                .attr('r', 0)
                .on('mouseover', function (event, d) {
                    d3.select(this).style('stroke', 'black').style('stroke-width', '2px');
                    d3.select('#tooltip')
                        .style("display", 'block')
                        .html(`<strong>${d.station}</strong><br/> State: ${d.state}<br/> Temp: ${d.TAVG || ((d.TMIN + d.TMAX) / 2).toFixed(2)}°F<br/> Wind Speed: ${d.AWND} mph<br/> Elevation: ${d.ELEVATION}m`)
                        .style("left", (event.pageX + 20) + "px")
                        .style("top", (event.pageY - 28) + "px");
                })
                .on("mouseout", function () {
                    d3.select(this).style('stroke', 'none');
                    d3.select('#tooltip').style('display', 'none');
                })
                .transition(t)
                .attr('r', d => sizeScale(d[sizeVar])),

            update => update.transition(t)
                .attr('cx', d => xScale(d[xVar]))
                .attr('cy', d => yScale(d[yVar]))
                .attr('r', d => sizeScale(d[sizeVar])),

            exit => exit.transition(t)
                .attr('r', 0)
                .remove()
        );
}

// Function to populate state dropdown
function setupStateSelector() {
    const stateDropdown = d3.select("#stateSelector");
    const uniqueStates = ['All', ...new Set(allData.map(d => d.state))];

    stateDropdown.selectAll("option")
        .data(uniqueStates)
        .enter()
        .append("option")
        .text(d => d)
        .attr("value", d => d);

    stateDropdown.on("change", function () {
        selectedState = this.value;
        updateVis();
    });
}

// Function to add a month slider
function setupMonthSlider() {
    const monthSlider = d3.select("#monthSlider");
    monthSlider.on("input", function () {
        selectedMonth = this.value === 'All' ? 'All' : +this.value;
        d3.select("#monthValue").text(selectedMonth === 'All' ? 'All Months' : `Month: ${selectedMonth}`);
        updateVis();
    });
}

// Function to setup X and Y axis selectors
function setupVariableSelectors() {
    const variableOptions = ['TMIN', 'TMAX', 'TAVG', 'AWND', 'PRCP', 'WSF5', 'SNOW', 'SNWD'];

    d3.selectAll('.variable')
        .each(function () {
            d3.select(this).selectAll('option')
                .data(variableOptions)
                .enter()
                .append('option')
                .text(d => d)
                .attr("value", d => d);
        });

    d3.select("#xVariable").property("value", xVar);
    d3.select("#yVariable").property("value", yVar);

    d3.selectAll('.variable')
        .on("change", function () {
            const selectedId = d3.select(this).property("id");
            const selectedValue = d3.select(this).property("value");

            if (selectedId === "xVariable") xVar = selectedValue;
            else if (selectedId === "yVariable") yVar = selectedValue;

            updateAxes();
            updateVis();
        });
}

// Load data and initialize visualization
function init() {
    d3.csv("./data/weather.csv")
        .then(data => {
            // Convert numeric values
            data.forEach(d => {
                d.TMIN = +d.TMIN;
                d.TMAX = +d.TMAX;
                d.TAVG = +d.TAVG;
                d.AWND = +d.AWND;
                d.WSF5 = +d.WSF5;
                d.SNOW = +d.SNOW;
                d.SNWD = +d.SNWD;
                d.PRCP = +d.PRCP;
                d.ELEVATION = +d.elevation;
                d.month = +d.date.substring(4, 6); // Extract month
            });

            allData = data;
            setupVariableSelectors();
            setupStateSelector();
            setupMonthSlider();
            updateAxes();
            updateVis();
        })
        .catch(error => console.error('Error loading data:', error));
}

// Run init() when the page loads
window.addEventListener('load', init);




