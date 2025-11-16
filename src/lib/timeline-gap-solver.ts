export interface TimelineBlock {
  id: string
  start: number
  duration: number
}

export interface Gap {
  start: number
  end: number
}

/**
 * Computes all valid gaps where a block can fit on a track
 * Time Complexity: O(n log n) for sorting
 */
export const computeValidGaps = (
  blocksOnTrack: TimelineBlock[],
  trackDuration: number,
  draggingBlockDuration: number,
  minGapSize = 0.1
): Gap[] => {
  if (draggingBlockDuration > trackDuration) {
    return []
  }

  const sorted = [...blocksOnTrack].sort((a, b) => a.start - b.start)
  const gaps: Gap[] = []

  if (sorted.length === 0) {
    gaps.push({ start: 0, end: trackDuration })
    return gaps
  }

  if (sorted[0].start >= draggingBlockDuration + minGapSize) {
    gaps.push({ start: 0, end: sorted[0].start })
  }

  for (let i = 0; i < sorted.length - 1; i++) {
    const gapStart = sorted[i].start + sorted[i].duration
    const gapEnd = sorted[i + 1].start

    if (gapEnd - gapStart >= draggingBlockDuration + minGapSize) {
      gaps.push({ start: gapStart, end: gapEnd })
    }
  }

  const lastBlock = sorted[sorted.length - 1]
  const gapStart = lastBlock.start + lastBlock.duration
  if (trackDuration - gapStart >= draggingBlockDuration + minGapSize) {
    gaps.push({ start: gapStart, end: trackDuration })
  }

  return gaps
}

/**
 * Finds the nearest valid position for a block
 * Returns the position that minimizes distance from desired position
 */
export const constrainToValidGaps = (
  desiredStart: number,
  blockDuration: number,
  validGaps: Gap[]
): number | null => {
  if (validGaps.length === 0) return null

  let bestPosition: number | null = null
  let minDistance = Infinity

  for (const gap of validGaps) {
    const clampedStart = Math.max(
      gap.start,
      Math.min(gap.end - blockDuration, desiredStart)
    )

    if (clampedStart >= gap.start && clampedStart + blockDuration <= gap.end) {
      const distance = Math.abs(clampedStart - desiredStart)
      if (distance < minDistance) {
        minDistance = distance
        bestPosition = clampedStart
      }
    }
  }

  return bestPosition
}

/**
 * Finds valid resize bounds for a block
 */
export const computeResizeBounds = (
  block: TimelineBlock,
  blocksOnTrack: TimelineBlock[],
  side: 'left' | 'right'
): { min: number; max: number } => {
  const sorted = [...blocksOnTrack]
    .filter(b => b.id !== block.id)
    .sort((a, b) => a.start - b.start)

  if (side === 'left') {
    const leftBlocks = sorted.filter(b => b.start + b.duration <= block.start)
    const nearestLeft = leftBlocks[leftBlocks.length - 1]

    const minStart = nearestLeft ? nearestLeft.start + nearestLeft.duration : 0
    const maxStart = block.start + block.duration - 0.2

    return { min: minStart, max: maxStart }
  } else {
    const blockEnd = block.start + block.duration
    const rightBlocks = sorted.filter(b => b.start >= blockEnd)
    const nearestRight = rightBlocks[0]

    const maxEnd = nearestRight ? nearestRight.start : block.start + 100
    const minEnd = block.start + 0.2

    return { min: minEnd, max: maxEnd }
  }
}
