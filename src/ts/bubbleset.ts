namespace ilab {

    export function CreateBubbleSet(g: D3Selection<SVGGElement>, defs: D3Selection<SVGDefsElement>, width: number, height: number, color: Color, opacity: number, sigma: number) {
        if (sigma === undefined) sigma = 10;

        var o: any = {};
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


        var bbox = (g.node() as SVGGElement).getBBox();
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
            var nodes: Point[] = [];
            elements.each(function (d) {
                var bbox = (this as any).getBBox();
                var x = bbox.x + bbox.width / 2;
                var y = bbox.y + bbox.height / 2;
                nodes.push({ x: x, y: y });
            });
            var mst = minimalSpanningTree(nodes);
            var lines = g_lines.selectAll("line").data(mst);
            lines.enter().append("line")
                .style("stroke", "black")
                .style("stroke-width", 3)
                .style("stroke-linecap", "round")
                .merge(lines)
                .attr("x1", function (d) { return nodes[d[0]].x; })
                .attr("y1", function (d) { return nodes[d[0]].y; })
                .attr("x2", function (d) { return nodes[d[1]].x; })
                .attr("y2", function (d) { return nodes[d[1]].y; })

            lines.exit().remove();
        };
        o.update();
        return o;
    };

}