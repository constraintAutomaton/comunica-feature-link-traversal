# Comunica SPARQL Link Traversal Schema Alignment


Comunica SPARQL Link Traversal Solid Schema Alignment is a SPARQL query engine for JavaScript that follows links across documents including [Solid](https://solidproject.org/) data pods.
Schema alignement rules can be provided to the engine, to write queries with multiple vocabularies

**Warning: due to the uncontrolled nature of the Web, it is recommended to always enable [lenient mode](https://comunica.dev/docs/query/advanced/context/#4--lenient-execution) when doing link traversal.**

This module is a non-official extension part of the [Comunica framework](https://comunica.dev/).

## Install

```bash
$ yarn add query-sparql-link-traversal-solid-schema-alignment
```

or

```bash
$ npm install -g query-sparql-link-traversal-solid-schema-alignment
```
## Usage as a CLI tool


Execute a query over resources

```bash
$ comunica-sparql-link-traversal-schema-alignment --idp void \
  "PREFIX snvoc: <https://solidbench.linkeddatafragments.org/www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/>
  SELECT DISTINCT ?forumId ?forumTitle WHERE {
    ?message snvoc:hasAuthor <https://solidbench.linkeddatafragments.org/pods/00000006597069767117/profile/card#me>.
    ?forum snvoc:containerOf ?message;
      snvoc:id ?forumId;
      snvoc:title ?forumTitle.
  }" --idp void --lenient --onlineSchemaAlignment --rules ./alignment_rules.ttl
```
Given a rule file (`./alignment_rules.ttl`) following this template

```ttl
@prefix ex: <https://exemple.com#> .
@prefix semmap: <https://semanticmapping.org/vocab#> .
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .
@prefix svnoc: <https://solidbench.linkeddatafragments.org/www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/>.

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
    semmap:premise svnoc:hasCreator ;
    # The semantic relationship between the premise and conclusion.
    # See https://mapping-commons.github.io/sssom/spec-model/ for the list of all the valid rules.
    semmap:inference skos:exactMatch ;
    # RDF term that the premise is aligned to.
    semmap:conclusion svnoc:hasAuthor .
```

Show the help with all options:

```bash
$ comunica-sparql-link-traversal-schema-alignment --help
```

Just like [Comunica SPARQL](https://github.com/comunica/comunica/tree/master/engines/query-sparql),
a [dynamic variant](https://github.com/comunica/comunica/tree/master/engines/query-sparql#usage-from-the-command-line) (`comunica-dynamic-sparql-link-traversal-schema-alignment`) also exists.

_[**Read more** about querying from the command line](https://comunica.dev/docs/query/getting_started/query_cli/)._


## Usage within application

This engine can be used in JavaScript/TypeScript applications as follows:

```javascript
const QueryEngine = require('query-sparql-link-traversal-solid-schema-alignment').QueryEngine;
const DataFactory = require('rdf-data-factory').DataFactory

const DF = new DataFactory();
const myEngine = new QueryEngine();

const snvocPrefix = "https://solidbench.linkeddatafragments.org/www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/";
const skosPrefix = "http://www.w3.org/2004/02/skos/core#";

const rules = [
  DF.quad(
    DF.namedNode(`${snvocPrefix}hasCreator`),
    DF.namedNode(`${skosPrefix}exactMatch`),
    DF.namedNode(`${snvocPrefix}hasAuthor`),
  ),
  DF.quad(
    DF.namedNode(`${snvocPrefix}id`),
    DF.namedNode(`${skosPrefix}exactMatch`),
    DF.namedNode(`${snvocPrefix}uuid`),
  ),
];

const ruleMap = new Map([["*", rules]]);

const bindingsStream = await myEngine.queryBindings(`
  PREFIX snvoc: <https://solidbench.linkeddatafragments.org/www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/>
  SELECT DISTINCT ?forumId ?forumTitle WHERE {
    ?message snvoc:hasAuthor <https://solidbench.linkeddatafragments.org/pods/00000006597069767117/profile/card#me>.
    ?forum snvoc:containerOf ?message;
      snvoc:uuid ?forumId;
      snvoc:title ?forumTitle.
  }`, {
    lenient: true,
    "@comunica/actor-context-preprocess-query-source-reasoning:activate": true,
    '@comunica/actor-context-preprocess-query-source-reasoning:disallowedOnlineRules': []
    '@comunica/actor-context-preprocess-query-source-reasoning:rules':ruleMap,
});

// Consume results as a stream (best performance)
bindingsStream.on('data', (binding) => {
    console.log(binding.toString()); // Quick way to print bindings for testing

    console.log(binding.has('forumId')); // Will be true

    // Obtaining values
    console.log(binding.get('forumId').value);
    console.log(binding.get('forumId').termType);
    console.log(binding.get('forumTitle').value);
    console.log(binding.get('forumTitle').value);
});
bindingsStream.on('end', () => {
    // The data-listener will not be called anymore once we get here.
});
bindingsStream.on('error', (error) => {
    console.error(error);
});

// Consume results as an array (easier)
const bindings = await bindingsStream.toArray();
console.log(bindings[0].get('forumId').value);
console.log(bindings[0].get('forumId').termType);
```

_[**Read more** about querying an application](https://comunica.dev/docs/query/getting_started/query_app/)._

### Usage as a SPARQL endpoint

Start a webservice exposing traversal via the SPARQL protocol, i.e., a _SPARQL endpoint_,
by authenticating through the https://solidcommunity.net/ identity provider.

```bash
$ comunica-sparql-link-traversal-schema-alignment-http --idp https://solidcommunity.net/ \
  --lenient
```

Start a webservice exposing traversal from https://www.rubensworks.net/ via the SPARQL protocol, i.e., a _SPARQL endpoint_,
by authenticating through the https://solidcommunity.net/ identity provider.

```bash
$ comunica-sparql-link-traversal-schema-alignment-http --idp https://solidcommunity.net/ \
  https://www.rubensworks.net/ --lenient
```

Show the help with all options:

```bash
$ comunica-sparql-link-traversal-schema-alignment-http --help
```

The SPARQL endpoint can only be started dynamically.
An alternative config file can be passed via the `COMUNICA_CONFIG` environment variable.

Use `bin/http.js` when running in the Comunica monorepo development environment.

_[**Read more** about setting up a SPARQL endpoint](https://comunica.dev/docs/query/getting_started/setup_endpoint/)._
