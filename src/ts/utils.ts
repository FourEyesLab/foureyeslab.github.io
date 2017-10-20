namespace ilab {
    export interface Point {
        x: number;
        y: number;
    }

    export interface Color {
        r: number;
        g: number;
        b: number;
    }

    export function guid(): string {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
            s4() + '-' + s4() + s4() + s4();
    }

    export function pointPointDistance(a: Point, b: Point) {
        return Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
    }

    export function minimalSpanningTree(points: Point[]) {
        let edges: [number, number, number][] = [];
        let parents = new Array(points.length);
        for (let i = 0; i < points.length; i++) {
            parents[i] = i;
            for (let j = i + 1; j < points.length; j++) {
                edges.push([pointPointDistance(points[i], points[j]), i, j]);
            }
        }
        edges.sort((a, b) => a[0] - b[0]);

        let get_parent = (p: number) => {
            if (parents[p] != p) {
                parents[p] = get_parent(parents[p]);
            }
            return parents[p];
        };

        let tree_edges: [number, number][] = [];
        for (let i = 0; i < edges.length; i++) {
            let p1 = edges[i][1];
            let p2 = edges[i][2];
            if (get_parent(p1) == get_parent(p2)) {
            } else {
                parents[get_parent(p1)] = get_parent(p2);
                tree_edges.push([p1, p2]);
            }
        }
        return tree_edges;
    }
}