import { QueryEngineFactory } from '@comunica/query-sparql-link-traversal-solid';
import { LoggerBunyan, BunyanStreamProviderStdout } from "@comunica/logger-bunyan";

const configPath = '/home/bryanelliott/Documents/PhD/coding/shapeIndexExperiment/best-case/config/config-solid-shape-index.json';
const myEngine = await new QueryEngineFactory().create({ configPath });

const query = `
PREFIX snvoc: <http://localhost:3000/www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/>
SELECT DISTINCT ?firstName ?lastName WHERE {
  ?message snvoc:hasCreator <http://localhost:3000/pods/00000000000000000933/profile/card#me>.
  ?forum snvoc:containerOf ?message;
    snvoc:hasModerator ?moderator.
  ?moderator snvoc:firstName ?firstName;
    snvoc:lastName ?lastName.
}
`;

const streamProvider = new BunyanStreamProviderStdout({ level: 'info' });
const loggerParams = {
  name: 'comunica',
  level: 'info',
  streamProviders: [streamProvider],
};
const logger = new LoggerBunyan(loggerParams);

const bindingsStream = await myEngine.queryBindings(query, {
  lenient: true,
  log: logger
});

const bindings = await bindingsStream.toArray();
console.log(`there are ${bindings.length} results`)