// 비동기 시뮬레이션 및 전환 타이밍 제어를 위해 지정한 시간만큼 대기한다.
export async function wait(ms: number) {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}
