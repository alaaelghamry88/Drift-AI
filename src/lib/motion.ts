export const easings = {
  smooth:   [0.25, 0.46, 0.45, 0.94] as const,
  spring:   [0.34, 1.56, 0.64, 1] as const,
  gentle:   [0.4, 0, 0.2, 1] as const,
  sharpOut: [0.55, 0, 1, 0.45] as const,
}

export const fadeUp = {
  initial:  { opacity: 0, y: 16 },
  animate:  { opacity: 1, y: 0 },
  exit:     { opacity: 0, y: -8 },
  transition: { duration: 0.35, ease: easings.smooth }
}

export const staggerChildren = {
  animate: {
    transition: { staggerChildren: 0.08 }
  }
}

export const cardReveal = {
  initial:  { opacity: 0, y: 24, scale: 0.98 },
  animate:  { opacity: 1, y: 0,  scale: 1 },
  transition: { duration: 0.4, ease: easings.smooth }
}

export const streamIn = {
  initial:  { opacity: 0, filter: 'blur(4px)' },
  animate:  { opacity: 1, filter: 'blur(0px)' },
  transition: { duration: 0.2, ease: easings.gentle }
}

export const pageFade = {
  initial:  { opacity: 0 },
  animate:  { opacity: 1 },
  exit:     { opacity: 0 },
  transition: { duration: 0.3, ease: easings.gentle }
}
