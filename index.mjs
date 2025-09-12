import { QueryEngineFactory } from '@comunica/query-sparql-link-traversal-solid';
import {LoggerPretty} from "@comunica/logger-pretty";
import fs from 'fs';

const configPath = 'engines/config-query-sparql-link-traversal/config/config-solid-default.json'
const myEngine = await new QueryEngineFactory().create({configPath});

const query = `
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX snvoc: <http://localhost:3000/www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/>
SELECT ?messageId ?messageCreationDate ?messageContent WHERE {
  ?message snvoc:hasCreator <http://localhost:3000/pods/00000000000000000933/profile/card#me>;
    rdf:type snvoc:Post;
    snvoc:content ?messageContent;
    snvoc:creationDate ?messageCreationDate;
    snvoc:id ?messageId.
}
`;

const rdfPrefix = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
const snvocPrefix = "https://solidbench.linkeddatafragments.org/www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/";

const creatorTp = `message-${snvocPrefix}hasCreator-https://solidbench.linkeddatafragments.org/pods/00000000000000000933/profile/card#me`;
const typeTp = `message-${rdfPrefix}#type-${snvocPrefix}Post`;
const contentTp = `message-${snvocPrefix}content-messageContent`;
const creationDateTp = `message-${snvocPrefix}creationDate-messageCreationDate`;
const idTp = `message-${snvocPrefix}id-messageId`;

const allTp = [creatorTp, typeTp, contentTp, creationDateTp, idTp];
const allTpNoId = [creatorTp, typeTp, contentTp, creationDateTp]

const logContent = fs.readFileSync('./log', 'utf8');
const urls = extractUrlsFromLogs(logContent);

const mapping = urls.filter((url)=>{
  return !url.includes("posts");
}).map((url)=>{
  return [url, allTp]
})

const filter = new Map(mapping);

async function run(method){
  return new Promise(async (resolve)=>{
    const start = performance.now();
    const bindingsStream = await myEngine.queryBindings(query, {
    lenient: true,
    //'@comunica/core:log':new LoggerPretty({ level: 'info'}),
    "@comunica/bus-rdf-join:reqFilter":method === true?filter:undefined
  });

  let i = 0;

  bindingsStream.on('data', (_binding) => {
    i += 1;
  });
  bindingsStream.on('end', () => {
    console.log(`there are ${i} results`);
    const end = performance.now();
    resolve(end-start);
  });
  bindingsStream.on('error', (error) => {
    console.error(error);
  });
  });
  
}


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
const n = 100;
const noMethods = [];
for(let i=0;i<n;i++){
  const time = await run(false);
  noMethods.push(time)
}

const methods = []
for(let i=0;i<n;i++){
  const time = await run(true);
  methods.push(time)
}

function calculateAverage(numbers) {
    if (numbers.length === 0) return 0;
    
    const sum = numbers.reduce((acc, num) => acc + num, 0);
    return sum / numbers.length;
}

function calculateStandardDeviation(numbers) {
    if (numbers.length === 0) return 0;
    const avg = calculateAverage(numbers);
    const squaredDiffs = numbers.map(num => Math.pow(num - avg, 2));
    const variance = squaredDiffs.reduce((acc, diff) => acc + diff, 0) / numbers.length;
    return Math.sqrt(variance);
}

console.log(`baseline avg time: ${calculateAverage(noMethods)} +- ${calculateStandardDeviation(noMethods)}`);
console.log(`methods avg time: ${calculateAverage(methods)} +- ${calculateStandardDeviation(methods)}`);