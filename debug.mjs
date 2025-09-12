import { QueryEngineFactory } from '@comunica/query-sparql-link-traversal-solid';
import fs from "fs";
import {LoggerPretty} from "@comunica/logger-pretty";

const myEngine = await new QueryEngineFactory().create();


const query = `
PREFIX snvoc: <http://localhost:3000/www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/>
SELECT DISTINCT ?forumId ?forumTitle WHERE {
  ?message snvoc:hasCreator <http://localhost:3000/pods/00000002199023256684/profile/card#me>.
  ?forum snvoc:containerOf ?message;
    snvoc:id ?forumId;
    snvoc:title ?forumTitle.
}
`;

const rdfPrefix = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
const snvocPrefix = "http://localhost:3000/www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/";

const titleTp = `forum-${snvocPrefix}title-forumTitle`;

const logContent = fs.readFileSync('./log', 'utf8');
const urls = extractUrlsFromLogs(logContent);

const mapping = urls.filter((url)=>{
  return !url.includes("forum");
}).map((url)=>{
  return [url, [titleTp]]
})

const filter = new Map(mapping);

const bindingsStream = await myEngine.queryBindings(query, {
    lenient: true,
    //'@comunica/core:log':new LoggerPretty({ level: 'info'}),
    "@comunica/bus-rdf-join:reqFilter":filter,
  });

  let i = 0;

  bindingsStream.on('data', (_binding) => {
    i += 1;
  });
  bindingsStream.on('end', () => {
    console.log(`there are ${i} results`);
  });
  bindingsStream.on('error', (error) => {
    console.error(error);
  });

  function extractUrlsFromLogs(logText) {
    const lines = logText.split('\n');
    const urls = [];
    const requestingPattern = /INFO: Requesting (https?:\/\/[^\s{]+)/;
    
    lines.forEach(line => {
        const match = line.match(requestingPattern);
        if (match && match[1]) {
            urls.push(match[1]);
        }
    });
    
    return [...new Set(urls)];
}