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
            let newMin = Math.min(yearMin, yearMax);
            let newMax = Math.max(yearMin, yearMax);
            if (newMin != this.yearMin || newMax != this.yearMax) {
                this.yearMin = newMin;
                this.yearMax = newMax;
                this.emitEvent();
            }
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
            let project_li = this.ul.selectAll("li").data(this.store.dataset.projects.filter(p => {
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

    export class YearsView {
        years: number[];
        constructor(container: D3Selection<HTMLDivElement>, store: ViewStateStore) {
            let div = container.append("div").classed("research-areas-years", true);
            let minYear = d3.min(store.dataset.projects, x => x.year);
            let maxYear = d3.max(store.dataset.projects, x => x.year);

            let svg = div.append("svg");
            let width = 600;
            let height = 30;
            let y0 = 10;
            svg.attr("width", width).attr("height", height);

            let scale = d3.scaleLinear().domain([minYear, maxYear]).range([20, width - 20]);

            svg.append("g").attr("transform", "translate(0, 10)").call(d3.axisBottom(scale).tickFormat(d3.format("d")).tickSize(8));

            let lineg = svg.append("line").attr("y1", y0).attr("y2", y0);
            let line = svg.append("line").attr("y1", y0).attr("y2", y0);
            let c1 = svg.append("circle").attr("cy", y0).attr("r", 6);
            let c2 = svg.append("circle").attr("cy", y0).attr("r", 6);
            let c1g = svg.append("circle").attr("cy", y0).attr("r", 15);
            let c2g = svg.append("circle").attr("cy", y0).attr("r", 15);
            c1.style("fill", "#EEE").style("stroke", "#000").style("pointer-events", "none");
            c2.style("fill", "#EEE").style("stroke", "#000").style("pointer-events", "none");
            c1g.style("fill", "none").style("stroke", "none").style("cursor", "pointer").style("pointer-events", "all");
            c2g.style("fill", "none").style("stroke", "none").style("cursor", "pointer").style("pointer-events", "all");
            lineg.style("stroke", "none").style("cursor", "pointer").style("stroke-width", 15).style("pointer-events", "all");
            line.style("stroke", "#000").style("pointer-events", "none");
            line.style("stroke-width", 3)
            let update = () => {
                c1.attr("cx", scale(store.yearMin));
                c2.attr("cx", scale(store.yearMax));
                line.attr("x1", scale(store.yearMin));
                line.attr("x2", scale(store.yearMax));
                c1g.attr("cx", scale(store.yearMin));
                c2g.attr("cx", scale(store.yearMax));
                lineg.attr("x1", scale(store.yearMin));
                lineg.attr("x2", scale(store.yearMax));
            };
            let dxTotal = 0;
            let year0 = 0;
            let year1 = 0;
            c1g.call(d3.drag<any, any>()
                .on("start", () => {
                    dxTotal = 0;
                    year0 = store.yearMin;
                    year1 = store.yearMax;
                })
                .on("drag", () => {
                    dxTotal += d3.event.dx;
                    let newYear = Math.min(maxYear, Math.max(minYear, Math.round(scale.invert(scale(year0) + dxTotal))));
                    store.setYearRange(newYear, year1);
                })
            );
            c2g.call(d3.drag<any, any>()
                .on("start", () => {
                    dxTotal = 0;
                    year0 = store.yearMin;
                    year1 = store.yearMax;
                })
                .on("drag", () => {
                    dxTotal += d3.event.dx;
                    let newYear = Math.min(maxYear, Math.max(minYear, Math.round(scale.invert(scale(year1) + dxTotal))));
                    store.setYearRange(year0, newYear);
                })
            );

            lineg.call(d3.drag<any, any>()
                .on("start", () => {
                    dxTotal = 0;
                    year0 = store.yearMin;
                    year1 = store.yearMax;
                })
                .on("drag", () => {
                    dxTotal += d3.event.dx;
                    let n1 = Math.min(maxYear, Math.max(minYear, Math.round(scale.invert(scale(year0) + dxTotal))));
                    let n2 = Math.min(maxYear, Math.max(minYear, Math.round(scale.invert(scale(year1) + dxTotal))));
                    store.setYearRange(n1, n2);
                })
            );
            update();
            store.addListener(update);
        }
    }

    export interface GraphNode {
        id: string;
        type: string;
        display: string;
        area?: ResearchArea,
        project?: Project,
        people?: Person,
        weight?: number;

        x?: number; y?: number;
        fx?: number; fy?: number;
    }

    export interface GraphLink {
        source: GraphNode;
        target: GraphNode;
        weight: number;
    }

    export class ResearchAreasGraphView {
        store: ViewStateStore;

        nodes: GraphNode[];
        links: GraphLink[];
        name2Node: Dictionary<GraphNode>;

        private buildNodes() {
            this.name2Node = {};
            // People nodes
            this.nodes = this.store.dataset.people.map((people) => {
                return this.name2Node[people.name] = {
                    id: "P" + Math.random().toFixed(16).slice(3),
                    type: "people",
                    people: people,
                    display: people.display
                };
            });
        }

        private buildLinks() {
            let isAllAreasSelected = this.store.isAllResearchAreasSelected();
            let projects = this.store.dataset.projects.filter(p => {
                if (p.year >= this.store.yearMin && p.year <= this.store.yearMax) {
                    return isAllAreasSelected || p.areas.some(area => this.store.isResearchAreaSelected(area));
                } else {
                    return false;
                }
            });

            // Links
            this.links = [];
            let linkCounter: Dictionary<number> = {};
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
                this.links.push({
                    source: this.name2Node[p1],
                    target: this.name2Node[p2],
                    weight: count
                });
            }

            // Compute the degree of nodes
            for (let n of this.nodes) {
                n.weight = 0;
            }
            for (let p of projects) {
                for (let person of p.people) {
                    this.name2Node[person].weight += 1;
                }
            }
        }

        constructor(container: D3Selection<HTMLDivElement>, store: ViewStateStore) {
            this.store = store;
            let areas = store.dataset.areas;
            let projects = store.dataset.projects;
            let people = new PeopleIndex(store.dataset.people);

            this.buildNodes();
            this.buildLinks();

            container.append("div").classed("research-areas-graph-view", true);

            // Setup SVG
            let width = container.node().getBoundingClientRect().width;
            let height = 500;
            let svg = container.append("svg");
            svg.attr("width", width).attr("height", height);
            let defs = svg.append("defs");

            // Tooltip
            let tip = (d3 as any).tip()
                .attr('class', 'd3-tip')
                .offset([-10, 0])
                .html(function (d: GraphNode) {
                    return d.display;
                })
            svg.call(tip);

            // Color scale
            let color = d3.scaleOrdinal(d3.schemeCategory10);

            // Symbols
            let symbolCircle = d3.symbol().type(d3.symbolCircle);
            let symbolSquare = d3.symbol().type(d3.symbolSquare);
            let symbolStar = d3.symbol().type(d3.symbolStar);


            let backlayer = svg.append("g");

            let gLinks = svg.append("g").attr("class", "links");
            let gNodes = svg.append("g").attr("class", "nodes");

            let sLink: D3Selection<any> = null;
            let sNode: D3Selection<any> = null;

            let degreeToArea = (d: GraphNode) => {
                return Math.PI * 4 + d.weight * 20;
            }

            sNode = gNodes
                .selectAll("circle")
                .data(this.nodes)
                .enter().append("g");

            sNode.append("circle")
                .attr("cx", 0).attr("cy", 0)
                .attr("r", d => Math.sqrt(degreeToArea(d) / Math.PI))
                .style("cursor", "pointer")
                .attr("fill", function (d) { return d.type == "area" ? color(d.area.name) : (d.type == "people" ? color(d.people.role) : "transparent"); })
                .attr("stroke", "white")
                .attr("stroke-linejoin", "round")
                .on('mouseover', tip.show)
                .on('mouseout', tip.hide);

            let toAddImage = sNode.filter(d => d.people.role == "faculty" || d.people.role == "research_scientist")

            toAddImage.append("clipPath")
                .attr("id", d => d.id)
                .append("circle");

            toAddImage.append("image")
                .style("pointer-events", "none")
                .style("clip-path", d => `url(#${d.id})`)
                .attr("xlink:href", d => "/assets/images/people/" + d.people.photo);


            let simulation = d3.forceSimulation<GraphNode>()
                .force("link", d3.forceLink(this.links).strength(d => Math.sqrt(d.weight) * 0.5))
                .force("collide", d3.forceCollide<GraphNode>(d => Math.sqrt(degreeToArea(d) / Math.PI)))
                .force("charge", d3.forceManyBody().strength(-40))
                .force("centerX", d3.forceX(width / 2).strength(0.07))
                .force("centerY", d3.forceY(height / 2).strength(0.09));
            simulation.nodes(this.nodes)

            let ticked = () => {
                sLink
                    .attr("x1", d => d.source.x)
                    .attr("y1", d => d.source.y)
                    .attr("x2", d => d.target.x)
                    .attr("y2", d => d.target.y);

                sNode
                    .attr("transform", d => `translate(${d.x.toFixed(6)},${d.y.toFixed(6)})`)
            };

            let dragstarted = (d: GraphNode) => {
                if (!d3.event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            };

            let dragged = (d: GraphNode) => {
                d.fx = d3.event.x;
                d.fy = d3.event.y;
            };

            let dragended = (d: GraphNode) => {
                if (!d3.event.active) simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            };

            sNode.call(d3.drag<any, any>()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended));


            let update = () => {
                this.buildLinks();
                simulation.force("link", d3.forceLink(this.links).strength(d => Math.sqrt(d.weight) * 0.5))
                sLink = gLinks
                    .selectAll("line")
                    .data(this.links);
                sLink
                    .enter().append("line");
                sLink
                    .exit().remove();
                sLink = gLinks
                    .selectAll("line")
                    .data(this.links)
                    .style("stroke", "rgba(0, 0, 0, 0.2)")
                    .attr("stroke-width", d => Math.sqrt(d.weight) * 2);
                simulation.alpha(0.8);
                simulation.restart();

                sNode.select("circle").attr("r", d => Math.sqrt(degreeToArea(d) / Math.PI))
                sNode.select("clipPath").select("circle").attr("r", d => Math.sqrt(degreeToArea(d) / Math.PI))
                sNode.select("image")
                    .attr("height", d => 2 * Math.sqrt(degreeToArea(d) / Math.PI))
                    .attr("width", d => 2 * Math.sqrt(degreeToArea(d) / Math.PI))
                    .attr("x", d => -Math.sqrt(degreeToArea(d) / Math.PI))
                    .attr("y", d => -Math.sqrt(degreeToArea(d) / Math.PI))
            }

            this.store.addListener(update);
            simulation.on("tick", ticked);
            update();
        }
    }
}