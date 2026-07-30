import { Fragment } from 'react'

import { STAGE_ORDER } from '../data/taxonomyData'

import './StageNavPills.css'

function StageNavPills() {
  return (
    <nav className="stage-nav-pills" aria-label="Kill chain stages">
      {STAGE_ORDER.map((stageId, i) => (
        <Fragment key={stageId}>
          <div className="stage-nav-pills__pill">
            <span>{stageId}</span>
          </div>
          {i < STAGE_ORDER.length - 1 && (
            <span className="stage-nav-pills__connector" aria-hidden />
          )}
        </Fragment>
      ))}
    </nav>
  )
}

export default StageNavPills
