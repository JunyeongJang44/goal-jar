import confetti from 'canvas-confetti'

// 목표 달성 시 화면 전체 폭죽 + 꽃가루 연출.
export function celebrateGoal() {
  const duration = 2200
  const end = Date.now() + duration
  const colors = ['#ff8fb1', '#4fd1a5', '#7aa7ff', '#ffd36b', '#ff7a85']

  // 1) 양쪽 하단에서 쏘아올리는 폭죽 (좌우 번갈아)
  ;(function frame() {
    confetti({
      particleCount: 5,
      angle: 60,
      spread: 60,
      origin: { x: 0, y: 0.9 },
      colors,
      startVelocity: 55,
    })
    confetti({
      particleCount: 5,
      angle: 120,
      spread: 60,
      origin: { x: 1, y: 0.9 },
      colors,
      startVelocity: 55,
    })
    if (Date.now() < end) requestAnimationFrame(frame)
  })()

  // 2) 가운데 큰 폭죽 2연발
  const burst = (x) =>
    confetti({
      particleCount: 120,
      spread: 100,
      origin: { x, y: 0.5 },
      colors,
      scalar: 1.1,
      ticks: 200,
    })
  burst(0.5)
  setTimeout(() => burst(0.3), 250)
  setTimeout(() => burst(0.7), 450)

  // 3) 위에서 쏟아지는 꽃가루 (하트/별 섞어서 아기자기하게)
  const shapes = confetti.shapeFromText
    ? [confetti.shapeFromText({ text: '💛' }), confetti.shapeFromText({ text: '✨' })]
    : undefined
  setTimeout(() => {
    confetti({
      particleCount: 80,
      spread: 120,
      origin: { x: 0.5, y: 0 },
      startVelocity: 25,
      gravity: 0.6,
      ticks: 260,
      colors,
      ...(shapes ? { shapes, scalar: 1.6 } : {}),
    })
  }, 300)
}
