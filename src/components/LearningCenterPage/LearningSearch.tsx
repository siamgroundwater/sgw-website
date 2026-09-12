'use client'

import Link from 'next/link'
import { Search, X } from 'lucide-react'
import { useMemo, useRef, useState, type ReactNode } from 'react'
import { learningSearchHighlights, normalizeLearningSearch, searchLearningIndex, type LearningSearchEntry } from '@/lib/learning-search'
import type { SearchCopy } from '@/i18n/learning-search'

function Highlight({ text, terms }: { text: string; terms: string[] }) {
  return learningSearchHighlights(text, terms).map((part, index) => part.matched ? <mark key={index}>{part.text}</mark> : part.text)
}

export default function LearningSearch({ entries, copy, children }: { entries: LearningSearchEntry[]; copy: SearchCopy; children: ReactNode }) {
  const [query, setQuery] = useState('')
  const [visibleCount, setVisibleCount] = useState(8)
  const inputRef = useRef<HTMLInputElement>(null)
  const hasQuery = normalizeLearningSearch(query).length > 0
  const results = useMemo(() => searchLearningIndex(entries, query), [entries, query])
  const clearSearch = () => {
    setQuery('')
    setVisibleCount(8)
    inputRef.current?.focus()
  }

  return (
    <>
      <section className="learning-search" aria-labelledby="learning-search-title">
        <h2 id="learning-search-title"><Search aria-hidden="true" />{copy.title}</h2>
        <form role="search" aria-label={copy.title} onSubmit={(event) => event.preventDefault()}>
          <label htmlFor="learning-search-input">{copy.label}</label>
          <div className="learning-search-field">
            <Search aria-hidden="true" />
            <input ref={inputRef} id="learning-search-input" type="search" value={query} maxLength={160} autoComplete="off" placeholder={copy.placeholder} aria-describedby="learning-search-hint learning-search-status" aria-controls="learning-search-results" onChange={(event) => { setQuery(event.currentTarget.value); setVisibleCount(8) }} />
            {query.length > 0 && <button type="button" className="learning-search-clear" onClick={clearSearch} aria-label={copy.reset}><X aria-hidden="true" /></button>}
          </div>
          <p id="learning-search-hint">{copy.hint}</p>
        </form>
        <p id="learning-search-status" role="status" aria-live="polite" aria-atomic="true">{hasQuery ? copy.count.replace('{count}', String(results.length)) : copy.initial}</p>
        <div id="learning-search-results">
          {hasQuery && (results.length ? (
            <>
              <ul className="learning-search-results" aria-label={copy.title}>
                {results.slice(0, visibleCount).map((result) => (
                  <li key={result.id}>
                    <Link href={result.href} className="learning-search-result">
                      <span className="learning-search-result-meta"><Highlight text={result.article} terms={result.terms} /><span>{result.category}</span></span>
                      <h3><Highlight text={result.title} terms={result.terms} /></h3>
                      <p><Highlight text={result.snippet} terms={result.terms} /></p>
                      <span className="learning-search-open">{copy.open}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              {results.length > visibleCount && <button type="button" className="learning-search-more" onClick={() => setVisibleCount((count) => count + 8)}>{copy.showMore}</button>}
            </>
          ) : (
            <div className="learning-search-empty">
              <h3>{copy.noResults}</h3>
              <p>{copy.noResultsHint}</p>
              <button type="button" onClick={clearSearch}>{copy.reset}</button>
            </div>
          ))}
        </div>
      </section>
      {!hasQuery && children}
    </>
  )
}
