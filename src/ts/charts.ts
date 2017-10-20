namespace ilab {
    export type Dictionary<ValueType> = { [name: string]: ValueType };
    export type D3Selection<ElementType extends Element> = d3.Selection<ElementType, any, any, any>;

    export class PeopleIndex {
        private name2People: Dictionary<Person> = {};

        constructor(people: Person[]) {
            for (let person of people) {
                this.name2People[person.name] = person;
            }
        }

        public get(name: string): Person {
            if (this.name2People[name]) return this.name2People[name];
            return {
                display: name,
                name: name,
                role: "external"
            };
        }
    }

    export class ViewStateStore {
        public dataset: ChartDataset;
        public selectedResearchAreas: string[];
        public selectedPeople: string;
        public yearMin: number;
        public yearMax: number;

        private listeners: (() => void)[] = [];

        constructor(dataset: ChartDataset) {
            this.dataset = dataset;
            this.selectedPeople = null;
            this.selectedResearchAreas = dataset.areas.map(a => a.name);
            this.yearMin = d3.min(dataset.projects, x => x.year);
            this.yearMax = d3.max(dataset.projects, x => x.year);
        }

        public addListener(f: () => void) {
            this.listeners.push(f);
        }

        public setYearRange(yearMin: number, yearMax: number) {
            this.yearMin = yearMin;
            this.yearMax = yearMax;
            this.emitEvent();
        }

        public selectPeople(person: string) {
            this.selectedPeople = person;
            this.emitEvent();
        }

        public selectResearchArea(area: string) {
            if (this.selectedResearchAreas.indexOf(area) < 0) {
                this.selectedResearchAreas.push(area);
                this.emitEvent();
            }
        }

        public setSelectedResearchAreas(areas: string[]) {
            this.selectedResearchAreas = areas;
            this.emitEvent();
        }

        public isResearchAreaSelected(area: string) {
            return this.selectedResearchAreas.indexOf(area) >= 0;
        }

        public isAllResearchAreasSelected() {
            return this.dataset.areas.every(x => this.isResearchAreaSelected(x.name));
        }

        public deselectResearchArea(area: string) {
            let idx = this.selectedResearchAreas.indexOf(area);
            if (idx >= 0) {
                this.selectedResearchAreas.splice(idx, 1);
                this.emitEvent();
            }
        }

        public selectAllResearchAreas() {
            this.selectedResearchAreas = this.dataset.areas.map(a => a.name);
            this.emitEvent();
        }

        private emitEvent() {
            this.listeners.forEach(f => f());
        }
    }

    export class ResearchAreasView {
        liSelection: d3.Selection<any, ResearchArea, any, any>;
        store: ViewStateStore;

        constructor(container: D3Selection<HTMLDivElement>, store: ViewStateStore) {
            let div = container.append("div").classed("research-areas-areas", true);
            let ul = div.append("ul");
            let area_li = ul.selectAll("li").data([{ name: "ALL", display: "(all)" }].concat(store.dataset.areas));
            area_li.enter()
                .append("li")
                .append("a")
                .text(area => area.display)
                .attr("href", "#")
                .on("click", (area) => {
                    if (area.name == "ALL") {
                        store.selectAllResearchAreas();
                    } else {
                        if (store.isAllResearchAreasSelected() || !d3.event.shiftKey) {
                            store.setSelectedResearchAreas([area.name]);
                        } else {
                            if (store.isResearchAreaSelected(area.name)) {
                                store.deselectResearchArea(area.name);
                            } else {
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
            store.addListener(() => this.update());
        }

        public update() {
            this.liSelection.classed("active", (a) => {
                if (a.name == "ALL") {
                    return this.store.dataset.areas.every(x => this.store.isResearchAreaSelected(x.name));
                } else {
                    return this.store.isResearchAreaSelected(a.name);
                }
            });
        }
    }

    export class ProjectsView {
        baseurl: string;
        store: ViewStateStore;
        ul: D3Selection<HTMLUListElement>;
        people: PeopleIndex;

        constructor(container: D3Selection<HTMLDivElement>, baseurl: string, store: ViewStateStore) {
            let div = container.append("div").classed("research-areas-projects", true);
            this.ul = div.append("ul");
            let people = new PeopleIndex(store.dataset.people);
            this.people = people;
            this.store = store;
            this.baseurl = baseurl;
            this.update();
            store.addListener(() => this.update());
        }

        public update() {
            let isAllAreasSelected = this.store.isAllResearchAreasSelected();
            var project_li = this.ul.selectAll("li").data(this.store.dataset.projects.filter(p => {
                if (p.year >= this.store.yearMin && p.year <= this.store.yearMax) {
                    return isAllAreasSelected || p.areas.some(area => this.store.isResearchAreaSelected(area));
                } else {
                    return false;
                }
            }));
            let project_li_enter = project_li.enter().append("li");
            project_li_enter.append("div").classed("image", true).style("background-image", (p) => `url(${this.baseurl}/assets/images/projects/${p.image || "default.jpg"})`);
            let project_content_enter = project_li_enter.append("div").classed("content", true);
            project_content_enter.append("strong").text(p => p.display);
            project_content_enter.append("br");
            project_content_enter.append("span").text(p => {
                return p.people.map((name) => this.people.get(name).display).join(", ");
            });
            project_li.exit().remove();
        }
    }

    export interface GraphNode {
        type: string;
        display: string;
        area?: ResearchArea,
        project?: Project,
        people?: Person,
        degree?: number;

        x?: number; y?: number;
        fx?: number; fy?: number;
    }

    export class ResearchAreasGraphView {
        store: ViewStateStore;

        constructor(container: D3Selection<HTMLDivElement>, store: ViewStateStore) {
            this.store = store;
            let areas = store.dataset.areas;
            let projects = store.dataset.projects;
            let people = new PeopleIndex(store.dataset.people);

            container.append("div").classed("research-areas-graph-view", true);

            var width = container.node().getBoundingClientRect().width;
            var height = 500;
            var svg = container.append("svg");
            svg.attr("width", width).attr("height", height);


            var tip = (d3 as any).tip()
                .attr('class', 'd3-tip')
                .offset([-10, 0])
                .html(function (d: GraphNode) {
                    return d.display;
                })
            svg.call(tip);

            var defs = svg.append("defs");

            var color = d3.scaleOrdinal(d3.schemeCategory10);

            var symbolCircle = d3.symbol().type(d3.symbolCircle);
            var symbolSquare = d3.symbol().type(d3.symbolSquare);
            var symbolStar = d3.symbol().type(d3.symbolStar);

            var nodes: GraphNode[] = [];
            var people_to_node: Dictionary<GraphNode> = {};
            var people_used: { [name: string]: boolean } = {};

            nodes = nodes.concat(store.dataset.people.filter(function (p) { return true; }).map(function (people) {
                return people_to_node[people.name] = {
                    type: "people",
                    people: people,
                    display: people.display
                };
            }));

            var links: { source: GraphNode, target: GraphNode, weight: number }[] = [];

            var linkCounter: Dictionary<number> = {};
            for (let project of projects) {
                for (let p1 of project.people) {
                    for (let p2 of project.people) {
                        if (p2 >= p1) continue;
                        let w = 1 / (project.people.length * (project.people.length - 1) / 2);
                        let key = JSON.stringify([p1, p2]);
                        if (linkCounter[key] == null) {
                            linkCounter[key] = w;
                        } else {
                            linkCounter[key] += w;
                        }
                    }
                }
            }
            for (let key in linkCounter) {
                let count = linkCounter[key];
                let [p1, p2] = JSON.parse(key);
                links.push({
                    source: people_to_node[p1],
                    target: people_to_node[p2],
                    weight: count
                });
            }

            // Compute the degree of nodes
            nodes.forEach(function (n) { n.degree = 0; });
            for (let p of projects) {
                for (let person of p.people) {
                    people_to_node[person].degree += 1;
                }
            }

            let backlayer = svg.append("g");

            let link = svg.append("g")
                .attr("class", "links")
                .selectAll("line")
                .data(links)
                .enter().append("line")
                .style("stroke", "rgba(0, 0, 0, 0.2)")
                .attr("stroke-width", d => Math.sqrt(d.weight));

            let degreeToArea = (degree: number) => {
                return Math.PI * 16 + degree * 10;
            }

            let node = svg.append("g")
                .attr("class", "nodes")
                .selectAll("path")
                .data(nodes)
                .enter().append("path")
                .attr("d", function (d) {
                    if (d.type == "area") return symbolStar();
                    if (d.type == "project") return symbolSquare();
                    if (d.type == "people") return symbolCircle.size(degreeToArea(d.degree))();
                })
                .style("cursor", "pointer")
                .attr("fill", function (d) { return d.type == "area" ? color(d.area.name) : (d.type == "people" ? color(d.people.role) : "transparent"); })
                .attr("stroke", "white")
                .attr("stroke-linejoin", "round")
                .on('mouseover', tip.show)
                .on('mouseout', tip.hide)
                .call(d3.drag<any, any>()
                    .on("start", dragstarted)
                    .on("drag", dragged)
                    .on("end", dragended));


            let simulation = d3.forceSimulation<GraphNode>()
                .force("link", d3.forceLink(links).strength(d => Math.sqrt(d.weight) * 0.5))
                .force("collide", d3.forceCollide<GraphNode>(d => Math.sqrt(degreeToArea(d.degree) / Math.PI)))
                .force("charge", d3.forceManyBody().strength(-40))
                .force("centerX", d3.forceX(width / 2).strength(0.07))
                .force("centerY", d3.forceY(height / 2).strength(0.09));
            simulation.nodes(nodes)


            var bubblesets = areas.map(function (area) {
                var g = backlayer.append("g");
                var back_circles = g.selectAll("circle").data(nodes.filter(function (n) {
                    return (n.type == "project" && n.project.areas.indexOf(area.name) >= 0) ||
                        (n.type == "area" && n.area.name == area.name);
                }));
                back_circles = back_circles.enter().append("circle").style("fill", "black").attr("r", 10);
                var c = color(area.name);
                var bubbleset = CreateBubbleSet(g as D3Selection<SVGGElement>, defs as D3Selection<SVGDefsElement>, width, height, d3.rgb(c), 0.3, 10);
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

            function dragstarted(d: GraphNode) {
                if (!d3.event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            }

            function dragged(d: GraphNode) {
                d.fx = d3.event.x;
                d.fy = d3.event.y;
            }

            function dragended(d: GraphNode) {
                if (!d3.event.active) simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            }
        }
    }
}