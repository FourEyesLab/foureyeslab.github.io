function guid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
        s4() + '-' + s4() + s4() + s4();
}

function pointPointDistance(a, b) {
    return Math.sqrt((a[0] - b[0]) * (a[0] - b[0]) + (a[1] - b[1]) * (a[1] - b[1]));
}

function minimalSpanningTree(points) {
    var edges = [];
    var parents = new Array(points.length);
    for (var i = 0; i < points.length; i++) {
        parents[i] = i;
        for (var j = i + 1; j < points.length; j++) {
            edges.push([pointPointDistance(points[i], points[j]), i, j]);
        }
    }
    edges.sort(function (a, b) { return a[0] - b[0]; });

    var get_parent = function (p) {
        if (parents[p] != p) {
            parents[p] = get_parent(parents[p]);
        }
        return parents[p];
    };
    var tree_edges = [];
    for (var i = 0; i < edges.length; i++) {
        var p1 = edges[i][1];
        var p2 = edges[i][2];
        if (get_parent(p1) == get_parent(p2)) {
        } else {
            parents[get_parent(p1)] = get_parent(p2);
            tree_edges.push([p1, p2]);
        }
    }
    return tree_edges;
}

function CreateBubbleSet(g, defs, width, height, color, opacity, sigma) {
    if (sigma === undefined) sigma = 10;

    var o = {};
    var filter_id = "bubbleset-" + guid();
    var filter = defs.append("filter")
        .attr("id", filter_id);
    filter.append("feGaussianBlur")
        .attr("in", "SourceAlpha")
        .attr("stdDeviation", sigma);

    var gaussian_max = 1.0;
    var threshold = 0.1;
    var slope = 50;

    var tr = filter.append("feComponentTransfer");
    tr.append("feFuncA").attr("type", "linear").attr("intercept", -threshold * slope + 0.5).attr("slope", slope / gaussian_max);

    var tr = filter.append("feComponentTransfer");
    tr.append("feFuncR").attr("type", "linear").attr("intercept", color.r / 255.0).attr("slope", 0);
    tr.append("feFuncG").attr("type", "linear").attr("intercept", color.g / 255.0).attr("slope", 0);
    tr.append("feFuncB").attr("type", "linear").attr("intercept", color.b / 255.0).attr("slope", 0);
    tr.append("feFuncA").attr("type", "table").attr("tableValues", "0 " + opacity);


    var bbox = g.node().getBBox();
    filter.attr("filterUnits", "userSpaceOnUse");
    var margin = 40;
    filter.attr("x", 0 - margin);
    filter.attr("y", 0 - margin);
    filter.attr("width", width + margin * 2);
    filter.attr("height", height + margin * 2);

    g.style("filter", "url(#" + filter_id + ")");

    var elements = g.selectAll(":not(g)");
    var g_lines = g.append("g");

    o.update = function () {
        var nodes = [];
        elements.each(function (d) {
            var bbox = this.getBBox();
            var x = bbox.x + bbox.width / 2;
            var y = bbox.y + bbox.height / 2;
            nodes.push([x, y]);
        });
        var mst = minimalSpanningTree(nodes);
        var lines = g_lines.selectAll("line").data(mst);
        lines.enter().append("line")
            .style("stroke", "black")
            .style("stroke-width", 3)
            .style("stroke-linecap", "round")
            .merge(lines)
            .attr("x1", function (d) { return nodes[d[0]][0]; })
            .attr("y1", function (d) { return nodes[d[0]][1]; })
            .attr("x2", function (d) { return nodes[d[1]][0]; })
            .attr("y2", function (d) { return nodes[d[1]][1]; })

        lines.exit().remove();
    };
    o.update();
    return o;
};

function PeopleIndex(people) {
    var self = this;
    this.name2people = {};
    people.forEach(function (p) {
        self.name2people[p.name] = p;
    });
}

PeopleIndex.prototype.get = function (name) {
    if (this.name2people[name]) return this.name2people[name];
    return {
        display: name,
        name: name
    };
}

function ResearchAreasListView(container, dataset) {
    let research_areas = { areas: dataset.areas, projects: dataset.projects };
    let people = dataset.people;
    people = new PeopleIndex(people);
    container.classed("research-areas-list-view", true);
    container.classed("group", true);
    var left = container.append("div").classed("research-areas-areas", true);
    var right = container.append("div").classed("research-areas-projects", true);

    var area_li = left.append("ul").selectAll("li").data([{ name: "ALL", display: "(all)" }].concat(research_areas.areas)).enter().append("li")
    area_li.classed("active", function (a) { return a.name == "ALL"; });
    area_li.append("a")
        .text(function (area) { return area.display; })
        .attr("href", "#")
        .on("click", function (area) {
            project_li.style("display", function (p) {
                return (p.areas.indexOf(area.name) >= 0 || area.name == "ALL") ? "flex" : "none";
            });
            area_li.classed("active", function (a) {
                return a == area;
            });
            d3.event.preventDefault();
            return false;
        });

    var project_li = right.append("ul").selectAll("li").data(research_areas.projects).enter().append("li");
    var project_image = project_li.append("div").classed("image", true).style("background-image", function (p) { return "url(" + baseurl + "/assets/images/projects/" + (p.image || "default.jpg") + ")"; });
    var project_content = project_li.append("div").classed("content", true);
    project_content.append("strong").text(function (p) { return p.display; });
    project_content.append("br");
    project_content.append("span").text(function (p) {
        return p.people.map(function (people) { return people.display; }).join(", ");
    });
}

