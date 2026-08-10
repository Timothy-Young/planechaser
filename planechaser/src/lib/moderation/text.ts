import {
  DataSet,
  RegExpMatcher,
  englishDataset,
  englishRecommendedTransformers,
  parseRawPattern,
  skipNonAlphabeticTransformer,
} from 'obscenity'

import { TEXT_FIELDS, type PlaneTextFields, type TextField } from './types'

/**
 * Terms layered on top of obscenity's English dataset.
 *
 * Deliberately narrow, and deliberately not a "gore wordlist". Magic
 * vocabulary is violent by default — Mutilate, Carnage Tyrant, Butcher of
 * Malakir and Slaughter the Strong are all real cards — so single evocative
 * nouns like gore, blood, carnage or slaughter would reject ordinary flavor
 * text constantly while catching nothing a player would actually object to.
 *
 * Everything listed here has no fantasy-flavor collision. obscenity's own
 * dataset already covers the sexual-violence terms (rape, incest, bestiality)
 * and the slurs.
 */
const ADDITIONAL_TERMS = [
  'pedophile',
  'pedophilia',
  'paedophile',
  'paedophilia',
  'child porn',
  'childporn',
  'necrophilia',
  'necrophiliac',
  'zoophilia',
  'snuff film',
  'torture porn',
  'gore porn',
]

function buildDataSet() {
  const dataset = new DataSet<{ originalWord: string }>().addAll(englishDataset)
  for (const term of ADDITIONAL_TERMS) {
    dataset.addPhrase((phrase) =>
      phrase.setMetadata({ originalWord: term }).addPattern(parseRawPattern(term)),
    )
  }
  return dataset.build()
}

/**
 * Two matchers, OR'd.
 *
 * Neither transformer set dominates the other. The recommended set misses
 * letters spaced apart ("f u c k you"); adding skipNonAlphabetic catches that
 * but then misses some plain-text hits ("a whore appears"), because the
 * blacklist patterns carry word-boundary assertions that stop holding once
 * the separators are stripped. Both configurations were measured at zero false
 * positives against a Magic-flavored corpus, so running both and taking the
 * union costs nothing and closes both gaps. The corpus is kept as the
 * false-positive guard suite in text.test.ts.
 */
function buildMatchers(): RegExpMatcher[] {
  const terms = buildDataSet()

  const standard = new RegExpMatcher({
    ...terms,
    ...englishRecommendedTransformers,
  })

  const separatorTolerant = new RegExpMatcher({
    ...terms,
    ...englishRecommendedTransformers,
    blacklistMatcherTransformers: [
      ...(englishRecommendedTransformers.blacklistMatcherTransformers ?? []),
      skipNonAlphabeticTransformer(),
    ],
  })

  return [standard, separatorTolerant]
}

let matchers: RegExpMatcher[] | null = null

function getMatchers(): RegExpMatcher[] {
  matchers ??= buildMatchers()
  return matchers
}

export function containsProfanity(text: string): boolean {
  if (!text.trim()) return false
  return getMatchers().some((matcher) => matcher.hasMatch(text))
}

/** Returns the names of the fields that tripped, in TEXT_FIELDS order. */
export function scanText(fields: PlaneTextFields): TextField[] {
  const flagged: TextField[] = []
  for (const field of TEXT_FIELDS) {
    const value = fields[field]
    if (typeof value === 'string' && containsProfanity(value)) {
      flagged.push(field)
    }
  }
  return flagged
}
