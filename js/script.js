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


const zoom = d3.zoom()
.scaleExtent([0.5, 2]) 
.on('zoom', (event) => {
    svg.attr('transform', event.transform);

    // Rescale axes
    const newXScale = event.transform.rescaleX(xScale);
    const newYScale = event.transform.rescaleY(yScale);

    svg.select(".x-axis").call(d3.axisBottom(xScale));
    svg.select(".y-axis").call(d3.axisLeft(yScale));

    // Rescale bubbles
    svg.selectAll('.points')
        .attr('cx', d => newXScale(+d[xVar] || 0))
        .attr('cy', d => newYScale(+d[yVar] || 0))
        .attr('r', d => sizeScale(+d[sizeVar] || 3));
});

// Apply zoom to the SVG container
d3.select('#vis svg')
.call(zoom);


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
    let filteredData = allData.filter(d => 
        d.station === selectedStation &&
        (selectedState === 'All' || d.state === selectedState) &&
        (selectedMonth === 'All' || d.month === selectedMonth)
    );

    if (filteredData.length === 0) return; 

    const xMin = d3.min(filteredData, d => +d[xVar]) || 0;
    const xMax = d3.max(filteredData, d => +d[xVar]) || 1;
    const yMin = d3.min(filteredData, d => +d[yVar]) || 0;
    const yMax = d3.max(filteredData, d => +d[yVar]) || 1;
    
    // Add size scale initialization here
    const sizeMin = d3.min(filteredData, d => +d[sizeVar]) || 0;
    const sizeMax = d3.max(filteredData, d => +d[sizeVar]) || 1;
    
    sizeScale = d3.scaleLinear()
        .domain([sizeMin, sizeMax])
        .range([3, 15]);

    xScale = d3.scaleLinear()
        .domain([xMin - 5, xMax + 5]) 
        .range([0, width]);

    yScale = d3.scaleLinear()
        .domain([Math.min(0, yMin - 5), yMax + 5]) 
        .range([height, 0]);

    svg.select(".x-axis")
        .transition()
        .duration(1000)
        .call(d3.axisBottom(xScale));

    svg.select(".y-axis")
        .transition()
        .duration(1000)
        .call(d3.axisLeft(yScale));

    svg.select(".x-label").text(xVar);
    svg.select(".y-label").text(yVar);
}

// Function to create and update bubble chart
function updateVis() {
    let filteredData = allData.filter(d =>
        d.station === selectedStation &&
        (selectedState === 'All' || d.state === selectedState) &&
        (selectedMonth === 'All' || +d.month === selectedMonth)
    );

    updateAxes(); 

    // Handle empty dataset
    if (!filteredData.length || !xScale || !yScale || !sizeScale) return;

    const bubbles = svg.selectAll('.points')
        .data(filteredData, d => d.id || d.station + d.date);

    bubbles.join(
        enter => enter.append('circle')
            .attr('class', 'points')
            .attr('cx', d => xScale(+d[xVar] || 0))
            .attr('cy', d => yScale(+d[yVar] || 0))
            .style('fill', d => colorScale(d[xVar]))
            .attr('r', 0)
            .on('mouseover', function (event, d) {
                d3.select(this)
                .style('stroke', 'black')
                .style('stroke-width', '2px');

                d3.select('#tooltip')
                    .style("display", 'block')
                    .html(`<strong>${d.station}</strong><br/> State: ${d.state}<br/> Temp: ${d.TAVG || ((+d.TMIN + +d.TMAX) / 2).toFixed(2)}°F<br/> Wind Speed: ${d.AWND} mph<br/> Elevation: ${d.ELEVATION}m`)
                    .style("left", (event.pageX + 20) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
           .on("mouseout", function () {
                        d3.select(this)
                            .style('stroke', 'none');

                        d3.select('#tooltip')
                            .style('display', 'none');
                    })
            .transition(t)
            .attr('r', d => sizeScale(+d[sizeVar] || 3)),

        update => update.transition(t)
            .attr('cx', d => xScale(+d[xVar] || 0))
            .attr('cy', d => yScale(+d[yVar] || 0))
            .attr('r', d => sizeScale(+d[sizeVar] || 3)),

        exit => exit.transition(t).attr('r', 0).remove()
    );
}

function setupSelectors() {
    // X and Y dropdowns
    d3.select("#xSelector").selectAll("option")
        .data(stations).enter()
        .append("option").text(d => d).attr("value", d => d);
    d3.select("#xSelector").property("value", xVar); 
    d3.select("#xSelector").on("change", function () {
        xVar = this.value;
        updateVis();
    });

    d3.select("#ySelector").selectAll("option")
        .data(stations).enter()
        .append("option").text(d => d).attr("value", d => d);
    d3.select("#ySelector").property("value", yVar);
    d3.select("#ySelector").on("change", function () {
        yVar = this.value;
        updateVis();
    });
    
    // Add size selector
    d3.select("#sizeSelector").selectAll("option")
        .data(stations).enter()
        .append("option").text(d => d).attr("value", d => d);
    d3.select("#sizeSelector").property("value", sizeVar); 
    d3.select("#sizeSelector").on("change", function () {
        sizeVar = this.value;
        updateVis();
    });
}

function updateStateSelector() {
    const stateDropdown = d3.select("#stateSelector");
    
    // Extract unique states for the selected station
    const uniqueStates = ['All', ...new Set(allData
        .filter(d => d.station === selectedStation)
        .map(d => d.state)
    )];

    // Update state dropdown
    stateDropdown.selectAll("option").remove();
    stateDropdown.selectAll("option")
        .data(uniqueStates)
        .enter()
        .append("option")
        .text(d => d)
        .attr("value", d => d);

    // Set default values
    selectedState = uniqueStates.includes("GU") ? "GU" : uniqueStates[0];

    // Update the dropdown selections visually
    stateDropdown.property("value", selectedState);
    
    // Add event listener
    stateDropdown.on("change", function() {
        selectedState = this.value;
        updateVis();
    });
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
    let legendItems = stations;

    svg.selectAll('.legendSquare').remove();
    svg.selectAll('.legendText').remove();

    svg.selectAll('.legendSquare')
        .data(legendItems)
        .enter()
        .append('rect')
        .attr('class', 'legendSquare')
        .attr('x', (d, i) => i * (size + 70) + 50)
        .attr('y', -margin.top / 2)
        .attr('width', size)
        .attr('height', size)
        .style('fill', d => colorScale(d));

    svg.selectAll('.legendText')
        .data(legendItems)
        .enter()
        .append('text')
        .attr('class', 'legendText')
        .attr('x', (d, i) => i * (size + 70) + 65)
        .attr('y', -margin.top / 2 + size / 2 + 4)
        .style('fill', 'black')
        .text(d => d)
        .attr('text-anchor', 'start')
        .style('font-size', '10px');
}

function init() {
    d3.csv("./data/weather.csv")
        .then(data => {
            // Process data
            data.forEach((d, i) => { 
                d.month = +d.date.substring(4, 6);
                
                
                // Convert numeric fields to numbers
                stations.forEach(station => {
                    if (d[station]) d[station] = +d[station];
                });
            });
            
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