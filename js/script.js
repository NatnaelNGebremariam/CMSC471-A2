// Global variables
let allData = [];
let xVar = 'TAVG', yVar = 'AWND', sizeVar = 'WSF5', selectedStation = 'GUAM INTL AP', selectedState = 'GU', selectedMonth = 1;
let xScale, yScale, sizeScale;
const t = 1000; // 1000ms transition time

// Define color scale for stations and elevation
const stations = ['TMIN', 'TMAX', 'TAVG', 'PRCP', 'AWND', 'WSF5', 'SNOW', 'SNWD'];
const colorScale = d3.scaleOrdinal(d3.schemeCategory10).domain(stations);

// Set margins
const margin = { top: 100, right: 60, bottom: 80, left: 100 };
const width = 700 - margin.left - margin.right;
const height = 600 - margin.top - margin.bottom;

// Create SVG canvas
const svg = d3.select('#vis')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

// Create x and y axis groups
svg.append("g").attr("class", "x-axis").attr("transform", `translate(0, ${height})`);
svg.append("g").attr("class", "y-axis");

// Add axis labels
svg.append("text")
    .attr("class", "x-label")
    .attr("text-anchor", "middle")
    .attr("x", width / 2)
    .attr("y", height + 50)
    .text("X-Axis Variable");

svg.append("text")
    .attr("class", "y-label")
    .attr("text-anchor", "middle")
    .attr("transform", `rotate(-90)`)
    .attr("x", -height / 2)
    .attr("y", -60)
    .text("Y-Axis Variable");

// Create month slider labels
const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
d3.select("#monthSlider").attr("min", 1).attr("max", 12).property("value", 1);
d3.select("#monthLabel").text(months[0]);

d3.select("#monthSlider").on("input", function () {
    selectedMonth = +this.value;
    d3.select("#monthLabel").text(months[selectedMonth - 1]);
    updateVis();
});

// Function to update axes and scales
function updateAxes() {
    let filteredData = allData.filter(d => d.station === selectedStation);

    xScale = d3.scaleLinear()
        .domain([d3.min(filteredData, d => d[xVar]) - 5, d3.max(filteredData, d => d[xVar]) + 5])
        .range([0, width]);

    yScale = d3.scaleLinear()
        .domain([0, d3.max(filteredData, d => d[yVar]) + 5])
        .range([height, 0]);

    sizeScale = d3.scaleSqrt()
        .domain([0, d3.max(filteredData, d => d[sizeVar])])
        .range([5, 20]);

    // Update axes
    svg.select(".x-axis")
        .transition(t)
        .call(d3.axisBottom(xScale));

    svg.select(".y-axis")
        .transition(t)
        .call(d3.axisLeft(yScale));

    // Update labels dynamically
    svg.select(".x-label").text(xVar);
    svg.select(".y-label").text(yVar);
}

// Function to create and update bubble chart
function updateVis() {
    let filteredData = allData.filter(d =>
        d.station === selectedStation &&
        (selectedState === 'All' || d.state === selectedState) &&
        (selectedMonth === 'All' || d.month === selectedMonth)
    );

    updateAxes(); // Ensure scales update before plotting

    const bubbles = svg.selectAll('.points')
        .data(filteredData, d => d.station);

    bubbles.join(
        enter => enter.append('circle')
            .attr('class', 'points')
            .attr('cx', d => xScale(d[xVar]))
            .attr('cy', d => yScale(d[yVar]))
            .style('fill', d => colorScale(d[xVar]))
            .attr('r', 0)
            .on('mouseover', function (event, d) {
                d3.select('#tooltip')
                    .style("display", 'block')
                    .html(`<strong>${d.station}</strong><br/> State: ${d.state}<br/> Temp: ${d.TAVG || ((d.TMIN + d.TMAX) / 2).toFixed(2)}°F<br/> Wind Speed: ${d.AWND} mph<br/> Elevation: ${d.ELEVATION}m`)
                    .style("left", (event.pageX + 20) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", () => d3.select('#tooltip').style('display', 'none'))
            .transition(t)
            .attr('r', d => sizeScale(d[sizeVar])),

        update => update.transition(t)
            .attr('cx', d => xScale(d[xVar]))
            .attr('cy', d => yScale(d[yVar]))
            .attr('r', d => sizeScale(d[sizeVar])),

        exit => exit.transition(t).attr('r', 0).remove()
    );
}

function setupSelectors() {
    // X and Y dropdowns
    d3.select("#xSelector").selectAll("option")
        .data(stations).enter()
        .append("option").text(d => d).attr("value", d => d);
    d3.select("#xSelector").on("change", function () {
        xVar = this.value;
        updateVis();
    });

    d3.select("#ySelector").selectAll("option")
        .data(stations).enter()
        .append("option").text(d => d).attr("value", d => d);
    d3.select("#ySelector").on("change", function () {
        yVar = this.value;
        updateVis();
    });
}

function updateStateSelector() {
    const stateDropdown = d3.select("#stateSelector");
    const uniqueStates = ['All', ...new Set(allData.filter(d => d.station === selectedStation).map(d => d.state))];

    stateDropdown.selectAll("option").remove();
    stateDropdown.selectAll("option")
        .data(uniqueStates)
        .enter()
        .append("option")
        .text(d => d)
        .attr("value", d => d);

    selectedState = "GU";
}

function setupStationSelector() {
    const stationDropdown = d3.select("#stationSelector");
    const uniqueStations = [...new Set(allData.map(d => d.station))];

    stationDropdown.selectAll("option")
        .data(uniqueStations)
        .enter()
        .append("option")
        .text(d => d)
        .attr("value", d => d);

    stationDropdown.property("value", "GUAM INTL AP");
    stationDropdown.on("change", function () {
        selectedStation = this.value;
        updateStateSelector();
        updateVis();
    });
}

function createLegend() {
    let size = 10;

    svg.selectAll('.legendSquare')
        .data(stations)
        .enter()
        .append('rect')
        .attr('class', 'legendSquare')
        .attr('x', (d, i) => i * (size + 100) + 100)
        .attr('y', -margin.top / 2)
        .attr('width', size)
        .attr('height', size)
        .style('fill', d => colorScale(d));

    svg.selectAll('.legendText')
        .data(stations)
        .enter()
        .append('text')
        .attr('class', 'legendText')
        .attr('x', (d, i) => i * (size + 100) + 120)
        .attr('y', -margin.top / 2 + size)
        .style('fill', d => colorScale(d))
        .text(d => d)
        .attr('text-anchor', 'left')
        .style('font-size', '13px');
}


function init() {
    d3.csv("./data/weather.csv")
        .then(data => {
            data.forEach(d => { d.month = +d.date.substring(4, 6); });
            allData = data;
            setupStationSelector();
            setupSelectors();
            updateStateSelector();
            updateAxes();
            updateVis();
            createLegend();
        })
        .catch(error => console.error('Error loading data:', error));
}

window.addEventListener('load', init);