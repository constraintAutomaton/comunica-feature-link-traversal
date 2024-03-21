import type { IActionExtractLinks, IActorExtractLinksOutput } from '@comunica/bus-extract-links';
import { ActorExtractLinks } from '@comunica/bus-extract-links';
import type { ILink } from '@comunica/bus-rdf-resolve-hypermedia-links';
import type { IActorArgs, IActorTest } from '@comunica/core';

/**
 * A comunica Traverse Predicates RDF Metadata Extract Actor.
 */
export class ActorExtractLinksPredicates extends ActorExtractLinks {
  private readonly checkSubject: boolean;
  private readonly predicates: RegExp[];
  private readonly reachabilityLabel: string;
  private readonly labelLinkWithReachability: boolean;

  public constructor(args: IActorExtractLinksTraversePredicatesArgs) {
    super(args);

    this.predicates = args.predicateRegexes.map(stringRegex => new RegExp(stringRegex, 'u'));
    this.reachabilityLabel = ActorExtractLinksPredicates.reachabilityLabel(new Set(args.predicateRegexes));
    this.labelLinkWithReachability =
    args.labelLinkWithReachability === undefined ? false : args.labelLinkWithReachability;
    Object.freeze(this.reachabilityLabel);
  }

  public async test(action: IActionExtractLinks): Promise<IActorTest> {
    return true;
  }

  public async run(action: IActionExtractLinks): Promise<IActorExtractLinksOutput> {
    return {
      links: await ActorExtractLinks.collectStream(action.metadata, (quad, links) => {
        if (!this.checkSubject || this.subjectMatches(quad.subject.value, action.url)) {
          for (const regex of this.predicates) {
            if (regex.test(quad.predicate.value)) {
              links.push(this.generateLink(quad.object.value));
              break;
            }
          }
        }
      }),
    };
  }

  public generateLink(url: string): ILink {
    if (this.labelLinkWithReachability) {
      return { url, metadata: { REACHABILITY_LABEL: this.reachabilityLabel }};
    }
    return { url };
  }

  private subjectMatches(subject: string, url: string): boolean {
    const fragmentPos = subject.indexOf('#');
    if (fragmentPos >= 0) {
      subject = subject.slice(0, fragmentPos);
    }
    return subject === url;
  }

  public static reachabilityLabel(predicates: Set<string>): string {
    if (setEqual(PREDICATE_COMMON, predicates)) {
      return 'cCommon';
    }

    if (setEqual(PREDICATE_LDP, predicates)) {
      return 'cLDP';
    }

    if (setEqual(PREDICATE_SOLID_STORAGE, predicates)) {
      return 'cSolidStorage';
    }

    if (predicates.size === 0) {
      return 'cPredicateNothing';
    }

    if (predicates.size === 1) {
      const [ reachability ] = predicates;
      return `cPredicate_${reachability}`;
    }

    let label = 'Predicate';
    for (const val of predicates.values()) {
      label += `_${val}`;
    }

    return `c${label}`;
  }
}

export interface IActorExtractLinksTraversePredicatesArgs
  extends IActorArgs<IActionExtractLinks, IActorTest, IActorExtractLinksOutput> {
  /**
   * If only quads will be considered that have a subject equal to the request URL.
   */
  checkSubject: boolean;
  /**
   * A list of regular expressions that will be tested against predicates of quads.
   */
  predicateRegexes: string[];
  /**
   * If true the links will be label with the reachability criteria.
   */
  labelLinkWithReachability?: boolean;
}

const PREDICATE_COMMON = new Set([
  'http://www.w3.org/2000/01/rdf-schema#seeAlso',
  'http://www.w3.org/2002/07/owl##sameAs',
  'http://xmlns.com/foaf/0.1/isPrimaryTopicOf',
]);

const PREDICATE_LDP = new Set([ 'http://www.w3.org/ns/ldp#contains' ]);
const PREDICATE_SOLID_STORAGE = new Set([ 'http://www.w3.org/ns/pim/space#storage' ]);

function setEqual(setA: Set<string>, setB: Set<string>): boolean {
  if (setA.size !== setB.size) {
    return false;
  }
  return [ ...setA ].every(x => setB.has(x));
}

