// 인증 관련 오류 객체를 사용자에게 표시할 텍스트로 변환한다.
export function toAuthErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (typeof error === 'object' && error !== null) {
    const maybeMessage = Reflect.get(error, 'message');
    const maybeDetails = Reflect.get(error, 'details');
    const maybeHint = Reflect.get(error, 'hint');
    const maybeErrorDescription = Reflect.get(error, 'error_description');

    if (typeof maybeMessage === 'string' && maybeMessage.length > 0) {
      return maybeMessage;
    }

    if (typeof maybeErrorDescription === 'string' && maybeErrorDescription.length > 0) {
      return maybeErrorDescription;
    }

    if (typeof maybeDetails === 'string' && maybeDetails.length > 0) {
      return maybeDetails;
    }

    if (typeof maybeHint === 'string' && maybeHint.length > 0) {
      return maybeHint;
    }
  }

  return '요청 처리 중 알 수 없는 오류가 발생했습니다.';
}
