import { forwardRef } from 'react'
import { useContentModeStore } from '@/store/contentMode'
import { Preview, type PreviewHandle } from './Preview'
import { PresentationPreview } from './PresentationPreview'
import { BookPreview } from './BookPreview'

export const PreviewRouter = forwardRef<PreviewHandle>(function PreviewRouter(_, ref) {
  const contentMode = useContentModeStore((s) => s.contentMode)

  switch (contentMode) {
    case 'presentation':
      return <PresentationPreview />
    case 'book':
      return <BookPreview />
    default:
      return <Preview ref={ref} />
  }
})
