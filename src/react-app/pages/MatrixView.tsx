import { useSearchParams } from 'react-router-dom'

import Taxonomy from '../components/matrix/Taxonomy'

export default function MatrixView() {
  const [searchParams] = useSearchParams()
  const pathId = searchParams.get('path')
  const tagsParam = searchParams.get('tags')
  const imageUrl = searchParams.get('image')

  return <Taxonomy initialPathId={pathId} initialTags={tagsParam} initialImageUrl={imageUrl} />
}
