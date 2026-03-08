// 인증 관련 오류 객체를 사용자에게 표시할 텍스트로 변환한다.
export function toAuthErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return '인증 처리 중 알 수 없는 오류가 발생했습니다.';
}
