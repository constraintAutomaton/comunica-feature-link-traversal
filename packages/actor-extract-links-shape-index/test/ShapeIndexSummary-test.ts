import { Shape } from "query-shape-detection";
import { IShapeIndex } from "../lib/ActorExtractLinksShapeIndex";
import { ShapeIndexSummary } from "../lib/ShapeIndexSummary";

describe(ShapeIndexSummary.name, () => {
    describe("constructor", () => {
        const a_shape_index: IShapeIndex = {
            isComplete: true,
            subweb: /subweb/u,
            entries: new Map(),
        };

        it("should construct the summary", () => {
            const summary = new ShapeIndexSummary(a_shape_index);
            expect(summary.summary).toStrictEqual(a_shape_index);
        });
    });

    describe("toJson", () => {
        const an_empty_shape_index: IShapeIndex = {
            isComplete: true,
            subweb: /subweb/u,
            entries: new Map(),
        };
        const a_shape = new Shape({ name: "a", positivePredicates: ['a', 'b', 'c'], negativePredicates: ['d'] });
        const another_shape = new Shape({ name: "b", positivePredicates: ['a', 'b', 'c'] });

        const a_shape_index: IShapeIndex = {
            isComplete: true,
            subweb: /subweb2/u,
            entries: new Map([
                ["a", {
                    isAContainer: false,
                    iri: "foo",
                    shape: a_shape
                }],
                [
                    "b", {
                        isAContainer: false,
                        iri: "bar",
                        shape: another_shape
                    }
                ]
            ]),
        };

        it("should serialized an empty index", () => {
            const summary = new ShapeIndexSummary(an_empty_shape_index);

            const expectedJson = {
                isComplete: true,
                subweb: "subweb",
                entries: {}
            };

            expect(summary.toJson()).toStrictEqual(expectedJson);
        });

        it("should serialized a shape index", () => {
            const summary = new ShapeIndexSummary(a_shape_index);

            const expectedJson = {
                isComplete: true,
                subweb: "subweb2",
                entries: {
                    "a": {
                        isAContainer: false,
                        iri: "foo",
                        shape: a_shape.toJson()
                    },
                    "b": {
                        isAContainer: false,
                        iri: "bar",
                        shape: another_shape.toJson()
                    }
                }
            };
            expect(summary.toJson()).toStrictEqual(expectedJson);
        });
    });
});