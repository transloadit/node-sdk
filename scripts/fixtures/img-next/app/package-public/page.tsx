import { StorageImage } from '@transloadit/img/next'

export default function Page() {
  return <StorageImage src="website/hero.jpg" alt="Package public hero" width={960} preload />
}
