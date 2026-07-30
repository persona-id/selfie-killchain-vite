import './ContextualHintBar.css'

interface ContextualHintBarProps {
  primary: string
  secondary?: string | null
}

export default function ContextualHintBar({ primary, secondary }: ContextualHintBarProps) {
  return (
    <div className="contextual-hint-bar pointer-events-none">
      <p>{primary}</p>
      {secondary ? <p>{secondary}</p> : null}
    </div>
  )
}
