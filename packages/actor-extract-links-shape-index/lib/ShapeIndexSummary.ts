import { ISummary } from "@comunica/types-link-traversal";
import { IShapeIndex } from "./ActorExtractLinksShapeIndex";

export class ShapeIndexSummary implements ISummary<IShapeIndex> {
    public readonly summary: Readonly<IShapeIndex>;
  
    public constructor(summary: IShapeIndex) {
      this.summary = summary;
    }
  
    public toJson():  Record<string, any>  {
      const obj: Record<string, any> = {
        ...this.summary,
        subweb: this.summary.subweb.source,
        entries: {}
      };
      for (const [key, value] of this.summary.entries) {
        obj.entries[key] = {
          ...value,
          shape: value.shape.toJson()
        }
      }
      return obj;
    }
  }