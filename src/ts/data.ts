namespace ilab {
    export interface Person {
        /** Full name */
        name: string;
        /** Full name */
        display: string;
        /** Role of the person */
        role: string;

        photo?: string;
        website?: string;
        alumni?: boolean;
        order?: number;
    }

    export interface Publication {
        title: string;
        where: string;
        authors: string[];
        year: number;
        doi?: string;
        pdf?: string;
        website?: string;
        areas?: string[];
    }

    export interface ResearchArea {
        name: string;
        display: string;
    }

    export interface Project {
        display: string;
        year: number;
        people: string[];
        areas: string[];
    }

    export class ChartDataset {
        public readonly projects: Project[];
        public readonly areas: ResearchArea[];
        public readonly people: Person[];

        constructor(people: Person[], areas: ResearchArea[], publications: Publication[]) {
            let peopleCache: { [name: string]: Person } = {};
            people.forEach(function (people) {
                peopleCache[people.name] = people;
            });
            function getPeople(name: string) {
                if (peopleCache.hasOwnProperty(name)) {
                    return peopleCache[name];
                } else {
                    return peopleCache[name] = { name: name, display: name, role: "external" };
                }
            }

            let resultProjects: Project[] = [];

            publications.forEach(function (pub) {
                let project = {
                    display: pub.title,
                    year: pub.year,
                    areas: pub.areas ? pub.areas : [],
                    people: pub.authors.map(getPeople).map(x => x.name)
                }
                resultProjects.push(project);
            });
            let resultPeople: Person[] = [];
            for (let name in peopleCache) {
                if (peopleCache.hasOwnProperty(name)) {
                    resultPeople.push(peopleCache[name]);
                }
            }
            resultProjects.sort(function (a, b) {
                return b.year - a.year;
            });

            this.projects = resultProjects;
            this.areas = areas;
            this.people = resultPeople;
        }
    }
}