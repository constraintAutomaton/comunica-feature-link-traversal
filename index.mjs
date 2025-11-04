import {
  LoggerBunyan,
  BunyanStreamProviderStdout,
} from "@comunica/logger-bunyan";
import { KeyReasoning } from "@comunica/context-entries";
import { QueryEngineFactory } from "@comunica/query-sparql-link-traversal-solid";
import { DataFactory } from "rdf-data-factory";
import Streamify from "streamify-string";
import { rdfParser } from "rdf-parse";
import { readFile } from "node:fs/promises";
import util from 'util';

const DF = new DataFactory();
// https://github.com/comunica/comunica/blob/7f2c7dbf5d957b0728af4065c2c6721c43e6aeae/packages/actor-query-operation-construct/lib/BindingsToQuadsIterator.ts#L53

const configPath = "./config.json";
const defaultConfig =
  "./engines/config-query-sparql-link-traversal/config/config-solid-default.json";
const myEngine = await new QueryEngineFactory().create({ configPath });
//const myEngine = await new QueryEngineFactory().create();

const query = `
PREFIX snvoc: <http://localhost:4099/www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/>

SELECT DISTINCT ?creator ?messageContent
WHERE {
  <http://localhost:4099/pods/00000000000000000933/profile/card#me> <https://localhost:4099/www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/likes> _:g_0 .
  _:g_0 (snvoc:hasPost | snvoc:hasComment) ?message .
  ?message snvoc:hasCreator ?creator .
  ?otherMessage snvoc:hasCreator ?creator ;
                snvoc:content ?messageContent .
}
LIMIT 5

`;

const streamProvider = new BunyanStreamProviderStdout({ level: "debug" });
const loggerParams = {
  name: "comunica",
  level: "info",
  streamProviders: [streamProvider],
};
const logger = new LoggerBunyan(loggerParams);
const rules = [];
const stringKg = await readFile("./rules.ttl", "utf-8");
const streamKg = Streamify(stringKg);
await new Promise((resolve, reject) => {
  rdfParser
    .parse(streamKg, { contentType: "text/turtle" })
    .on("data", (quad) => {
      rules.push(quad);
    })
    .on("error", (error) => {
      reject(error);
    })
    .on("end", () => {
      resolve();
    });
});

const ruleMap = new Map([["*", rules]]);
const info = {
  links:[],
  schemaAlignment: []
}

const bindingsStream = await myEngine.queryBindings(query, {
  lenient: true,
  //log: logger,
  [KeyReasoning.rules.name]:ruleMap ,
  "@comunica/actor-context-preprocess-query-source-reasoning:activate": true,
  '@comunica/actor-context-preprocess-query-source-reasoning:runtimeInfo': info,
  //sources: ["https://solidbench.linkeddatafragments.org/pods/00000000000000000933/profile/card#me"]
});

let i = 0;
bindingsStream.on("data", (binding) => {
  console.log(binding.toString());
  i += 1;
});
bindingsStream.on("end", () => {
  console.log(util.inspect(info.schemaAlignment.map((el)=> el.subweb), { showHidden: false, depth: null, colors: true }));
  console.log(`there are ${i} results`);
});
bindingsStream.on("error", (error) => {
  console.error(error);
});
