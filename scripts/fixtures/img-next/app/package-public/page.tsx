import { Image } from '@transloadit/viewer/next'

export default function Page() {
  return (
    <Image
      storage
      src="website/hero.jpg"
      alt="Package public hero"
      width={960}
      preload
      placeholder="blur"
    />
  )
}