function ResearchAreasGraphView(container, dataset) {
    let research_areas = { areas: dataset.areas, projects: dataset.projects };
    let people = dataset.people;
    // people = new PeopleIndex(people);
    container.classed("research-areas-graph-view", true);
    var width = container.node().getBoundingClientRect().width;
    var height = 500;
    var svg = container.append("svg");
    svg.attr("width", width).attr("height", height);

    var tip = d3.tip()
        .attr('class', 'd3-tip')
        .offset([-10, 0])
        .html(function (d) {
            return d.display;
        })
    svg.call(tip);

    var defs = svg.append("defs");

    var color = d3.scaleOrdinal(d3.schemeCategory10);

    var symbolCircle = d3.symbol().type(d3.symbolCircle);
    var symbolSquare = d3.symbol().type(d3.symbolSquare);
    var symbolStar = d3.symbol().type(d3.symbolStar);

    var simulation = d3.forceSimulation()
        .force("link", d3.forceLink().id(function (d) { return d.id; }).strength(1))
        .force("charge", d3.forceManyBody())
        .force("centerX", d3.forceX(width / 2))
        .force("centerY", d3.forceY(height / 2).strength(0.15));

    var nodes = [];
    var area_to_node = {};
    var project_to_node = {};
    var people_to_node = {};
    var people_used = {};
    nodes = nodes.concat(research_areas.areas.map(function (area) {
        return area_to_node[area.name] = {
            type: "area",
            display: area.display,
            area: area
        };
    }));
    nodes = nodes.concat(research_areas.projects.map(function (project) {
        project.people.forEach(function (p) {
            people_used[p.name] = true;
        });
        return project_to_node[project.display] = {
            type: "project",
            display: project.display,
            project: project
        };
    }));
    nodes = nodes.concat(people.filter(function (p) { return people_used[p.name]; }).map(function (people) {
        return people_to_node[people.name] = {
            type: "people",
            display: people.display,
            people: people
        };
    }));

    var links = [];
    research_areas.projects.forEach(function (p) {
        p.areas.forEach(function (area) {
            links.push({
                source: project_to_node[p.display],
                target: area_to_node[area],
            });
        });
        p.people.forEach(function (people) {
            links.push({
                source: project_to_node[p.display],
                target: people_to_node[people.name],
            });
        });
    });

    // Compute the degree of nodes
    nodes.forEach(function (n) { n.degree = 0; });
    links = links.filter(function(e) { return e.source != null && e.target != null; });
    links.forEach(function (e) { e.source.degree += 1; e.target.degree += 1 });

    var backlayer = svg.append("g");

    var link = svg.append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(links)
        .enter().append("line")
        .style("stroke", "rgba(0, 0, 0, 0.2)")
        .attr("stroke-width", 1);

    var node = svg.append("g")
        .attr("class", "nodes")
        .selectAll("path")
        .data(nodes)
        .enter().append("path")
        .attr("d", function (d) {
            if (d.type == "area") return symbolStar();
            if (d.type == "project") return symbolSquare();
            if (d.type == "people") return symbolCircle.size(Math.sqrt(d.degree) * 50)();
        })
        .style("cursor", "pointer")
        .attr("fill", function (d) { return d.area ? color(d.area.name) : (d.type == "people" ? "#444": "#888"); })
        .attr("stroke", "white")
        .attr("stroke-linejoin", "round")
        .on('mouseover', tip.show)
        .on('mouseout', tip.hide)
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));


    simulation
        .nodes(nodes);

    simulation.force("link")
        .links(links);

    // simulation.stop();
    // for (var i = 0, n = Math.ceil(Math.log(simulation.alphaMin()) / Math.log(1 - simulation.alphaDecay())); i < n; ++i) {
    //     simulation.tick();
    // }

    var bubblesets = research_areas.areas.map(function (area) {
        var g = backlayer.append("g");
        var back_circles = g.selectAll("circle").data(nodes.filter(function (n) {
            return (n.type == "project" && n.project.areas.indexOf(area.name) >= 0) ||
                (n.type == "area" && n.area.name == area.name);
        }));
        back_circles = back_circles.enter().append("circle").style("fill", "black").attr("r", 10);
        var c = color(area.name);
        var bubbleset = CreateBubbleSet(g, defs, width, height, d3.rgb(c), 0.3, 10);
        return {
            items: back_circles,
            update: function () { bubbleset.update(); }
        }
    });

    function ticked() {
        link
            .attr("x1", function (d) { return d.source.x; })
            .attr("y1", function (d) { return d.source.y; })
            .attr("x2", function (d) { return d.target.x; })
            .attr("y2", function (d) { return d.target.y; });

        bubblesets.forEach(function (back_circles) {
            back_circles.items
                .attr("cx", function (d) { return d.x; })
                .attr("cy", function (d) { return d.y; })
            back_circles.update()
        });

        node
            .attr("transform", function (d) { return "translate(" + d.x + "," + d.y + ")"; })
    }

    simulation.on("tick", ticked);

    function dragstarted(d) {
        if (!d3.event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(d) {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
    }

    function dragended(d) {
        if (!d3.event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }
}