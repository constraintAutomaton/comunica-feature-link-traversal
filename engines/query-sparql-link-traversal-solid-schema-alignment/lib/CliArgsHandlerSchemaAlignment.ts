import type { Argv } from "yargs";
import { CliArgsHandlerAnnotateSources } from "./CliArgsHandlerAnnotateSources";
import { type SafePromise, error, result, isError } from "result-interface";
import type * as RDF from "@rdfjs/types";
import { Parser as N3Parser, Store } from "n3";
import { DataFactory } from "rdf-data-factory";
import { QueryEngine as LocalQueryEngine } from "@comunica/query-sparql-rdfjs";
import { stat } from "fs/promises";
import { readFile } from "fs/promises";

const DF = new DataFactory<RDF.BaseQuad>();
const RDF_PARSER = new N3Parser();
const LOCAL_ENGINE = new LocalQueryEngine();

export class CliArgsHandlerSchemaAlignment extends CliArgsHandlerAnnotateSources {
  public override populateYargs(argumentsBuilder: Argv<any>): Argv<any> {
    const argv = super.populateYargs(argumentsBuilder);
    return argv.options({
      onlineSchemaAlignment: {
        type: "boolean",
        describe:
          "activate the online schema alignment",
        group: "Advanced options:",
      },
      rules: {
        type: "string",
        describe: `A file with schema alignment rules.
The template is as follow:

@prefix ex: <https://exemple.com#> .
@prefix semmap: <https://semanticmapping.org/vocab#> .
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .

[]
    a semmap:RuleSet ;
    # Defines where the rules apply. "*" means the rules are valid for all subwebs.
    semmap:subweb "*" ;
    # Lists any rules disable by the engine.
    # See https://mapping-commons.github.io/sssom/spec-model/ for the list of all the valid rules.
    semmap:disallowedRules (ex:randomAlignment) ;
    # Declares the rules included in this rule set.
    semmap:rule _:rule1 .

_:rule1
    # RDF term that serves as the starting point for the alignment.
    semmap:premise ex:foo ;
    # The semantic relationship between the premise and conclusion.
    # See https://mapping-commons.github.io/sssom/spec-model/ for the list of all the valid rules.
    semmap:inference skos:exactMatch ;
    # RDF term that the premise is aligned to.
    semmap:conclusion ex:bar .`,
            group:'Advanced options:'
      },
    });
  }

  public override async handleArgs(
    args: Record<string, any>,
    context: Record<string, any>
  ): Promise<void> {
    await super.handleArgs(args, context);
    context[
      "@comunica/actor-context-preprocess-query-source-reasoning:activate"
    ] = args.onlineSchemaAlignment ?? false;
    
    const rulesString = await this.ruleKg(args.rules??"");
    const rulesResult = await this.convertRules(rulesString);
    if(isError(rulesResult)){
        throw new Error(`there was this error when parsing the rules: ${rulesResult.error}`);
    }
    context[
      '@comunica/actor-context-preprocess-query-source-reasoning:rules'
    ] = rulesResult.value[0];
    context['@comunica/actor-context-preprocess-query-source-reasoning:disallowedOnlineRules'] = rulesResult.value[1];
  }

  private async ruleKg(rules:string):Promise<string>{
    if(await isFile(rules)){
        return await readFile(rules, "utf-8");
    }else{
        return rules;
    }
  }

  private async convertRules(
    rulesKg: string
  ): SafePromise<[Map<string, RDF.Quad[]>, string[]], string> {
    const resp: Map<string, RDF.Quad[]> = new Map();
    let errorOrUndefined: string | undefined = undefined;
    const disallowedRules: string[] = [];
    const store = new Store();

    RDF_PARSER.parse(rulesKg, (error: Error | undefined, quad) => {
      if (quad) {
        store.addQuad(quad);
      } else if (error) {
        errorOrUndefined = error.message;
      }
    });

    if (errorOrUndefined !== undefined) {
      return error(errorOrUndefined);
    }

    const bindingsStream = await LOCAL_ENGINE.queryBindings(
      `
     PREFIX semmap: <https://semanticmapping.org/vocab#>
     PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
     PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

     SELECT ?subweb ?premise ?inference ?conclusion ?disallowedRule
     WHERE {
       ?ruleDef a semmap:RuleSet ;
                semmap:subweb ?subweb ;
                semmap:rule ?rule .

       ?rule semmap:premise ?premise ;
             semmap:inference ?inference ;
             semmap:conclusion ?conclusion .

       OPTIONAL {
         ?ruleDef semmap:disallowedRules ?list .
         ?list rdf:rest*/rdf:first ?disallowedRule .
       }
     }
`,
      {
        sources: [store],
      }
    );

    await new Promise((resolve) => {
      bindingsStream.on("end", () => {
        resolve(undefined);
      });

      bindingsStream.on("error", (err: Error) => {
        errorOrUndefined = err.message;
        resolve(undefined);
      });

      bindingsStream.on("data", (binding: RDF.Bindings) => {
        const [subweb, premise, inference, conclusion, disallowedRule] = [
          binding.get("subweb")!.value,
          binding.get("premise")!,
          binding.get("inference")!,
          binding.get("conclusion")!,
          binding.get("disallowedRule"),
        ];

        if (disallowedRule !== undefined) {
          disallowedRules.push(disallowedRule.value);
        }

        const currentSubweb = resp.get(subweb);
        const quad = DF.quad(premise, inference, conclusion);

        if (currentSubweb !== undefined) {
          currentSubweb.push(<RDF.Quad>quad);
        } else {
          resp.set(subweb, [<RDF.Quad>quad]);
        }
      });
    });

    if (errorOrUndefined !== undefined) {
      return error(errorOrUndefined);
    }
    return result([resp, Array.from(new Set(disallowedRules))]);
  }
}

async function isFile(path: string): Promise<boolean> {
  try {
    const fileStat = await stat(path);
    return fileStat.isFile();
  } catch {
    return false;
  }
}