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
            var newMin = Math.min(yearMin, yearMax);
            var newMax = Math.max(yearMin, yearMax);
            if (newMin != this.yearMin || newMax != this.yearMax) {
                this.yearMin = newMin;
                this.yearMax = newMax;
                this.emitEvent();
            }
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
    var YearsView = (function () {
        function YearsView(container, store) {
            var div = container.append("div").classed("research-areas-years", true);
            var minYear = d3.min(store.dataset.projects, function (x) { return x.year; });
            var maxYear = d3.max(store.dataset.projects, function (x) { return x.year; });
            var svg = div.append("svg");
            var width = 600;
            var height = 30;
            var y0 = 10;
            svg.attr("width", width).attr("height", height);
            var scale = d3.scaleLinear().domain([minYear, maxYear]).range([20, width - 20]);
            svg.append("g").attr("transform", "translate(0, 10)").call(d3.axisBottom(scale).tickFormat(d3.format("d")).tickSize(8));
            var lineg = svg.append("line").attr("y1", y0).attr("y2", y0);
            var line = svg.append("line").attr("y1", y0).attr("y2", y0);
            var c1 = svg.append("circle").attr("cy", y0).attr("r", 6);
            var c2 = svg.append("circle").attr("cy", y0).attr("r", 6);
            var c1g = svg.append("circle").attr("cy", y0).attr("r", 15);
            var c2g = svg.append("circle").attr("cy", y0).attr("r", 15);
            c1.style("fill", "#EEE").style("stroke", "#000").style("pointer-events", "none");
            c2.style("fill", "#EEE").style("stroke", "#000").style("pointer-events", "none");
            c1g.style("fill", "none").style("stroke", "none").style("cursor", "pointer").style("pointer-events", "all");
            c2g.style("fill", "none").style("stroke", "none").style("cursor", "pointer").style("pointer-events", "all");
            lineg.style("stroke", "none").style("cursor", "pointer").style("stroke-width", 15).style("pointer-events", "all");
            line.style("stroke", "#000").style("pointer-events", "none");
            line.style("stroke-width", 3);
            var update = function () {
                c1.attr("cx", scale(store.yearMin));
                c2.attr("cx", scale(store.yearMax));
                line.attr("x1", scale(store.yearMin));
                line.attr("x2", scale(store.yearMax));
                c1g.attr("cx", scale(store.yearMin));
                c2g.attr("cx", scale(store.yearMax));
                lineg.attr("x1", scale(store.yearMin));
                lineg.attr("x2", scale(store.yearMax));
            };
            var dxTotal = 0;
            var year0 = 0;
            var year1 = 0;
            c1g.call(d3.drag()
                .on("start", function () {
                dxTotal = 0;
                year0 = store.yearMin;
                year1 = store.yearMax;
            })
                .on("drag", function () {
                dxTotal += d3.event.dx;
                var newYear = Math.min(maxYear, Math.max(minYear, Math.round(scale.invert(scale(year0) + dxTotal))));
                store.setYearRange(newYear, year1);
            }));
            c2g.call(d3.drag()
                .on("start", function () {
                dxTotal = 0;
                year0 = store.yearMin;
                year1 = store.yearMax;
            })
                .on("drag", function () {
                dxTotal += d3.event.dx;
                var newYear = Math.min(maxYear, Math.max(minYear, Math.round(scale.invert(scale(year1) + dxTotal))));
                store.setYearRange(year0, newYear);
            }));
            lineg.call(d3.drag()
                .on("start", function () {
                dxTotal = 0;
                year0 = store.yearMin;
                year1 = store.yearMax;
            })
                .on("drag", function () {
                dxTotal += d3.event.dx;
                var n1 = Math.min(maxYear, Math.max(minYear, Math.round(scale.invert(scale(year0) + dxTotal))));
                var n2 = Math.min(maxYear, Math.max(minYear, Math.round(scale.invert(scale(year1) + dxTotal))));
                store.setYearRange(n1, n2);
            }));
            update();
            store.addListener(update);
        }
        return YearsView;
    }());
    ilab.YearsView = YearsView;
    var ResearchAreasGraphView = (function () {
        function ResearchAreasGraphView(container, store) {
            var _this = this;
            this.store = store;
            var areas = store.dataset.areas;
            var projects = store.dataset.projects;
            var people = new PeopleIndex(store.dataset.people);
            this.buildNodes();
            this.buildLinks();
            container.append("div").classed("research-areas-graph-view", true);
            // Setup SVG
            var width = container.node().getBoundingClientRect().width;
            var height = 500;
            var svg = container.append("svg");
            svg.attr("width", width).attr("height", height);
            var defs = svg.append("defs");
            // Tooltip
            var tip = d3.tip()
                .attr('class', 'd3-tip')
                .offset([-10, 0])
                .html(function (d) {
                return d.display;
            });
            svg.call(tip);
            // Color scale
            var color = d3.scaleOrdinal(d3.schemeCategory10);
            // Symbols
            var symbolCircle = d3.symbol().type(d3.symbolCircle);
            var symbolSquare = d3.symbol().type(d3.symbolSquare);
            var symbolStar = d3.symbol().type(d3.symbolStar);
            var backlayer = svg.append("g");
            var gLinks = svg.append("g").attr("class", "links");
            var gNodes = svg.append("g").attr("class", "nodes");
            var sLink = null;
            var sNode = null;
            var degreeToArea = function (d) {
                return Math.PI * 4 + d.weight * 20;
            };
            sNode = gNodes
                .selectAll("circle")
                .data(this.nodes)
                .enter().append("g");
            sNode.append("circle")
                .attr("cx", 0).attr("cy", 0)
                .attr("r", function (d) { return Math.sqrt(degreeToArea(d) / Math.PI); })
                .style("cursor", "pointer")
                .attr("fill", function (d) { return d.type == "area" ? color(d.area.name) : (d.type == "people" ? color(d.people.role) : "transparent"); })
                .attr("stroke", "white")
                .attr("stroke-linejoin", "round")
                .on('mouseover', tip.show)
                .on('mouseout', tip.hide);
            var toAddImage = sNode.filter(function (d) { return d.people.role == "faculty" || d.people.role == "research_scientist"; });
            toAddImage.append("clipPath")
                .attr("id", function (d) { return d.id; })
                .append("circle");
            toAddImage.append("image")
                .style("pointer-events", "none")
                .style("clip-path", function (d) { return ("url(#" + d.id + ")"); })
                .attr("xlink:href", function (d) { return "/assets/images/people/" + d.people.photo; });
            var simulation = d3.forceSimulation()
                .force("link", d3.forceLink(this.links).strength(function (d) { return Math.sqrt(d.weight) * 0.5; }))
                .force("collide", d3.forceCollide(function (d) { return Math.sqrt(degreeToArea(d) / Math.PI); }))
                .force("charge", d3.forceManyBody().strength(-40))
                .force("centerX", d3.forceX(width / 2).strength(0.07))
                .force("centerY", d3.forceY(height / 2).strength(0.09));
            simulation.nodes(this.nodes);
            var ticked = function () {
                sLink
                    .attr("x1", function (d) { return d.source.x; })
                    .attr("y1", function (d) { return d.source.y; })
                    .attr("x2", function (d) { return d.target.x; })
                    .attr("y2", function (d) { return d.target.y; });
                sNode
                    .attr("transform", function (d) { return ("translate(" + d.x.toFixed(6) + "," + d.y.toFixed(6) + ")"); });
            };
            var dragstarted = function (d) {
                if (!d3.event.active)
                    simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            };
            var dragged = function (d) {
                d.fx = d3.event.x;
                d.fy = d3.event.y;
            };
            var dragended = function (d) {
                if (!d3.event.active)
                    simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            };
            sNode.call(d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended));
            var update = function () {
                _this.buildLinks();
                simulation.force("link", d3.forceLink(_this.links).strength(function (d) { return Math.sqrt(d.weight) * 0.5; }));
                sLink = gLinks
                    .selectAll("line")
                    .data(_this.links);
                sLink
                    .enter().append("line");
                sLink
                    .exit().remove();
                sLink = gLinks
                    .selectAll("line")
                    .data(_this.links)
                    .style("stroke", "rgba(0, 0, 0, 0.2)")
                    .attr("stroke-width", function (d) { return Math.sqrt(d.weight) * 2; });
                ticked();
                simulation.alpha(0.8);
                simulation.restart();
                sNode.select("circle").attr("r", function (d) { return Math.sqrt(degreeToArea(d) / Math.PI); });
                sNode.select("clipPath").select("circle").attr("r", function (d) { return Math.sqrt(degreeToArea(d) / Math.PI); });
                sNode.select("image")
                    .attr("height", function (d) { return 2 * Math.sqrt(degreeToArea(d) / Math.PI); })
                    .attr("width", function (d) { return 2 * Math.sqrt(degreeToArea(d) / Math.PI); })
                    .attr("x", function (d) { return -Math.sqrt(degreeToArea(d) / Math.PI); })
                    .attr("y", function (d) { return -Math.sqrt(degreeToArea(d) / Math.PI); });
            };
            this.store.addListener(update);
            simulation.on("tick", ticked);
            update();
        }
        ResearchAreasGraphView.prototype.buildNodes = function () {
            var _this = this;
            this.name2Node = {};
            // People nodes
            this.nodes = this.store.dataset.people.map(function (people) {
                return _this.name2Node[people.name] = {
                    id: "P" + Math.random().toFixed(16).slice(3),
                    type: "people",
                    people: people,
                    display: people.display
                };
            });
        };
        ResearchAreasGraphView.prototype.buildLinks = function () {
            var _this = this;
            var isAllAreasSelected = this.store.isAllResearchAreasSelected();
            var projects = this.store.dataset.projects.filter(function (p) {
                if (p.year >= _this.store.yearMin && p.year <= _this.store.yearMax) {
                    return isAllAreasSelected || p.areas.some(function (area) { return _this.store.isResearchAreaSelected(area); });
                }
                else {
                    return false;
                }
            });
            // Links
            this.links = [];
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
                this.links.push({
                    source: this.name2Node[p1],
                    target: this.name2Node[p2],
                    weight: count
                });
            }
            // Compute the degree of nodes
            for (var _f = 0, _g = this.nodes; _f < _g.length; _f++) {
                var n = _g[_f];
                n.weight = 0;
            }
            for (var _h = 0, projects_2 = projects; _h < projects_2.length; _h++) {
                var p = projects_2[_h];
                for (var _j = 0, _k = p.people; _j < _k.length; _j++) {
                    var person = _k[_j];
                    this.name2Node[person].weight += 1;
                }
            }
        };
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
