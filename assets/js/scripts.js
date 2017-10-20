var ilab;
(function (ilab) {
    function CreateBubbleSet(g, defs, width, height, color, opacity, sigma) {
        if (sigma === undefined)
            sigma = 10;
        var o = {};
        var filter_id = "bubbleset-" + ilab.guid();
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
                nodes.push({ x: x, y: y });
            });
            var mst = ilab.minimalSpanningTree(nodes);
            var lines = g_lines.selectAll("line").data(mst);
            lines.enter().append("line")
                .style("stroke", "black")
                .style("stroke-width", 3)
                .style("stroke-linecap", "round")
                .merge(lines)
                .attr("x1", function (d) { return nodes[d[0]].x; })
                .attr("y1", function (d) { return nodes[d[0]].y; })
                .attr("x2", function (d) { return nodes[d[1]].x; })
                .attr("y2", function (d) { return nodes[d[1]].y; });
            lines.exit().remove();
        };
        o.update();
        return o;
    }
    ilab.CreateBubbleSet = CreateBubbleSet;
    ;
})(ilab || (ilab = {}));
var ilab;
(function (ilab) {
    var PeopleIndex = (function () {
        function PeopleIndex(people) {
            this.name2People = {};
            for (var _i = 0, people_1 = people; _i < people_1.length; _i++) {
                var person = people_1[_i];
                this.name2People[person.name] = person;
            }
        }
        PeopleIndex.prototype.get = function (name) {
            if (this.name2People[name])
                return this.name2People[name];
            return {
                display: name,
                name: name,
                role: "external"
            };
        };
        return PeopleIndex;
    }());
    ilab.PeopleIndex = PeopleIndex;
    var ViewStateStore = (function () {
        function ViewStateStore(dataset) {
            this.listeners = [];
            this.dataset = dataset;
            this.selectedPeople = null;
            this.selectedResearchAreas = dataset.areas.map(function (a) { return a.name; });
            this.yearMin = d3.min(dataset.projects, function (x) { return x.year; });
            this.yearMax = d3.max(dataset.projects, function (x) { return x.year; });
        }
        ViewStateStore.prototype.addListener = function (f) {
            this.listeners.push(f);
        };
        ViewStateStore.prototype.setYearRange = function (yearMin, yearMax) {
            this.yearMin = yearMin;
            this.yearMax = yearMax;
            this.emitEvent();
        };
        ViewStateStore.prototype.selectPeople = function (person) {
            this.selectedPeople = person;
            this.emitEvent();
        };
        ViewStateStore.prototype.selectResearchArea = function (area) {
            if (this.selectedResearchAreas.indexOf(area) < 0) {
                this.selectedResearchAreas.push(area);
                this.emitEvent();
            }
        };
        ViewStateStore.prototype.setSelectedResearchAreas = function (areas) {
            this.selectedResearchAreas = areas;
            this.emitEvent();
        };
        ViewStateStore.prototype.isResearchAreaSelected = function (area) {
            return this.selectedResearchAreas.indexOf(area) >= 0;
        };
        ViewStateStore.prototype.isAllResearchAreasSelected = function () {
            var _this = this;
            return this.dataset.areas.every(function (x) { return _this.isResearchAreaSelected(x.name); });
        };
        ViewStateStore.prototype.deselectResearchArea = function (area) {
            var idx = this.selectedResearchAreas.indexOf(area);
            if (idx >= 0) {
                this.selectedResearchAreas.splice(idx, 1);
                this.emitEvent();
            }
        };
        ViewStateStore.prototype.selectAllResearchAreas = function () {
            this.selectedResearchAreas = this.dataset.areas.map(function (a) { return a.name; });
            this.emitEvent();
        };
        ViewStateStore.prototype.emitEvent = function () {
            this.listeners.forEach(function (f) { return f(); });
        };
        return ViewStateStore;
    }());
    ilab.ViewStateStore = ViewStateStore;
    var ResearchAreasView = (function () {
        function ResearchAreasView(container, store) {
            var _this = this;
            var div = container.append("div").classed("research-areas-areas", true);
            var ul = div.append("ul");
            var area_li = ul.selectAll("li").data([{ name: "ALL", display: "(all)" }].concat(store.dataset.areas));
            area_li.enter()
                .append("li")
                .append("a")
                .text(function (area) { return area.display; })
                .attr("href", "#")
                .on("click", function (area) {
                if (area.name == "ALL") {
                    store.selectAllResearchAreas();
                }
                else {
                    if (store.isAllResearchAreasSelected() || !d3.event.shiftKey) {
                        store.setSelectedResearchAreas([area.name]);
                    }
                    else {
                        if (store.isResearchAreaSelected(area.name)) {
                            store.deselectResearchArea(area.name);
                        }
                        else {
                            store.selectResearchArea(area.name);
                        }
                    }
                }
                d3.event.preventDefault();
                return false;
            });
            area_li = ul.selectAll("li").data([{ name: "ALL", display: "(all)" }].concat(store.dataset.areas));
            this.liSelection = area_li;
            this.store = store;
            this.update();
            store.addListener(function () { return _this.update(); });
        }
        ResearchAreasView.prototype.update = function () {
            var _this = this;
            this.liSelection.classed("active", function (a) {
                if (a.name == "ALL") {
                    return _this.store.dataset.areas.every(function (x) { return _this.store.isResearchAreaSelected(x.name); });
                }
                else {
                    return _this.store.isResearchAreaSelected(a.name);
                }
            });
        };
        return ResearchAreasView;
    }());
    ilab.ResearchAreasView = ResearchAreasView;
    var ProjectsView = (function () {
        function ProjectsView(container, baseurl, store) {
            var _this = this;
            var div = container.append("div").classed("research-areas-projects", true);
            this.ul = div.append("ul");
            var people = new PeopleIndex(store.dataset.people);
            this.people = people;
            this.store = store;
            this.baseurl = baseurl;
            this.update();
            store.addListener(function () { return _this.update(); });
        }
        ProjectsView.prototype.update = function () {
            var _this = this;
            var isAllAreasSelected = this.store.isAllResearchAreasSelected();
            var project_li = this.ul.selectAll("li").data(this.store.dataset.projects.filter(function (p) {
                if (p.year >= _this.store.yearMin && p.year <= _this.store.yearMax) {
                    return isAllAreasSelected || p.areas.some(function (area) { return _this.store.isResearchAreaSelected(area); });
                }
                else {
                    return false;
                }
            }));
            var project_li_enter = project_li.enter().append("li");
            project_li_enter.append("div").classed("image", true).style("background-image", function (p) { return ("url(" + _this.baseurl + "/assets/images/projects/" + (p.image || "default.jpg") + ")"); });
            var project_content_enter = project_li_enter.append("div").classed("content", true);
            project_content_enter.append("strong").text(function (p) { return p.display; });
            project_content_enter.append("br");
            project_content_enter.append("span").text(function (p) {
                return p.people.map(function (name) { return _this.people.get(name).display; }).join(", ");
            });
            project_li.exit().remove();
        };
        return ProjectsView;
    }());
    ilab.ProjectsView = ProjectsView;
    var ResearchAreasGraphView = (function () {
        function ResearchAreasGraphView(container, store) {
            this.store = store;
            var areas = store.dataset.areas;
            var projects = store.dataset.projects;
            var people = new PeopleIndex(store.dataset.people);
            container.append("div").classed("research-areas-graph-view", true);
            var width = container.node().getBoundingClientRect().width;
            var height = 500;
            var svg = container.append("svg");
            svg.attr("width", width).attr("height", height);
            var tip = d3.tip()
                .attr('class', 'd3-tip')
                .offset([-10, 0])
                .html(function (d) {
                return d.display;
            });
            svg.call(tip);
            var defs = svg.append("defs");
            var color = d3.scaleOrdinal(d3.schemeCategory10);
            var symbolCircle = d3.symbol().type(d3.symbolCircle);
            var symbolSquare = d3.symbol().type(d3.symbolSquare);
            var symbolStar = d3.symbol().type(d3.symbolStar);
            var nodes = [];
            var people_to_node = {};
            var people_used = {};
            nodes = nodes.concat(store.dataset.people.filter(function (p) { return true; }).map(function (people) {
                return people_to_node[people.name] = {
                    type: "people",
                    people: people,
                    display: people.display
                };
            }));
            var links = [];
            var linkCounter = {};
            for (var _i = 0, projects_1 = projects; _i < projects_1.length; _i++) {
                var project = projects_1[_i];
                for (var _a = 0, _b = project.people; _a < _b.length; _a++) {
                    var p1 = _b[_a];
                    for (var _c = 0, _d = project.people; _c < _d.length; _c++) {
                        var p2 = _d[_c];
                        if (p2 >= p1)
                            continue;
                        var w = 1 / (project.people.length * (project.people.length - 1) / 2);
                        var key = JSON.stringify([p1, p2]);
                        if (linkCounter[key] == null) {
                            linkCounter[key] = w;
                        }
                        else {
                            linkCounter[key] += w;
                        }
                    }
                }
            }
            for (var key in linkCounter) {
                var count = linkCounter[key];
                var _e = JSON.parse(key), p1 = _e[0], p2 = _e[1];
                links.push({
                    source: people_to_node[p1],
                    target: people_to_node[p2],
                    weight: count
                });
            }
            // Compute the degree of nodes
            nodes.forEach(function (n) { n.degree = 0; });
            for (var _f = 0, projects_2 = projects; _f < projects_2.length; _f++) {
                var p = projects_2[_f];
                for (var _g = 0, _h = p.people; _g < _h.length; _g++) {
                    var person = _h[_g];
                    people_to_node[person].degree += 1;
                }
            }
            var backlayer = svg.append("g");
            var link = svg.append("g")
                .attr("class", "links")
                .selectAll("line")
                .data(links)
                .enter().append("line")
                .style("stroke", "rgba(0, 0, 0, 0.2)")
                .attr("stroke-width", function (d) { return Math.sqrt(d.weight); });
            var degreeToArea = function (degree) {
                return Math.PI * 16 + degree * 10;
            };
            var node = svg.append("g")
                .attr("class", "nodes")
                .selectAll("path")
                .data(nodes)
                .enter().append("path")
                .attr("d", function (d) {
                if (d.type == "area")
                    return symbolStar();
                if (d.type == "project")
                    return symbolSquare();
                if (d.type == "people")
                    return symbolCircle.size(degreeToArea(d.degree))();
            })
                .style("cursor", "pointer")
                .attr("fill", function (d) { return d.type == "area" ? color(d.area.name) : (d.type == "people" ? color(d.people.role) : "transparent"); })
                .attr("stroke", "white")
                .attr("stroke-linejoin", "round")
                .on('mouseover', tip.show)
                .on('mouseout', tip.hide)
                .call(d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended));
            var simulation = d3.forceSimulation()
                .force("link", d3.forceLink(links).strength(function (d) { return Math.sqrt(d.weight) * 0.5; }))
                .force("collide", d3.forceCollide(function (d) { return Math.sqrt(degreeToArea(d.degree) / Math.PI); }))
                .force("charge", d3.forceManyBody().strength(-40))
                .force("centerX", d3.forceX(width / 2).strength(0.07))
                .force("centerY", d3.forceY(height / 2).strength(0.09));
            simulation.nodes(nodes);
            var bubblesets = areas.map(function (area) {
                var g = backlayer.append("g");
                var back_circles = g.selectAll("circle").data(nodes.filter(function (n) {
                    return (n.type == "project" && n.project.areas.indexOf(area.name) >= 0) ||
                        (n.type == "area" && n.area.name == area.name);
                }));
                back_circles = back_circles.enter().append("circle").style("fill", "black").attr("r", 10);
                var c = color(area.name);
                var bubbleset = ilab.CreateBubbleSet(g, defs, width, height, d3.rgb(c), 0.3, 10);
                return {
                    items: back_circles,
                    update: function () { bubbleset.update(); }
                };
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
                        .attr("cy", function (d) { return d.y; });
                    back_circles.update();
                });
                node
                    .attr("transform", function (d) { return "translate(" + d.x + "," + d.y + ")"; });
            }
            simulation.on("tick", ticked);
            function dragstarted(d) {
                if (!d3.event.active)
                    simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            }
            function dragged(d) {
                d.fx = d3.event.x;
                d.fy = d3.event.y;
            }
            function dragended(d) {
                if (!d3.event.active)
                    simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            }
        }
        return ResearchAreasGraphView;
    }());
    ilab.ResearchAreasGraphView = ResearchAreasGraphView;
})(ilab || (ilab = {}));
var ilab;
(function (ilab) {
    var ChartDataset = (function () {
        function ChartDataset(people, areas, publications) {
            var peopleCache = {};
            people.forEach(function (people) {
                peopleCache[people.name] = people;
            });
            function getPeople(name) {
                if (peopleCache.hasOwnProperty(name)) {
                    return peopleCache[name];
                }
                else {
                    return peopleCache[name] = { name: name, display: name, role: "external" };
                }
            }
            var resultProjects = [];
            publications.forEach(function (pub) {
                var project = {
                    display: pub.title,
                    year: pub.year,
                    areas: pub.areas ? pub.areas : [],
                    people: pub.authors.map(getPeople).map(function (x) { return x.name; })
                };
                resultProjects.push(project);
            });
            var resultPeople = [];
            for (var name_1 in peopleCache) {
                if (peopleCache.hasOwnProperty(name_1)) {
                    resultPeople.push(peopleCache[name_1]);
                }
            }
            resultProjects.sort(function (a, b) {
                return b.year - a.year;
            });
            this.projects = resultProjects;
            this.areas = areas;
            this.people = resultPeople;
        }
        return ChartDataset;
    }());
    ilab.ChartDataset = ChartDataset;
})(ilab || (ilab = {}));
var ilab;
(function (ilab) {
    function guid() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
            s4() + '-' + s4() + s4() + s4();
    }
    ilab.guid = guid;
    function pointPointDistance(a, b) {
        return Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
    }
    ilab.pointPointDistance = pointPointDistance;
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
            }
            else {
                parents[get_parent(p1)] = get_parent(p2);
                tree_edges.push([p1, p2]);
            }
        }
        return tree_edges;
    }
    ilab.minimalSpanningTree = minimalSpanningTree;
})(ilab || (ilab = {}));
