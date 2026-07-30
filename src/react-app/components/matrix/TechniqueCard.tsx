import { memo } from 'react'
import { ensureTrailingPeriod, formatDisplayDescription } from '../../utils/formatDisplayText'
import { techniqueImageUrl } from '../../data/techniqueImages'
import type { Technique } from '../../types/killchain'
import type { TechniqueState } from '../../utils/taxonomyHelpers'
import { BlurInImage } from '../BlurInImage'
import './TechniqueCard.css'

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
      <circle cx="7.5" cy="7.5" r="6.5" stroke="currentColor" strokeWidth="1" />
      <path d="M7.5 4.5v6M4.5 7.5h6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1" />
      <path
        d="M5.25 8.1l1.9 1.9 3.6-3.8"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
      <circle cx="7.5" cy="7.5" r="6.5" stroke="currentColor" strokeWidth="1" />
      <path
        d="M5 6.5l2.5 2.5L10 6.5"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  )
}

const VISUAL_STATE: Record<TechniqueState, string> = {
  locked: 'locked',
  unavailable: 'unavailable',
  available: 'default',
  alternative: 'default',
  selected: 'selected',
}

interface TechniqueCardProps {
  tech: Technique
  state: TechniqueState
  isExpanded: boolean
  orderIdx: number | null
  imageOverride?: string | null
  imageLoading?: 'eager' | 'lazy'
  imageFetchPriority?: 'high' | 'low' | 'auto'
  selectionLocked?: boolean
  onSelect: () => void
  onToggleInfo: () => void
}

export default memo(function TechniqueCard({
  tech,
  state,
  isExpanded,
  orderIdx,
  imageOverride,
  imageLoading = 'lazy',
  imageFetchPriority = 'auto',
  selectionLocked = false,
  onSelect,
  onToggleInfo,
}: TechniqueCardProps) {
  const visual = VISUAL_STATE[state] || 'default'
  const isSelected = state === 'selected'
  const selectDisabled = state === 'locked' || state === 'unavailable' || (selectionLocked && isSelected)
  const clickable = !selectDisabled && (state === 'available' || state === 'alternative' || isSelected)
  const imageUrl = imageOverride ?? techniqueImageUrl(tech.id)

  return (
    <article
      className={`technique-card technique-card--${visual}${isExpanded ? ' technique-card--open' : ''}${!clickable ? ' technique-card--disabled' : ''}`}
    >
      <div className="technique-card__body">
        {orderIdx !== null && <span className="technique-card__order">{orderIdx}</span>}

        <div className="technique-card__main">
          <div className="technique-card__text">
            <span className="technique-card__id">{tech.id}</span>
            <h3 className="technique-card__name">{tech.name}</h3>
            <div className="technique-card__expand-block technique-card__desc-block">
              <div className="technique-card__expand-block-inner">
                <p className="technique-card__desc">{formatDisplayDescription(tech.desc)}</p>
              </div>
            </div>
            <div className="technique-card__actions">
              <button
                type="button"
                className={`technique-card__action${isSelected ? ' technique-card__action--select-active' : ''} technique-card__action--select`}
                disabled={selectDisabled}
                onClick={(e) => {
                  e.stopPropagation()
                  onSelect()
                }}
              >
                {isSelected ? (
                  <CheckIcon className="technique-card__action-icon technique-card__action-icon--selected" />
                ) : (
                  <PlusIcon className="technique-card__action-icon" />
                )}
                <span>{isSelected ? 'Selected' : 'Select'}</span>
              </button>
              <button
                type="button"
                className="technique-card__action technique-card__action--info"
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleInfo()
                }}
              >
                <ChevronIcon
                  className={`technique-card__chevron${isExpanded ? ' technique-card__chevron--open' : ''}`}
                />
                <span>Information</span>
              </button>
            </div>
          </div>
          <div className="technique-card__thumb" aria-hidden>
            <BlurInImage
              src={imageUrl}
              alt=""
              className="technique-card__thumb-img"
              loading={imageLoading}
              fetchPriority={imageFetchPriority}
              minBlurMs={0}
            />
          </div>
        </div>

        <div className="technique-card__expand-block technique-card__subtechniques-block">
          <div className="technique-card__expand-block-inner">
            <div className="technique-card__subtechniques">
              {tech.subtechniques.map((st, i) => (
                <p key={i} className="technique-card__sub-item">
                  <span className="technique-card__sub-index">.{String(i + 1).padStart(3, '0')}</span>
                  <span className="technique-card__sub-text">{ensureTrailingPeriod(st)}</span>
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>

      {clickable && (
        <button
          type="button"
          className="technique-card__hit"
          aria-label={`${isSelected ? 'Deselect' : 'Select'} ${tech.name}`}
          onClick={onSelect}
        />
      )}
    </article>
  )
})
